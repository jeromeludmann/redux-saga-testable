import { Effect, put, call, fork } from 'redux-saga/effects'
import { createRunner, throwError, finalize, use } from '../src'
import { SagaRunner } from '../src/types/runner'

const fn1 = () => {}
const fn2 = () => {}
const fn3 = () => {}

const sagaError = new Error('Saga fails')

describe('createRunner()', () => {
  test('creates a runner with a saga and its arguments', () => {
    const saga = function*() {
      yield put({ type: 'SUCCESS' })
    }

    const runner = createRunner(saga)

    expect(runner).toHaveProperty('inject')
    expect(runner).toHaveProperty('should.yield')
    expect(runner).toHaveProperty('should.return')
    expect(runner).toHaveProperty('should.throw')
    expect(runner).toHaveProperty('catch')
    expect(runner).toHaveProperty('clone')
    expect(runner).toHaveProperty('run')

    // prevents breaking changes
    const runner2 = use(saga)
    expect(runner2).toHaveProperty('mock')
  })

  test('does not create a runner without providing a saga', () => {
    expect(createRunner).toThrow('Missing saga argument')
  })
})

describe('run()', () => {
  test('runs a saga that yields effects', () => {
    const saga = function*() {
      yield call(fn1)
      yield put({ type: 'SUCCESS' })
    }

    const output = createRunner(saga).run()

    expect(output.effects).toEqual([call(fn1), put({ type: 'SUCCESS' })])
  })

  test('runs a saga that returns a value', () => {
    const saga = function*() {
      yield call(() => {})
      return 'return value'
    }

    const output = createRunner(saga).run()

    expect(output.return).toEqual('return value')
  })

  test('runs a saga that yields expressions that are not effects', () => {
    const saga = function*() {
      const result = yield { message: 'not an effect' }
      yield put({ type: 'SUCCESS', payload: result })
    }

    const output = createRunner(saga).run()

    expect(output.effects).toEqual([
      put({ type: 'SUCCESS', payload: { message: 'not an effect' } }),
    ])
    expect(output.effects).not.toContainEqual({ message: 'not an effect' })
  })

  test('runs a saga twice from the same shared instance', () => {
    const saga = function*() {
      const result1 = yield call(fn1)
      const result2 = yield call(fn2)
      yield put({ type: 'SUCCESS', payload: [result1, result2] })
    }

    const runner = createRunner(saga).inject(call(fn1), 'result1')
    const output1 = runner.run()
    const output2 = runner.inject(call(fn2), 'result2').run()

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

    const runSaga = () => createRunner(saga).run()

    expect(runSaga).toThrow(sagaError.message)
  })

  test('does not run a saga that throws an object', () => {
    const saga = function*() {
      yield call(fn1)
      throw { message: sagaError.message }
    }

    const runSaga = () => createRunner(saga).run()

    expect(runSaga).toThrow(sagaError.message)
  })

  test('does not run a saga that throws a string', () => {
    const saga = function*() {
      yield call(fn1)
      throw sagaError.message
    }

    const runSaga = () => createRunner(saga).run()

    expect(runSaga).toThrow(sagaError.message)
  })

  test('does not run a saga that yields an infinity of effects', () => {
    const saga = function*() {
      for (;;) yield put({ type: 'SUCCESS' })
    }

    const runSaga = () => createRunner(saga).run()

    expect(runSaga).toThrow('Maximum yielded effects size reached')
  })
})

