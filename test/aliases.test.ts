import { Task, channel } from 'redux-saga'
import {
  take,
  takeMaybe,
  takeEvery,
  takeLatest,
  takeLeading,
  put,
  putResolve,
  call,
  apply,
  cps,
  fork,
  spawn,
  join,
  cancel,
  select,
  actionChannel,
  flush,
  cancelled,
  setContext,
  getContext,
  delay,
  throttle,
  debounce,
  retry,
  all,
  race,
} from 'redux-saga/effects'
import { createMockTask } from '@redux-saga/testing-utils'
import { createRunner } from '../src/runner'

const fn1 = () => {}
const fn2 = () => {}
const fn3 = () => {}

test('should.take()', () => {
  const saga = function*() {
    yield take('FETCH_USER')
  }

  createRunner(saga)
    .should.take('FETCH_USER')
    .should.not.take('FETCH_PRODUCT')
    .run()
})

test('should.takeMaybe()', () => {
  const saga = function*() {
    yield takeMaybe('FETCH_USER')
  }

  createRunner(saga)
    .should.takeMaybe('FETCH_USER')
    .should.not.takeMaybe('FETCH_PRODUCT')
    .run()
})

test('should.takeEvery()', () => {
  const saga = function*() {
    yield takeEvery('FETCH_USER', fn1)
  }

  createRunner(saga)
    .should.takeEvery('FETCH_USER', fn1)
    .should.not.takeEvery('FETCH_USER', fn2)
    .run()
})

test('should.takeLatest()', () => {
  const saga = function*() {
    yield takeLatest('FETCH_USER', fn1)
  }

  createRunner(saga)
    .should.takeLatest('FETCH_USER', fn1)
    .should.not.takeLatest('FETCH_USER', fn2)
    .run()
})

test('should.takeLeading()', () => {
  const saga = function*() {
    yield takeLeading('FETCH_USER', fn1)
  }

  createRunner(saga)
    .should.takeLeading('FETCH_USER', fn1)
    .should.not.takeLeading('FETCH_PRODUCT', fn1)
    .run()
})

test('should.put()', () => {
  const saga = function*() {
    yield put({ type: 'SUCCESS' })
  }

  createRunner(saga)
    .should.put({ type: 'SUCCESS' })
    .should.not.put({ type: 'FAILURE' })
    .run()
})

test('should.putResolve()', () => {
  const saga = function*() {
    yield putResolve({ type: 'SUCCESS' })
  }

  createRunner(saga)
    .should.putResolve({ type: 'SUCCESS' })
    .should.not.putResolve({ type: 'FAILURE' })
    .run()
})

test('should.call()', () => {
  const saga = function*() {
    yield call(fn1)
  }

  createRunner(saga)
    .should.call(fn1)
    .should.not.call(fn2)
    .run()
})

test('should.apply()', () => {
  const saga = function*() {
    yield apply({ key: 'value' }, fn1, [])
  }

  createRunner(saga)
    .should.apply({ key: 'value' }, fn1, [])
    .should.not.apply({ key: 'value' }, fn2, [])
    .run()
})

test('should.cps()', () => {
  const saga = function*() {
    yield cps(fn1)
  }

  createRunner(saga)
    .should.cps(fn1)
    .should.not.cps(fn2)
    .run()
})

test('should.fork()', () => {
  const saga = function*() {
    yield fork(fn1)
  }

  createRunner(saga)
    .should.fork(fn1)
    .should.not.fork(fn2)
    .run()
})

test('should.spawn()', () => {
  const saga = function*() {
    yield spawn(fn1)
  }

  createRunner(saga)
    .should.spawn(fn1)
    .should.not.spawn(fn2)
    .run()
})

test('should.join()', () => {
  const mockTask = createMockTask()

  const saga = function*() {
    const task: Task = yield fork(fn1)
    yield join(task)
  }

  createRunner(saga)
    .inject(fork(fn1), mockTask)
    .should.join(mockTask)
    .should.not.join(createMockTask())
    .run()
})

