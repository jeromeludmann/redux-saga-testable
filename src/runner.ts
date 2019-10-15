import { isDeepStrictEqual } from 'util'
import { Effect, Saga } from '@redux-saga/types'
import { stringify } from './stringify'
import { getExtendedSagaAssertions } from './aliases'
import { createError, matchError, next, isEffect, createAssert } from './utils'
import {
  SagaRunner,
  SagaRunnerState,
  ErrorPattern,
  SagaOutput,
} from './types/runner'

export const _createRunner = (
  state: SagaRunnerState,
  saga: Saga,
  args: Parameters<Saga>,
): SagaRunner => {
  let negated = false
  const isNegated = () => negated

  const runner: any = {}

  runner.inject = _inject(runner, state)
  runner.mock = runner.inject // alias: could be removed later
  runner.catch = (e: ErrorPattern) => runner.should.throw(e)
  runner.clone = _clone(state, saga, args)
  runner.run = _run(state, saga, args)

  // assertions interface
  runner.should = {
    yield: _yield(runner, state, isNegated),
    return: _return(runner, state, isNegated),
    throw: _throw(runner, state, isNegated),
    ...getExtendedSagaAssertions(runner, state, isNegated, _yield),
  }

  // negates the next assertion
  runner.should.not = runner.should
  runner.should = new Proxy(runner.should, {
    get(target: any, key) {
      negated = key === 'not'
      return target[key]
    },
  })

  return runner
}

export const _inject = (runner: SagaRunner, state: SagaRunnerState) => (
  effect: Effect,
  ...values: any[]
): SagaRunner => {
  if (!effect) {
    throw createError('Missing effect argument', _inject)
  }

  if (values.length === 0) {
    throw createError(
      `The value to inject is missing\n\nGiven effect:\n\n${stringify(effect)}`,
      _inject,
    )
  }

  const effectHasAlreadyInjectedValues = state.injections.find(injection =>
    isDeepStrictEqual(injection.effect, effect),
  )

  if (effectHasAlreadyInjectedValues) {
    throw createError(
      'Injected values already provided for this effect\n\n' +
        `Given effect:\n\n${stringify(effect)}\n\n` +
        `Existing injected values:\n\n${stringify(
          effectHasAlreadyInjectedValues.values,
        )}`,
      _inject,
    )
  }

  state.injections.push({ effect, values })
  return runner
}

export const _yield = (
  runner: SagaRunner,
  state: SagaRunnerState,
  isNegated: () => boolean,
) => (effect: Effect): SagaRunner => {
  const assert = createAssert(
    output => output.effects.some(e => isDeepStrictEqual(e, effect)),
    isNegated(),
  )

  state.assertions.push((output: SagaOutput) => {
    if (!assert(output)) {
      throw createError(
        'Assertion failure\n\n' +
          `Expected effect:\n\n${stringify(effect)}\n\n` +
          `Received effects:\n\n${stringify(output.effects)}`,
        _run,
      )
    }
  })

  return runner
}

export const _return = (
  runner: SagaRunner,
  state: SagaRunnerState,
  isNegated: () => boolean,
) => (value: any): SagaRunner => {
  const assert = createAssert(
    output => isDeepStrictEqual(output.return, value),
    isNegated(),
  )

  state.assertions.push((output: SagaOutput) => {
    if (!assert(output)) {
      throw createError(
        'Assertion failure\n\n' +
          `Expected return value:\n\n${stringify(value)}\n\n` +
          `Received return value:\n\n${stringify(output.return)}`,
        _run,
      )
    }
  })

  return runner
}

export const _throw = (
  runner: SagaRunner,
  state: SagaRunnerState,
  isNegated: () => boolean,
) => (pattern: ErrorPattern): SagaRunner => {
  const negated = isNegated()

  if (!pattern) {
    throw createError('Missing error pattern argument', _throw)
  }

  const assert = createAssert(
    output => !!output.error && matchError(output.error, pattern),
    negated,
  )

  const newAssertion = (output: SagaOutput) => {
    if (!output.error) {
      throw createError(
        'No error thrown by the saga\n\n' +
          `Given error pattern:\n\n${stringify(state.errorPattern)}`,
        _run,
      )
    }

    if (!assert(output)) {
      throw createError(
        'Assertion failure\n\n' +
          `Expected error pattern:\n\n${stringify(pattern)}\n\n` +
          `Received thrown error:\n\n${stringify(output.error)}`,
        _run,
      )
    }
  }

  if (!negated && state.errorPattern) {
    throw createError(
      'Error pattern already provided\n\n' +
        `Given error pattern:\n\n${stringify(state.errorPattern)}`,
      _throw,
    )
  }

  state.assertions.push(newAssertion)

  if (!negated) {
    state.errorPattern = pattern
  }

  return runner
}

export const _clone = (
  state: SagaRunnerState,
  saga: Saga,
  args: any[],
) => (): SagaRunner => {
  return _createRunner(
    {
      injections: [...state.injections],
      assertions: [...state.assertions],
      errorPattern: state.errorPattern,
    },
    saga,
    args,
  )
}

export const _run = (
  state: SagaRunnerState,
  saga: Saga,
  args: any[],
) => (): SagaOutput => {
  const output: SagaOutput = { effects: [] }
  const iterator = saga(...args)
  let sagaStep: IteratorResult<any>
  let nextValue = undefined

  // prevents from mutating value injections
  const injections = state.injections.map(injection => ({
    ...injection,
    values: Array.from(injection.values),
  }))

  for (;;) {
    try {
      sagaStep = next(iterator, nextValue)
    } catch (sagaError) {
      // re-throws the saga error if needed
      if (!state.errorPattern) {
        throw sagaError
      }

      output.error = sagaError
      break
    }

    if (sagaStep.done) {
      output.return = sagaStep.value
      break
    }

    if (!isEffect(sagaStep.value)) {
      nextValue = sagaStep.value
      continue
    }

    if (output.effects.length > 100) {
      throw createError('Maximum yielded effects size reached', _run)
    }

    output.effects.push(sagaStep.value)

    // injects value to the next iteration
    const injection = injections.find(injection =>
      isDeepStrictEqual(injection.effect, sagaStep.value),
    )
    nextValue = injection ? injection.values.shift() : undefined
  }

  // checks data injections
  const unusedInjection = injections.find(
    injection => injection.values.length > 0,
  )

  if (unusedInjection) {
    throw createError(
      'Unused injection values\n\n' +
        `Given effect:\n\n${stringify(unusedInjection.effect)}\n\n` +
        `Unused injection values:\n\n${stringify(unusedInjection.values)}`,
      _run,
    )
  }

  // applies assertions on saga output
  state.assertions.forEach(assert => assert(output))

  return output
}