describe('inject()', () => {
  test('injects a value', () => {
    const saga = function*() {
      const result = yield call(fn1)
      yield put({ type: 'SUCCESS', payload: result })
    }

    const output = createRunner(saga)
      .inject(call(fn1), 'result')
      .run()

    expect(output.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: 'result' }),
    )

    // prevents breaking changes

    const output2 = createRunner(saga)
      .mock(call(fn1), 'result')
      .run()

    expect(output2.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: 'result' }),
    )
  })

  test('injects a thrown error', () => {
    const saga = function*() {
      try {
        const result = yield call(fn1)
        yield put({ type: 'SUCCESS', payload: result })
      } catch (error) {
        yield put({ type: 'FAILURE', payload: error.message })
      }
    }

    const output = createRunner(saga)
      .inject(call(fn1), throwError(sagaError))
      .run()

    expect(output.effects).toContainEqual(
      put({ type: 'FAILURE', payload: sagaError.message }),
    )
  })

  test('injects a finalize signal', () => {
    const saga = function*() {
      try {
        yield call(fn1)
        yield put({ type: 'SUCCESS' })
      } finally {
        yield put({ type: 'END' })
      }
    }

    const output = createRunner(saga)
      .inject(call(fn1), finalize())
      .run()

    expect(output.effects).toEqual([call(fn1), put({ type: 'END' })])
  })

  test('injects values for a same effect', () => {
    const saga = function*() {
      const result1 = yield call(fn1)
      const result2 = yield call(fn1)
      const result3 = yield call(fn1)
      yield put({ type: 'SUCCESS', payload: [result1, result2, result3] })
    }

    const output = createRunner(saga)
      .inject(call(fn1), 'result1', 'result2', 'result3')
      .run()

    expect(output.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: ['result1', 'result2', 'result3'] }),
    )
  })

  test('injects values for different effects', () => {
    const saga = function*() {
      const result1 = yield call(fn1)
      const result2 = yield call(fn2)
      const result3 = yield call(fn3)
      yield put({ type: 'SUCCESS', payload: [result1, result2, result3] })
    }

    const output = createRunner(saga)
      .inject(call(fn1), 'result1')
      .inject(call(fn2), 'result2')
      .inject(call(fn3), 'result3')
      .run()

    expect(output.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: ['result1', 'result2', 'result3'] }),
    )
  })

  test('injects a "null" value', () => {
    const saga = function*() {
      const result1 = yield call(fn1)
      yield put({ type: 'SUCCESS', payload: result1 })
    }

    const output = createRunner(saga)
      .inject(call(fn1), null)
      .run()

    expect(output.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: null }),
    )
  })

  test('does not inject a value for an effect that is not yielded', () => {
    const saga = function*() {
      yield put({ type: 'SUCCESS' })
    }

    const runSaga = () =>
      createRunner(saga)
        .inject(call(fn1), 'result')
        .run()

    expect(runSaga).toThrow('Unused injection values')
  })

  test('does not inject values several times for a same effect', () => {
    const saga = function*() {
      const result = call(fn1)
      yield put({ type: 'SUCCESS', payload: result })
    }

    const runSaga = () =>
      createRunner(saga)
        .inject(call(fn1), 'result1')
        .inject(call(fn1), 'result2')
        .run()

    expect(runSaga).toThrow('Injected values already provided for this effect')
  })

  test('does not inject too many values for a same effect', () => {
    const saga = function*() {
      const result = yield call(fn1)
      yield put({ type: 'SUCCESS', payload: result })
    }

    const runSaga = () =>
      createRunner(saga)
        .inject(call(fn1), 'result', 'unused result')
        .run()

    expect(runSaga).toThrow('Unused injection values')
  })

  test('does not inject without providing a value to use', () => {
    const saga = function*() {
      const result = yield call(fn1)
      yield put({ type: 'SUCCESS', payload: result })
    }

    const runSaga = () =>
      (createRunner(saga) as SagaRunner & {
        inject: (effect: Effect) => SagaRunner
      })
        .inject(call(fn1))
        .run()

    expect(runSaga).toThrow('The value to inject is missing')
  })

  test('does not inject without providing an effect to match', () => {
    const saga = function*() {
      const result = call(fn1)
      yield put({ type: 'SUCCESS', payload: result })
    }

    const runSaga = () =>
      (createRunner(saga) as SagaRunner & { inject: () => SagaRunner })
        .inject()
        .run()

    expect(runSaga).toThrow('Missing effect argument')
  })
})

describe('catch()', () => {
  test('catches an error that includes the given string', () => {
    const saga = function*() {
      yield call(fn1)
      throw sagaError
    }

    const output = createRunner(saga)
      .catch('fails')
      .run()

    expect(output.error).toEqual(sagaError)
  })

  test('catches an error that matches the given regular expression', () => {
    const saga = function*() {
      yield call(fn1)
      throw sagaError
    }

    const output = createRunner(saga)
      .catch(/^Saga fails$/)
      .run()

    expect(output.error).toEqual(sagaError)
  })

  test('catches an error that is equal to the error object', () => {
    const saga = function*() {
      yield call(fn1)
      throw sagaError
    }

    const output = createRunner(saga)
      .catch(sagaError)
      .run()

    expect(output.error).toEqual(sagaError)
  })

  test('catches an error that is instance of the error class', () => {
    const saga = function*() {
      yield call(fn1)
      throw new TypeError(sagaError.message)
    }

    const output = createRunner(saga)
      .catch(TypeError)
      .run()

    expect(output.error).toEqual(new TypeError(sagaError.message))
  })

  test('catches an error that inherits from the error class', () => {
    const saga = function*() {
      yield call(fn1)
      throw new TypeError(sagaError.message)
    }

    const output = createRunner(saga)
      .catch(Error)
      .run()

    expect(output.error).toEqual(new TypeError(sagaError.message))
  })

  test('catches a thrown object that has a "message" property', () => {
    const saga = function*() {
      yield call(fn1)
      throw { message: sagaError.message }
    }

    const output = createRunner(saga)
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

    const output = createRunner(saga)
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
      createRunner(saga)
        .catch('unthrown error message')
        .run()

    expect(runSaga).toThrow(sagaError.message)
  })

  test('does not catch an error that is not thrown by the saga', () => {
    const saga = function*() {
      yield put({ type: 'SUCCESS' })
    }

    const runSaga = () =>
      createRunner(saga)
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
      createRunner(saga)
        .catch('value of an uncatchable object')
        .run()

    expect(runSaga).toThrow()
  })

  test('does not catch errors several times', () => {
    const saga = function*() {
      yield call(fn1)
      throw sagaError
    }

    const runSaga = () =>
      createRunner(saga)
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
      (createRunner(saga) as SagaRunner & { catch: () => SagaRunner })
        .catch()
        .run()

    expect(runSaga).toThrow('Missing error pattern argument')
  })
})

