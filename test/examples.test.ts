import { put, call, take } from 'redux-saga/effects'
import { createRunner, throwError, finalize } from '../src'

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

  createRunner(fetchUser, id)
    .inject(call(service.getUser, id), mockUser)
    .should.put({ type: 'FETCH_SUCCESS', payload: mockUser })
})

test('fetchUser() should dispatch FETCH_FAILURE', () => {
  const id = 456
  const mockError = new Error('Unable to fetch user')

  createRunner(fetchUser, id)
    .inject(call(service.getUser, id), throwError(mockError))
    .should.put({ type: 'FETCH_FAILURE', payload: mockError.message })
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
  createRunner(watchNotify)
    .inject(call(service.notify), finalize())
    .should.put({ type: 'NOTIFY_END' })
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

  createRunner(findUser, id)
    .inject(call(service.getUser, id), undefined)
    .catch(Error)
    .should.throw(/^Unable to find user/)
})
