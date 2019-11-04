import { isDeepStrictEqual } from 'util'
import { Effect } from '@redux-saga/types'
import { stringify } from './stringify'
import { getExtendedSagaAssertions } from './aliases'
import {
  createError,
  matchError,
  next,
  isEffect,
  createAssert,
  resetOutputCache,
} from './utils'
import {
  SagaRunner,
  SagaRunnerState,
  ErrorPattern,
  SagaOutput,
} from './types/runner'

export const _createRunner = (state: SagaRunnerState): SagaRunner => {
  let negated = false
  const isNegated = () => negated
  const runner: any = {}

  runner.map = _map(runner, state)
  runner.mock = runner.map // alias: could be removed later
  runner.catch = _catch(runner, state)
  runner.clone = _clone(state)
  runner.run = _run(runner, state)

  // creates the assertions interface
  runner.should = {
    yield: _yield(runner, state, isNegated),
    return: _return(runner, state, isNegated),
    throw: _throw(runner, state, isNegated),
    ...getExtendedSagaAssertions(runner, state, isNegated, _yield),
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

export const _map = (runner: SagaRunner, state: SagaRunnerState) => (
  effect: Effect,
  ...values: any[]
): SagaRunner => {
  if (!effect) {
    throw createError('Missing effect argument', runner.map)
  }

  if (values.length === 0) {
    throw createError(
      `The value to map is missing\n\nGiven effect:\n\n${stringify(effect)}`,
      runner.map,
    )
  }

  const existingMapping = state.environment.find(mapping =>
    isDeepStrictEqual(mapping.effect, effect),
  )

  if (existingMapping) {
    throw createError(
      'Mapped values already provided for this effect\n\n' +
        `Given effect:\n\n${stringify(effect)}\n\n` +
        `Existing mapped values:\n\n${stringify(existingMapping.values)}`,
      runner.map,
    )
  }

  state.environment.push({ effect, values })

  resetOutputCache(state)
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

  resetOutputCache(state)
  return runner
}

export const _yield = (
  runner: SagaRunner,
  state: SagaRunnerState,
  isNegated: () => boolean,
  stackFunction?: Function,
) => (effect: Effect): SagaRunner => {
  if (!effect) {
    throw createError(
      'Missing effect argument',
      stackFunction || runner.should.yield,
    )
  }

  const output = _run(runner, state, stackFunction)()

  const assert = createAssert(
    output => output.effects.some(e => isDeepStrictEqual(e, effect)),
    isNegated(),
  )

  if (!assert(output)) {
    throw createError(
      'Assertion failure\n\n' +
        `Expected effect:\n\n${stringify(effect)}\n\n` +
        `Received effects:\n\n${stringify(output.effects)}`,
      stackFunction || runner.should.yield,
    )
  }

  return runner
}

export const _return = (
  runner: SagaRunner,
  state: SagaRunnerState,
  isNegated: () => boolean,
  stackFunction?: Function,
) => (value: any): SagaRunner => {
  const output = _run(runner, state, stackFunction)()

  const assert = createAssert(
    output => isDeepStrictEqual(output.return, value),
    isNegated(),
  )

  if (!assert(output)) {
    throw createError(
      'Assertion failure\n\n' +
        `Expected return value:\n\n${stringify(value)}\n\n` +
        `Received return value:\n\n${stringify(output.return)}`,
      stackFunction || runner.should.return,
    )
  }

  return runner
}

export const _throw = (
  runner: SagaRunner,
  state: SagaRunnerState,
  isNegated: () => boolean,
  stackFunction?: Function,
) => (pattern: ErrorPattern): SagaRunner => {
  if (!pattern) {
    throw createError(
      'Missing error pattern argument',
      stackFunction || runner.should.throw,
    )
  }

  const output = _run(runner, state, stackFunction)()

  const assert = createAssert(
    output => !!output.error && matchError(output.error, pattern),
    isNegated(),
  )

  if (!assert(output)) {
    throw createError(
      'Assertion failure\n\n' +
        `Expected error pattern:\n\n${stringify(pattern)}\n\n` +
        `Received thrown error:\n\n${stringify(output.error)}`,
      stackFunction || runner.should.throw,
    )
  }

  return runner
}

export const _clone = (state: SagaRunnerState) => (): SagaRunner => {
  return _createRunner({
    ...state,
    environment: [...state.environment],
  })
}

export const _run = (
  runner: SagaRunner,
  state: SagaRunnerState,
  stackFunction?: Function,
) => (): SagaOutput => {
  if (state.output !== undefined) {
    return state.output
  }

  state.output = { effects: [] }

  const iterator = state.saga(...state.arguments)
  let sagaStep: IteratorResult<any>
  let nextValue = undefined

  // prevents mapping mutation
  const environment = state.environment.map(mapping => ({
    ...mapping,
    values: Array.from(mapping.values),
  }))

  for (;;) {
    try {
      sagaStep = next(iterator, nextValue)
    } catch (sagaError) {
      state.output.error = sagaError
      break
    }

    if (sagaStep.done) {
      state.output.return = sagaStep.value
      break
    }

    if (!isEffect(sagaStep.value)) {
      nextValue = sagaStep.value
      continue
    }

    if (state.output.effects.length > 100) {
      throw createError(
        'Maximum yielded effects size reached',
        stackFunction || runner.run,
      )
    }

    state.output.effects.push(sagaStep.value)

    // injects the mapped value to the next iteration
    const mapping = environment.find(mapping =>
      isDeepStrictEqual(mapping.effect, sagaStep.value),
    )
    nextValue = mapping ? mapping.values.shift() : undefined
  }

  // checks for unused mapped values
  const unusedMapping = environment.find(mapping => mapping.values.length > 0)
  if (unusedMapping) {
    throw createError(
      'Unused mapped values\n\n' +
        `Given effect:\n\n${stringify(unusedMapping.effect)}\n\n` +
        `Unused mapped values:\n\n${stringify(unusedMapping.values)}`,
      stackFunction || runner.run,
    )
  }

  // re-throws saga error if needed
  if (state.output.error) {
    if (
      !state.catchingError ||
      !matchError(state.output.error, state.catchingError)
    ) {
      throw state.output.error
    }
  }

  // checks for unused catching error
  else if (state.catchingError) {
    throw createError(
      'No error thrown by the saga\n\n' +
        `Given error pattern:\n\n${stringify(state.catchingError)}`,
      stackFunction || runner.run,
    )
  }

  return state.output
}
