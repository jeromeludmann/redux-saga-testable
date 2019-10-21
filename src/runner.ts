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
  runner.catch = _catch(runner, state)
  runner.clone = _clone(state, saga, args)
  runner.run = _run(runner, state, saga, args)

  // creates the assertions interface
  runner.should = {
    yield: _yield(runner, isNegated),
    return: _return(runner, isNegated),
    throw: _throw(runner, isNegated),
    ...getExtendedSagaAssertions(runner, isNegated, _yield),
  }

  // negates the next assertion
  runner.should.not = runner.should
  runner.should = new Proxy(runner.should, {
    get(target: any, key: string) {
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
    throw createError('Missing effect argument', runner.inject)
  }

  if (values.length === 0) {
    throw createError(
      `The value to inject is missing\n\nGiven effect:\n\n${stringify(effect)}`,
      runner.inject,
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
      runner.inject,
    )
  }

  state.injections.push({ effect, values })

  return runner
}

export const _catch = (runner: SagaRunner, state: SagaRunnerState) => (
  pattern: ErrorPattern,
) => {
  if (!pattern) {
    throw createError('Missing error pattern argument', runner.catch)
  }

  if (state.catchingError) {
    throw createError(
      'Error pattern already provided\n\n' +
        `Given error pattern:\n\n${stringify(state.catchingError)}`,
      runner.catch,
    )
  }

  state.catchingError = pattern

  return runner
}

export const _yield = (runner: SagaRunner, isNegated: () => boolean) => (
  effect: Effect,
): SagaRunner => {
  const output = runner.run()

  const assert = createAssert(
    output => output.effects.some(e => isDeepStrictEqual(e, effect)),
    isNegated(),
  )

  if (!assert(output)) {
    throw createError(
      'Assertion failure\n\n' +
        `Expected effect:\n\n${stringify(effect)}\n\n` +
        `Received effects:\n\n${stringify(output.effects)}`,
      runner.should.yield,
    )
  }

  return runner
}

export const _return = (runner: SagaRunner, isNegated: () => boolean) => (
  value: any,
): SagaRunner => {
  const output = runner.run()

  const assert = createAssert(
    output => isDeepStrictEqual(output.return, value),
    isNegated(),
  )

  if (!assert(output)) {
    throw createError(
      'Assertion failure\n\n' +
        `Expected return value:\n\n${stringify(value)}\n\n` +
        `Received return value:\n\n${stringify(output.return)}`,
      runner.should.return,
    )
  }

  return runner
}

export const _throw = (
  runner: SagaRunner,
  isNegated: () => boolean,
  stack?: Function,
) => (pattern: ErrorPattern): SagaRunner => {
  const output = runner.run()

  const assert = createAssert(
    output => !!output.error && matchError(output.error, pattern),
    isNegated(),
  )

  if (!assert(output)) {
    throw createError(
      'Assertion failure\n\n' +
        `Expected error pattern:\n\n${stringify(pattern)}\n\n` +
        `Received thrown error:\n\n${stringify(output.error)}`,
      runner.should.throw,
    )
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
      catchingError: state.catchingError,
    },
    saga,
    args,
  )
}

export const _run = (
  runner: SagaRunner,
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
      throw createError('Maximum yielded effects size reached', runner.run)
    }

    output.effects.push(sagaStep.value)

    // injects value to the next iteration
    const injection = injections.find(injection =>
      isDeepStrictEqual(injection.effect, sagaStep.value),
    )
    nextValue = injection ? injection.values.shift() : undefined
  }

  // checks for unused data injections
  const unusedInjection = injections.find(
    injection => injection.values.length > 0,
  )
  if (unusedInjection) {
    throw createError(
      'Unused injection values\n\n' +
        `Given effect:\n\n${stringify(unusedInjection.effect)}\n\n` +
        `Unused injection values:\n\n${stringify(unusedInjection.values)}`,
      runner.run,
    )
  }

  // re-throws saga error if needed
  if (output.error) {
    if (
      !state.catchingError ||
      !matchError(output.error, state.catchingError)
    ) {
      throw output.error
    }
  }

  // checks for unused catching error
  else if (state.catchingError) {
    throw createError(
      'No error thrown by the saga\n\n' +
        `Given error pattern:\n\n${stringify(state.catchingError)}`,
      runner.run,
    )
  }

  return output
}
