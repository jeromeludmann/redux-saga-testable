import { put, call, take } from 'redux-saga/effects'
import { use, throwError, finalize } from '../src/runner'

const service = {
  getUser: (id: number) => {},
  notify: () => {},
}

function* fetchUser(id: number) {
  try {
    yield put({ type: 'FETCH_PENDING' })
    const user = yield call(service.getUser, id)
    yield put({ type: 'FETCH_SUCCESS', payload: user })
  } catch (error) {
    yield put({ type: 'FETCH_FAILURE', payload: error.message })
  }
}

test('fetchUser() should dispatch FETCH_SUCCESS', () => {
  const id = 123
  const mockUser = { user: 'name' }

  use(fetchUser, id)
    .inject(call(service.getUser, id), mockUser)
    .should.yield(put({ type: 'FETCH_SUCCESS', payload: mockUser }))
    .run()
})

test('fetchUser() should dispatch FETCH_FAILURE', () => {
  const id = 456
  const mockError = new Error('Unable to fetch user')

  use(fetchUser, id)
    .inject(call(service.getUser, id), throwError(mockError))
    .should.yield(put({ type: 'FETCH_FAILURE', payload: mockError.message }))
    .run()
})

function* watchNotify() {
  try {
    for (;;) {
      yield take('NOTIFY')
      yield call(service.notify)
    }
  } finally {
    yield put({ type: 'NOTIFY_END' })
  }
}

test('watchNotify() should dispatch NOTIFY_END', () => {
  use(watchNotify)
    .inject(call(service.notify), finalize())
    .should.yield(put({ type: 'NOTIFY_END' }))
    .run()
})

function* findUser(id: number) {
  const user = yield call(service.getUser, id)

  if (!user) {
    throw new Error(`Unable to find user ${id}`)
  }

  return user
}

test('findUser() should throw an error', () => {
  const id = 789

  use(findUser, id)
    .inject(call(service.getUser, id), undefined)
    .should.throw(/^Unable to find user/)
    .run()
})
