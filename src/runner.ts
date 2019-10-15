import { isDeepStrictEqual } from 'util'
import { IO } from '@redux-saga/symbols'
import { Effect, Saga } from '@redux-saga/types'
import { stringify } from './stringify'
import { ExtendedSagaAssertions, withExtendedSagaAssertions } from './aliases'

export interface SagaRunner {
  /**
   * Injects a value into the saga when an effect is yielded.
   */
  inject(effect: Effect, value: any, ...nextValues: any[]): SagaRunner

  /**
   * Mocks the result of an effect.
   * @deprecated Use `inject()` instead.
   */
  mock(effect: Effect, result: any, ...nextResults: any[]): SagaRunner

  /**
   * Provides the assertion methods.
   */
  should: SagaAssertions

  /**
   * Catches silently an error thrown by the saga (alias of `should.throw()`).
   */
  catch(error: ErrorPattern): SagaRunner

  /**
   * Clones the current runner instance.
   */
  clone(): SagaRunner

  /**
   * Runs the saga.
   */
  run(): SagaOutput
}

export interface SagaAssertions extends ExtendedSagaAssertions<SagaRunner> {
  /**
   * Asserts that the saga yields an effect.
   */
  yield(effect: Effect): SagaRunner

  /**
   * Asserts that the saga returns a value.
   */
  return(value: any): SagaRunner

  /**
   * Asserts that the saga throws an error.
   */
  throw(error: ErrorPattern): SagaRunner

  /**
   * Negates the next assertion.
   */
  not: Pick<SagaAssertions, Exclude<keyof SagaAssertions, 'not'>>
}

/**
 * The saga output produced by `run()` method.
 */
export interface SagaOutput {
  effects: Effect[]
  return?: any
  error?: Error
}

/**
 * The error pattern used to silently catch a thrown error.
 */
export type ErrorPattern =
  | string
  | RegExp
  | Error
  | { new (...args: any[]): any }

/**
 * Creates a saga runner.
 */
export function createRunner<Saga extends (...args: any[]) => any>(
  saga: Saga,
  ...args: Parameters<Saga>
): SagaRunner {
  if (!saga) {
    throw failure('Missing saga argument', createRunner)
  }

  return _createRunner(
    {
      injections: [],
      assertions: [],
    },
    saga,
    args,
  )
}

/**
 * Creates a saga runner.
 * @deprecated Use `createRunner()` instead.
 */
export const use = createRunner

const THROW_ERROR = '@@redux-saga-testable/THROW_ERROR'

export interface ThrowError {
  [THROW_ERROR]: boolean
  error: Error
}

/**
 * Throws an error from the saga when injected as a value.
 */
export function throwError(error: Error): ThrowError {
  return { [THROW_ERROR]: true, error }
}

const FINALIZE = '@@redux-saga-testable/FINALIZE'

export interface Finalize {
  [FINALIZE]: boolean
}

/**
 * Finalizes the saga when injected as a value.
 */
export function finalize(): Finalize {
  return { [FINALIZE]: true }
}

interface SagaRunnerState {
  injections: Injection[]
  assertions: Array<(output: SagaOutput) => void>
  errorPattern?: ErrorPattern
}

