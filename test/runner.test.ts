import { put, call, Effect } from 'redux-saga/effects'
import { use, throwError, finalize, SagaRunner } from '../src/runner'

const fn1 = () => {}
const fn2 = () => {}
const fn3 = () => {}

const sagaError = new Error('Saga fails')

describe('use()', () => {
  test('creates a runner with a saga and its arguments', () => {
    const saga = function*() {
      yield put({ type: 'SUCCESS' })
    }

    const runner = use(saga)

    expect(runner).toHaveProperty('mock')
    expect(runner).toHaveProperty('catch')
    expect(runner).toHaveProperty('run')
  })

  test('does not create a runner without providing a saga', () => {
    const createRunner = () => (use as { (): SagaRunner })()

    expect(createRunner).toThrow('Missing saga argument')
  })
})

describe('run()', () => {
  test('runs a saga that yields effects', () => {
    const saga = function*() {
      yield call(fn1)
      yield put({ type: 'SUCCESS' })
    }

    const output = use(saga).run()

    expect(output.effects).toEqual([call(fn1), put({ type: 'SUCCESS' })])
  })

  test('runs a saga that returns a value', () => {
    const saga = function*() {
      yield call(() => {})
      return 'return value'
    }

    const output = use(saga).run()

    expect(output.return).toEqual('return value')
  })

  test('runs a saga that yields expressions that are not effects', () => {
    const saga = function*() {
      const result = yield { message: 'not an effect' }
      yield put({ type: 'SUCCESS', payload: result })
    }

    const output = use(saga).run()

    expect(output.effects).toEqual([
      put({ type: 'SUCCESS', payload: { message: 'not an effect' } }),
    ])
    expect(output.effects).not.toContainEqual({ message: 'not an effect' })
  })

  test('runs a saga twice from the same instance', () => {
    const saga = function*() {
      const result1 = yield call(fn1)
      const result2 = yield call(fn2)
      yield put({ type: 'SUCCESS', payload: [result1, result2] })
    }

    const runner = use(saga)
    const output1 = runner.mock(call(fn1), 'result1').run()
    const output2 = runner.mock(call(fn2), 'result2').run()

    expect(output1.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: ['result1', undefined] }),
    )
    expect(output2.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: ['result1', 'result2'] }),
    )
  })

  test('does not run a saga that throws an error', () => {
    const saga = function*() {
      yield call(fn1)
      throw sagaError
    }

    const runSaga = () => use(saga).run()

    expect(runSaga).toThrow(sagaError.message)
  })

  test('does not run a saga that throws an object', () => {
    const saga = function*() {
      yield call(fn1)
      throw { message: sagaError.message }
    }

    const runSaga = () => use(saga).run()

    expect(runSaga).toThrow(sagaError.message)
  })

  test('does not run a saga that throws a string', () => {
    const saga = function*() {
      yield call(fn1)
      throw sagaError.message
    }

    const runSaga = () => use(saga).run()

    expect(runSaga).toThrow(sagaError.message)
  })

  test('does not run a saga that yields an infinity of effects', () => {
    const saga = function*() {
      for (;;) yield put({ type: 'SUCCESS' })
    }

    const runSaga = () => use(saga).run()

    expect(runSaga).toThrow('Maximum yielded effects size reached')
  })
})

describe('mock()', () => {
  test('mocks the result of an effect', () => {
    const saga = function*() {
      const result = yield call(fn1)
      yield put({ type: 'SUCCESS', payload: result })
    }

    const output = use(saga)
      .mock(call(fn1), 'result')
      .run()

    expect(output.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: 'result' }),
    )
  })

  test('mocks the result of an effect with throwError()', () => {
    const saga = function*() {
      try {
        const result = yield call(fn1)
        yield put({ type: 'SUCCESS', payload: result })
      } catch (error) {
        yield put({ type: 'FAILURE', payload: error.message })
      }
    }

    const output = use(saga)
      .mock(call(fn1), throwError(sagaError))
      .run()

    expect(output.effects).toContainEqual(
      put({ type: 'FAILURE', payload: sagaError.message }),
    )
  })

  test('mocks the result of an effect with finalize()', () => {
    const saga = function*() {
      try {
        yield call(fn1)
        yield put({ type: 'SUCCESS' })
      } finally {
        yield put({ type: 'END' })
      }
    }

    const output = use(saga)
      .mock(call(fn1), finalize())
      .run()

    expect(output.effects).toEqual([call(fn1), put({ type: 'END' })])
  })

  test('mocks the results of a same effect', () => {
    const saga = function*() {
      const result1 = yield call(fn1)
      const result2 = yield call(fn1)
      const result3 = yield call(fn1)
      yield put({ type: 'SUCCESS', payload: [result1, result2, result3] })
    }

    const output = use(saga)
      .mock(call(fn1), 'result1', 'result2', 'result3')
      .run()

    expect(output.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: ['result1', 'result2', 'result3'] }),
    )
  })

  test('mocks the results of several effects', () => {
    const saga = function*() {
      const result1 = yield call(fn1)
      const result2 = yield call(fn2)
      const result3 = yield call(fn3)
      yield put({ type: 'SUCCESS', payload: [result1, result2, result3] })
    }

    const output = use(saga)
      .mock(call(fn1), 'result1')
      .mock(call(fn2), 'result2')
      .mock(call(fn3), 'result3')
      .run()

    expect(output.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: ['result1', 'result2', 'result3'] }),
    )
  })

  test('does not mock the result of an effect that is not yielded', () => {
    const saga = function*() {
      yield put({ type: 'SUCCESS' })
    }

    const runSaga = () =>
      use(saga)
        .mock(call(fn1), 'result')
        .run()

    expect(runSaga).toThrow('Unused mock results')
  })

  test('does not mock the result several times of a same effect', () => {
    const saga = function*() {
      const result = call(fn1)
      yield put({ type: 'SUCCESS', payload: result })
    }

    const runSaga = () =>
      use(saga)
        .mock(call(fn1), 'result1')
        .mock(call(fn1), 'result2')
        .run()

    expect(runSaga).toThrow('Mock results already provided')
  })

  test('does not mock too many results of a same effect', () => {
    const saga = function*() {
      const result = yield call(fn1)
      yield put({ type: 'SUCCESS', payload: result })
    }

    const runSaga = () =>
      use(saga)
        .mock(call(fn1), 'result', 'unused result')
        .run()

    expect(runSaga).toThrow('Unused mock results')
  })

  test('does not mock without providing a result', () => {
    const saga = function*() {
      const result = yield call(fn1)
      yield put({ type: 'SUCCESS', payload: result })
    }

    const runSaga = () =>
      (use(saga) as SagaRunner & { mock: (effect: Effect) => SagaRunner })
        .mock(call(fn1))
        .run()

    expect(runSaga).toThrow('Missing mock result argument')
  })

  test('does not mock without providing an effect', () => {
    const saga = function*() {
      const result = call(fn1)
      yield put({ type: 'SUCCESS', payload: result })
    }

    const runSaga = () =>
      (use(saga) as SagaRunner & { mock: () => SagaRunner }).mock().run()

    expect(runSaga).toThrow('Missing effect argument')
  })
})

