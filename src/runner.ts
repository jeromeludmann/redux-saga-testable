import { isDeepStrictEqual } from 'util'
import { Effect, Saga } from '@redux-saga/types'
import { IO } from '@redux-saga/symbols'
import { stringify } from './stringify'

export interface SagaRunner {
  /**
   * Mocks the result of an effect.
   */
  mock(effect: Effect, result: any, ...nextResults: any[]): SagaRunner

  /**
   * Provides the assertion methods.
   */
  should: Should

  /**
   * Catches silently an error thrown by the saga (alias of `should.throw()`).
   */
  catch(error: ErrorPattern): SagaRunner

  /**
   * Runs the saga.
   */
  run(): SagaOutput
}

export interface Should {
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
  not: Pick<Should, Exclude<keyof Should, 'not'>>
}

/**
 * The saga output produced by run() method.
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
export function use<Saga extends (...args: any[]) => any>(
  saga: Saga,
  ...args: Parameters<Saga>
): SagaRunner {
  if (!saga) {
    throw failure('Missing saga argument', use)
  }

  return createRunner(
    {
      mocks: [],
      assertions: [],
    },
    saga,
    args,
  )
}

const THROW_ERROR = '@@redux-saga-testable/THROW_ERROR'

export interface ThrowError {
  [THROW_ERROR]: boolean
  error: Error
}

/**
 * Throws an error when used as a mock result.
 */
export function throwError(error: Error): ThrowError {
  return { [THROW_ERROR]: true, error }
}

const FINALIZE = '@@redux-saga-testable/FINALIZE'

export interface Finalize {
  [FINALIZE]: boolean
}

/**
 * Finalizes the saga when used as a mock result.
 */
export function finalize(): Finalize {
  return { [FINALIZE]: true }
}

interface SagaRunnerState {
  mocks: Mock[]
  assertions: Assertion[]
  errorPattern?: ErrorPattern
}

function createRunner(
  state: SagaRunnerState,
  saga: Saga,
  args: Parameters<Saga>,
): SagaRunner {
  const runner: any = {}

  runner.mock = _mock(state, saga, args)
  runner.run = _run(state, saga, args)

  // assertions

  let negated = false
  const isNegated = () => negated

  runner.should = {
    yield: _yield(state, isNegated, saga, args),
    return: _return(state, isNegated, saga, args),
    throw: _throw(state, isNegated, saga, args),
  }

  runner.should.not = runner.should
  runner.should = new Proxy(runner.should, {
    get(target: any, key) {
      negated = key === 'not'
      return target[key]
    },
  })

  // aliases

  runner.catch = runner.should.throw

  return runner
}

interface Mock {
  effect: Effect
  results: any[]
}

const _mock = (state: SagaRunnerState, saga: Saga, args: Parameters<Saga>) => (
  effect: Effect,
  ...results: any[]
) => {
  if (!effect) {
    throw failure('Missing effect argument', _mock)
  }

  if (results.length === 0) {
    throw failure(
      'Missing mock result argument\n\n' +
        `Given effect:\n\n${stringify(effect)}`,
      _mock,
    )
  }

  const mockAlreadyProvided = state.mocks.find(mock =>
    isDeepStrictEqual(mock.effect, effect),
  )

  if (mockAlreadyProvided) {
    throw failure(
      'Mock results already provided\n\n' +
        `Given effect:\n\n${stringify(effect)}\n\n` +
        `Existing mock results:\n\n${stringify(mockAlreadyProvided.results)}`,
      _mock,
    )
  }

  return createRunner(
    {
      ...state,
      mocks: [...state.mocks, { effect, results }],
    },
    saga,
    args,
  )
}

type Assertion = (output: SagaOutput) => void

