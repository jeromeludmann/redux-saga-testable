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

  const output = use(fetchUser, id)
    .mock(call(service.getUser, id), mockUser)
    .run()

  expect(output.effects).toContainEqual(
    put({ type: 'FETCH_SUCCESS', payload: mockUser }),
  )
})

test('fetchUser() should dispatch FETCH_FAILURE', () => {
  const id = 456
  const mockError = new Error('Unable to fetch user')

  const output = use(fetchUser, id)
    .mock(call(service.getUser, id), throwError(mockError))
    .run()

  expect(output.effects).toContainEqual(
    put({ type: 'FETCH_FAILURE', payload: mockError.message }),
  )
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
  const output = use(watchNotify)
    .mock(call(service.notify), finalize())
    .run()

  expect(output.effects).toContainEqual(call(service.notify))
  expect(output.effects).toContainEqual(put({ type: 'NOTIFY_END' }))
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

  const output = use(findUser, id)
    .mock(call(service.getUser, id), undefined)
    .catch(/^Unable to find user/)
    .run()

  expect(output.error).toEqual(new Error(`Unable to find user ${id}`))
})