describe('catch()', () => {
  test('catches an error that includes the given string', () => {
    const saga = function*() {
      yield call(fn1)
      throw sagaError
    }

    const output = use(saga)
      .catch('fails')
      .run()

    expect(output.error).toEqual(sagaError)
  })

  test('catches an error that matches the given regular expression', () => {
    const saga = function*() {
      yield call(fn1)
      throw sagaError
    }

    const output = use(saga)
      .catch(/^Saga fails$/)
      .run()

    expect(output.error).toEqual(sagaError)
  })

  test('catches an error that is equal to the error object', () => {
    const saga = function*() {
      yield call(fn1)
      throw sagaError
    }

    const output = use(saga)
      .catch(sagaError)
      .run()

    expect(output.error).toEqual(sagaError)
  })

  test('catches an error that is instance of the error class', () => {
    const saga = function*() {
      yield call(fn1)
      throw new TypeError(sagaError.message)
    }

    const output = use(saga)
      .catch(TypeError)
      .run()

    expect(output.error).toEqual(new TypeError(sagaError.message))
  })

  test('catches an error that inherits from the error class', () => {
    const saga = function*() {
      yield call(fn1)
      throw new TypeError(sagaError.message)
    }

    const output = use(saga)
      .catch(Error)
      .run()

    expect(output.error).toEqual(new TypeError(sagaError.message))
  })

  test('catches a thrown object that has a "message" property', () => {
    const saga = function*() {
      yield call(fn1)
      throw { message: sagaError.message }
    }

    const output = use(saga)
      .catch(sagaError.message)
      .run()

    expect(output.error).toEqual({
      message: sagaError.message,
    })
  })

  test('catches a thrown string', () => {
    const saga = function*() {
      yield call(fn1)
      throw sagaError.message
    }

    const output = use(saga)
      .catch(sagaError.message)
      .run()

    expect(output.error).toEqual(sagaError.message)
  })

  test('does not catch an error that does not match the error pattern', () => {
    const saga = function*() {
      yield call(fn1)
      throw sagaError
    }

    const runSaga = () =>
      use(saga)
        .catch('unthrown error message')
        .run()

    expect(runSaga).toThrow(
      'Mismatch between the error pattern and the error thrown by the saga',
    )
  })

  test('does not catch an error that is not thrown by the saga', () => {
    const saga = function*() {
      yield put({ type: 'SUCCESS' })
    }

    const runSaga = () =>
      use(saga)
        .catch(Error)
        .run()

    expect(runSaga).toThrow('No error thrown by the saga')
  })

  test('does not catch a thrown object that does not have "message" property', () => {
    const saga = function*() {
      yield call(fn1)
      throw { someKey: 'value of an uncatchable object' }
    }

    const runSaga = () =>
      use(saga)
        .catch('value of an uncatchable object')
        .run()

    expect(runSaga).toThrow(
      'Mismatch between the error pattern and the error thrown by the saga',
    )
  })

  test('does not catch errors several times', () => {
    const saga = function*() {
      yield call(fn1)
      throw sagaError
    }

    const runSaga = () =>
      use(saga)
        .catch(/^Saga/)
        .catch(/fails$/)
        .run()

    expect(runSaga).toThrow('Error pattern already provided')
  })

  test('does not catch without providing an error pattern', () => {
    const saga = function*() {
      yield call(fn1)
      throw sagaError
    }

    const runSaga = () =>
      (use(saga) as SagaRunner & { catch: () => SagaRunner }).catch().run()

    expect(runSaga).toThrow('Missing error pattern argument')
  })
})
