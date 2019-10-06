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
import { use } from '../src/runner'
import { Task, channel } from 'redux-saga'

const fn1 = () => {}
const fn2 = () => {}

test('should.take()', () => {
  const saga = function*() {
    yield take('FETCH')
  }

  use(saga)
    .should.take('FETCH')
    .run()
})

test('should.takeMaybe()', () => {
  const saga = function*() {
    yield takeMaybe('FETCH')
  }

  use(saga)
    .should.takeMaybe('FETCH')
    .run()
})

test('should.takeEvery()', () => {
  const saga = function*() {
    yield takeEvery('FETCH', fn1)
  }

  use(saga)
    .should.takeEvery('FETCH', fn1)
    .run()
})

test('should.takeLatest()', () => {
  const saga = function*() {
    yield takeLatest('FETCH', fn1)
  }

  use(saga)
    .should.takeLatest('FETCH', fn1)
    .run()
})

test('should.takeLeading()', () => {
  const saga = function*() {
    yield takeLeading('FETCH', fn1)
  }

  use(saga)
    .should.takeLeading('FETCH', fn1)
    .run()
})

test('should.put()', () => {
  const saga = function*() {
    yield put({ type: 'SUCCESS' })
  }

  use(saga)
    .should.put({ type: 'SUCCESS' })
    .run()
})

test('should.putResolve()', () => {
  const saga = function*() {
    yield putResolve({ type: 'SUCCESS' })
  }

  use(saga)
    .should.putResolve({ type: 'SUCCESS' })
    .run()
})

test('should.call()', () => {
  const saga = function*() {
    yield call(fn1)
  }

  use(saga)
    .should.call(fn1)
    .run()
})

test('should.apply()', () => {
  const saga = function*() {
    yield apply({ key: 'value' }, fn1, [])
  }

  use(saga)
    .should.apply({ key: 'value' }, fn1, [])
    .run()
})

test('should.cps()', () => {
  const saga = function*() {
    yield cps(fn1)
  }

  use(saga)
    .should.cps(fn1)
    .run()
})

test('should.fork()', () => {
  const saga = function*() {
    yield fork(fn1)
  }

  use(saga)
    .should.fork(fn1)
    .run()
})

test('should.spawn()', () => {
  const saga = function*() {
    yield spawn(fn1)
  }

  use(saga)
    .should.spawn(fn1)
    .run()
})

test('should.join()', () => {
  const mockTask = createMockTask()

  const saga = function*() {
    const task: Task = yield fork(fn1)
    yield join(task)
  }

  use(saga)
    .mock(fork(fn1), mockTask)
    .should.join(mockTask)
    .run()
})

test('should.cancel()', () => {
  const mockTask = createMockTask()

  const saga = function*() {
    const task: Task = yield fork(fn1)
    yield cancel(task)
  }

  use(saga)
    .mock(fork(fn1), mockTask)
    .should.cancel(mockTask)
    .run()
})

test('should.select()', () => {
  const getValue = (state: { value: string }) => state.value

  const saga = function*() {
    yield select(getValue)
  }

  use(saga)
    .should.select(getValue)
    .run()
})

test('should.actionChannel()', () => {
  const saga = function*() {
    yield actionChannel('FETCH')
  }

  use(saga)
    .should.actionChannel('FETCH')
    .run()
})

test('should.flush()', () => {
  const chan = channel()

  const saga = function*() {
    yield flush(chan)
  }

  use(saga)
    .should.flush(chan)
    .run()
})

test('should.cancelled()', () => {
  const saga = function*() {
    yield cancelled()
  }

  use(saga)
    .should.cancelled()
    .run()
})

test('should.setContext()', () => {
  const context = { key: 'value' }

  const saga = function*() {
    yield setContext(context)
  }

  use(saga)
    .should.setContext(context)
    .run()
})

test('should.getContext()', () => {
  const saga = function*() {
    yield getContext('key')
  }

  use(saga)
    .should.getContext('key')
    .run()
})

test('should.delay()', () => {
  const saga = function*() {
    yield delay(1000)
  }

  use(saga)
    .should.delay(1000)
    .run()
})

test('should.throttle()', () => {
  const saga = function*() {
    yield throttle(1000, 'FETCH', fn1)
  }

  use(saga)
    .should.throttle(1000, 'FETCH', fn1)
    .run()
})

test('should.debounce()', () => {
  const saga = function*() {
    yield debounce(1000, 'FETCH', fn1)
  }

  use(saga)
    .should.debounce(1000, 'FETCH', fn1)
    .run()
})

test('should.retry()', () => {
  const saga = function*() {
    yield retry(3, 10, fn1)
  }

  use(saga)
    .should.retry(3, 10, fn1)
    .run()
})

test('should.all()', () => {
  const saga = function*() {
    yield all([call(fn1), call(fn2)])
  }

  use(saga)
    .should.all([call(fn1), call(fn2)])
    .run()
})

test('should.race()', () => {
  const saga = function*() {
    yield race({
      response1: call(fn1),
      response2: call(fn2),
    })
  }

  use(saga)
    .should.race({
      response1: call(fn1),
      response2: call(fn2),
    })
    .run()
})