test('should.cancel()', () => {
  const mockTask = createMockTask()

  const saga = function*() {
    const task: Task = yield fork(fn1)
    yield cancel(task)
  }

  createRunner(saga)
    .inject(fork(fn1), mockTask)
    .should.cancel(mockTask)
    .should.not.cancel(createMockTask())
    .run()
})

test('should.select()', () => {
  const getUser = (state: any) => state.user
  const getProduct = (state: any) => state.product

  const saga = function*() {
    yield select(getUser)
  }

  createRunner(saga)
    .should.select(getUser)
    .should.not.select(getProduct)
    .run()
})

test('should.actionChannel()', () => {
  const saga = function*() {
    yield actionChannel('FETCH_USER')
  }

  createRunner(saga)
    .should.actionChannel('FETCH_USER')
    .should.not.actionChannel('FETCH_PRODUCT')
    .run()
})

test('should.flush()', () => {
  const chan = channel()

  const saga = function*() {
    yield flush(chan)
  }

  createRunner(saga)
    .should.flush(chan)
    .should.not.flush(channel())
    .run()
})

test('should.cancelled()', () => {
  const saga = function*(shouldCancel: boolean) {
    if (shouldCancel) {
      yield cancelled()
    }
  }

  createRunner(saga, true)
    .should.cancelled()
    .run()

  createRunner(saga, false)
    .should.not.cancelled()
    .run()
})

test('should.setContext()', () => {
  const saga = function*() {
    yield setContext({ key: 'user' })
  }

  createRunner(saga)
    .should.setContext({ key: 'user' })
    .should.not.setContext({ key: 'product' })
    .run()
})

test('should.getContext()', () => {
  const saga = function*() {
    yield getContext('key')
  }

  createRunner(saga)
    .should.getContext('key')
    .should.not.getContext('name')
    .run()
})

test('should.delay()', () => {
  const saga = function*() {
    yield delay(1000)
  }

  createRunner(saga)
    .should.delay(1000)
    .should.not.delay(3000)
    .run()
})

test('should.throttle()', () => {
  const saga = function*() {
    yield throttle(1000, 'FETCH_USER', fn1)
  }

  createRunner(saga)
    .should.throttle(1000, 'FETCH_USER', fn1)
    .should.not.throttle(3000, 'FETCH_USER', fn1)
    .should.not.throttle(1000, 'FETCH_PRODUCT', fn1)
    .should.not.throttle(1000, 'FETCH_USER', fn2)
    .run()
})

test('should.debounce()', () => {
  const saga = function*() {
    yield debounce(1000, 'FETCH_USER', fn1)
  }

  createRunner(saga)
    .should.debounce(1000, 'FETCH_USER', fn1)
    .should.not.debounce(3000, 'FETCH_USER', fn1)
    .should.not.debounce(1000, 'FETCH_PRODUCT', fn1)
    .should.not.debounce(1000, 'FETCH_USER', fn2)
    .run()
})

test('should.retry()', () => {
  const saga = function*() {
    yield retry(3, 10, fn1)
  }

  createRunner(saga)
    .should.retry(3, 10, fn1)
    .should.not.retry(5, 10, fn1)
    .should.not.retry(3, 30, fn1)
    .should.not.retry(5, 10, fn2)
    .run()
})

test('should.all()', () => {
  const saga = function*() {
    yield all([call(fn1), call(fn2)])
  }

  createRunner(saga)
    .should.all([call(fn1), call(fn2)])
    .should.not.all([call(fn1)])
    .should.not.all([call(fn1), call(fn2), call(fn3)])
    .should.not.all([call(fn2), call(fn1)])
    .run()
})

test('should.race()', () => {
  const saga = function*() {
    yield race({
      response1: call(fn1),
      response2: call(fn2),
    })
  }

  createRunner(saga)
    .should.race({
      response1: call(fn1),
      response2: call(fn2),
    })
    .should.not.race({
      response1: call(fn1),
    })
    .should.not.race({
      response1: call(fn1),
      response2: call(fn2),
      response3: call(fn3),
    })
    .should.not.race({
      response1: call(fn2),
      response2: call(fn1),
    })
    .run()
})