describe('should.yield()', () => {
  const saga = function*() {
    yield put({ type: 'SUCCESS', payload: 'result' })
  }

  test('asserts that the saga yields an effect', () => {
    createRunner(saga)
      .should.yield(put({ type: 'SUCCESS', payload: 'result' }))
      .run()
  })

  test('asserts that the saga does not yield an effect', () => {
    createRunner(saga)
      .should.not.yield(call(fn1))
      .run()
  })

  test('does not assert that the saga yields an effect', () => {
    const runSaga = () =>
      createRunner(saga)
        .should.yield(call(fn1))
        .run()

    expect(runSaga).toThrow('Assertion failure')
  })
})

describe('should.return()', () => {
  const saga = function*() {
    return 'result1'
  }

  test('asserts that the saga returns a value', () => {
    createRunner(saga)
      .should.return('result1')
      .run()
  })

  test('asserts that the saga does not return a value', () => {
    createRunner(saga)
      .should.not.return('result2')
      .run()
  })

  test('does not assert that the saga returns a value', () => {
    const runSaga = () =>
      createRunner(saga)
        .should.return('result2')
        .run()

    expect(runSaga).toThrow('Assertion failure')
  })
})

describe('should.throw()', () => {
  const saga = function*() {
    yield call(fn1)
    throw sagaError
  }

  test('asserts that the saga throwns an error', () => {
    createRunner(saga)
      .should.throw(sagaError.message)
      .run()
  })

  test('asserts that the saga does not throw an error', () => {
    createRunner(saga)
      .should.not.throw('unthrown')
      .catch(sagaError.message)
      .run()
  })

  test('does not assert that the saga throwns an error', () => {
    const runSaga = () =>
      createRunner(saga)
        .should.throw('unthrown')
        .run()

    expect(runSaga).toThrow('Assertion failure')
  })
})

describe('clone()', () => {
  test('clones instances of a saga runner several times', () => {
    const saga = function*() {
      const result1 = yield call(fn1)
      const result2 = yield call(fn2)
      const result3 = yield call(fn3)

      if (result1) {
        yield fork(fn1)
      }

      if (result2) {
        yield fork(fn2)
      }

      if (result3) {
        yield fork(fn3)
      }

      yield put({ type: 'SUCCESS', payload: [result1, result2, result3] })
    }

    const runner = createRunner(saga)

    const runner1 = runner.clone()
    const runner2 = runner.clone()

    runner1.inject(call(fn1), 'result1')
    runner1.should.yield(fork(fn1))
    runner1.should.not.yield(fork(fn2))
    runner1.should.not.yield(fork(fn3))

    runner2.inject(call(fn2), 'result2')

    const runner3 = runner2.clone()

    runner2.should.not.yield(fork(fn1))
    runner2.should.yield(fork(fn2))
    runner2.should.not.yield(fork(fn3))

    runner3.inject(call(fn3), 'result3')
    runner3.should.not.yield(fork(fn1))
    runner3.should.yield(fork(fn2))
    runner3.should.yield(fork(fn3))

    const output1 = runner1.run()
    const output2 = runner2.run()
    const output3 = runner3.run()

    expect(output1.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: ['result1', undefined, undefined] }),
    )
    expect(output2.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: [undefined, 'result2', undefined] }),
    )
    expect(output3.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: [undefined, 'result2', 'result3'] }),
    )
  })
})