function _createRunner(
  state: SagaRunnerState,
  saga: Saga,
  args: Parameters<Saga>,
): SagaRunner {
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
    ...withExtendedSagaAssertions(runner, state, isNegated, _yield),
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

interface Injection {
  effect: Effect
  values: any[]
}

const _inject = (runner: SagaRunner, state: SagaRunnerState) => (
  effect: Effect,
  ...values: any[]
): SagaRunner => {
  if (!effect) {
    throw failure('Missing effect argument', _inject)
  }

  if (values.length === 0) {
    throw failure(
      `The value to inject is missing\n\nGiven effect:\n\n${stringify(effect)}`,
      _inject,
    )
  }

  const effectHasAlreadyInjectedValues = state.injections.find(injection =>
    isDeepStrictEqual(injection.effect, effect),
  )

  if (effectHasAlreadyInjectedValues) {
    throw failure(
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

const _yield = (
  runner: SagaRunner,
  state: SagaRunnerState,
  isNegated: () => boolean,
) => (effect: Effect): SagaRunner => {
  const negated = isNegated()
  const assert = (condition: boolean) => (negated ? !condition : condition)

  const newAssertion = (output: SagaOutput) => {
    if (!assert(output.effects.some(e => isDeepStrictEqual(e, effect)))) {
      throw failure(
        'Assertion failure\n\n' +
          `Expected effect:\n\n${stringify(effect)}\n\n` +
          `Received effects:\n\n${stringify(output.effects)}`,
        _run,
      )
    }
  }

  state.assertions.push(newAssertion)
  return runner
}

const _return = (
  runner: SagaRunner,
  state: SagaRunnerState,
  isNegated: () => boolean,
) => (value: any): SagaRunner => {
  const negated = isNegated()
  const assert = (condition: boolean) => (negated ? !condition : condition)

  const newAssertion = (output: SagaOutput) => {
    if (!assert(isDeepStrictEqual(output.return, value))) {
      throw failure(
        'Assertion failure\n\n' +
          `Expected return value:\n\n${stringify(value)}\n\n` +
          `Received return value:\n\n${stringify(output.return)}`,
        _run,
      )
    }
  }

  state.assertions.push(newAssertion)
  return runner
}

const _throw = (
  runner: SagaRunner,
  state: SagaRunnerState,
  isNegated: () => boolean,
) => (pattern: ErrorPattern): SagaRunner => {
  const negated = isNegated()
  const assert = (condition: boolean) => (negated ? !condition : condition)

  if (!pattern) {
    throw failure('Missing error pattern argument', _throw)
  }

  const newAssertion = (output: SagaOutput) => {
    if (!output.error) {
      throw failure(
        'No error thrown by the saga\n\n' +
          `Given error pattern:\n\n${stringify(state.errorPattern)}`,
        _run,
      )
    }

    if (!assert(matchError(output.error, pattern))) {
      throw failure(
        'Assertion failure\n\n' +
          `Expected error pattern:\n\n${stringify(pattern)}\n\n` +
          `Received thrown error:\n\n${stringify(output.error)}`,
        _run,
      )
    }
  }

  if (!negated && state.errorPattern) {
    throw failure(
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

const _run = (
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
    } catch (error) {
      if (!state.errorPattern) throw error
      output.error = error
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
      throw failure('Maximum yielded effects size reached', _run)
    }

    output.effects.push(sagaStep.value)

    const injection = injections.find(injection =>
      isDeepStrictEqual(injection.effect, sagaStep.value),
    )
    nextValue = injection ? injection.values.shift() : undefined
  }

  checkInjections(injections, _run)
  checkAssertions(state.assertions, output)

  return output
}

const _clone = (
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

function next(iterator: Iterator<any>, value: any) {
  if (value !== null && typeof value === 'object') {
    if (THROW_ERROR in value) return iterator.throw!(value.error)
    if (FINALIZE in value) return iterator.return!()
  }

  return iterator.next(value)
}

function isEffect(obj: Object) {
  return obj !== null && typeof obj === 'object' && IO in obj
}

function checkInjections(injections: Injection[], ssf: Function) {
  const unusedInjection = injections.find(
    injection => injection.values.length > 0,
  )

  if (unusedInjection) {
    throw failure(
      'Unused injection values\n\n' +
        `Given effect:\n\n${stringify(unusedInjection.effect)}\n\n` +
        `Unused injection values:\n\n${stringify(unusedInjection.values)}`,
      ssf,
    )
  }
}

function checkAssertions(
  assertions: Array<(output: SagaOutput) => void>,
  output: SagaOutput,
) {
  assertions.forEach(assertion => assertion(output))
}

function matchError(error: Error, pattern: ErrorPattern) {
  if (typeof error !== 'object') error = { name: '', message: error }
  if (!error.message) return false

  if (typeof pattern === 'string' && error.message.includes(pattern)) {
    return true
  }

  if (pattern instanceof RegExp && pattern.test(error.message)) {
    return true
  }

  if (
    pattern instanceof Error &&
    error.name === pattern.name &&
    error.message === pattern.message
  ) {
    return true
  }

  if (typeof pattern === 'function' && error instanceof pattern) {
    return true
  }

  return false
}

function failure(message: string, ssf?: Function): Error {
  const error = new Error(message)

  if (ssf) {
    const limit = Error.stackTraceLimit
    Error.stackTraceLimit = 1
    Error.captureStackTrace(error, ssf)
    Error.stackTraceLimit = limit
  }

  return error
}