const _yield = (
  state: SagaRunnerState,
  isNegated: () => boolean,
  saga: Saga,
  args: Parameters<Saga>,
) => (effect: Effect) => {
  const assert = createAssert(isNegated())

  const newAssertion: Assertion = output => {
    if (!assert(output.effects.some(e => isDeepStrictEqual(e, effect)))) {
      throw failure(
        'Assertion failure\n\n' +
          `Expected effect:\n\n${stringify(effect)}\n\n` +
          `Received effects:\n\n${stringify(output.effects)}`,
        _run,
      )
    }
  }

  return createRunner(
    {
      ...state,
      assertions: [...state.assertions, newAssertion],
    },
    saga,
    args,
  )
}

const _return = (
  state: SagaRunnerState,
  isNegated: () => boolean,
  saga: Saga,
  args: Parameters<Saga>,
) => (value: any) => {
  const assert = createAssert(isNegated())

  const newAssertion: Assertion = output => {
    if (!assert(isDeepStrictEqual(output.return, value))) {
      throw failure(
        'Assertion failure\n\n' +
          `Expected return value:\n\n${stringify(value)}\n\n` +
          `Received return value:\n\n${stringify(output.return)}`,
        _run,
      )
    }
  }

  return createRunner(
    {
      ...state,
      assertions: [...state.assertions, newAssertion],
    },
    saga,
    args,
  )
}

const _throw = (
  state: SagaRunnerState,
  isNegated: () => boolean,
  saga: Saga,
  args: Parameters<Saga>,
) => (pattern: ErrorPattern) => {
  if (!pattern) {
    throw failure('Missing error pattern argument', _throw)
  }

  const negated = isNegated()
  const assert = createAssert(negated)

  const newAssertion: Assertion = output => {
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

  const newState = {
    ...state,
    assertions: [...state.assertions, newAssertion],
  }

  if (!negated) {
    newState.errorPattern = pattern
  }

  return createRunner(newState, saga, args)
}

function createAssert(negated: boolean) {
  return (condition: boolean) => (negated ? !condition : condition)
}

const _run = (state: SagaRunnerState, saga: Saga, args: any[]) => () => {
  const output: SagaOutput = { effects: [] }
  const iterator = saga(...args)
  let result, nextValue

  // prevents run() from mutating state
  const mocks = state.mocks.map(mock => ({
    ...mock,
    results: Array.from(mock.results),
  }))

  for (;;) {
    try {
      result = next(iterator, nextValue)
    } catch (error) {
      if (!state.errorPattern) throw error
      output.error = error
      break
    }

    if (result.done) {
      output.return = result.value
      break
    }

    if (!isEffect(result.value)) {
      nextValue = result.value
      continue
    }

    if (output.effects.length > 100) {
      throw failure('Maximum yielded effects size reached', _run)
    }

    output.effects.push(result.value)
    nextValue = extractMockResult(mocks, result.value)
  }

  checkMocks(mocks, _run)
  checkAssertions(state.assertions, output)

  return output
}

function next(iterator: IterableIterator<any>, value: any) {
  if (value !== null && typeof value === 'object') {
    if (THROW_ERROR in value) return iterator.throw!(value.error)
    if (FINALIZE in value) return iterator.return!()
  }

  return iterator.next(value)
}

function isEffect(obj: Object) {
  return obj !== null && typeof obj === 'object' && IO in obj
}

function extractMockResult(mocks: Mock[], effect: Effect) {
  const mock = mocks.find(mock => isDeepStrictEqual(mock.effect, effect))
  return mock ? mock.results.shift() : undefined
}

function checkMocks(mocks: Mock[], ssf: Function) {
  const unusedMock = mocks.find(mock => mock.results.length > 0)

  if (unusedMock) {
    throw failure(
      'Unused mock results\n\n' +
        `Given effect:\n\n${stringify(unusedMock.effect)}\n\n` +
        `Unused mock results:\n\n${stringify(unusedMock.results)}`,
      ssf,
    )
  }
}

function checkAssertions(assertions: Assertion[], output: SagaOutput) {
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
