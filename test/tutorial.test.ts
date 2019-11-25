import { Action } from 'redux';
import { select, put, call, take, delay } from 'redux-saga/effects';
import { createRunner, throwError, finalize } from '../src';

interface FetchUserAction extends Action<'FETCH_USER'> {
  payload: { userId: number };
}

interface FetchProductAction extends Action<'FETCH_PRODUCT'> {
  payload: { productId: number };
}

interface SendPingAction extends Action<'SEND_PING'> {}

const selectors = {
  getCurrentUser: (state: { user: any }) => state.user,
};

const services = {
  getUserById: (id: number) => {},
  getProductById: (id: number) => {},
  ping: () => {},
  notify: () => {},
};

function* fetchUserWorker(action: FetchUserAction) {
  const { userId } = action.payload;

  yield put({ type: 'FETCH_USER_REQUEST' });

  let user = yield select(selectors.getCurrentUser);
  if (user !== undefined) return;

  user = yield call(services.getUserById, userId);
  yield put({ type: 'FETCH_USER_SUCCESS', payload: user });
}

test('fetchUserWorker() should dispatch FETCH_USER_SUCCESS', () => {
  const userId = 123;
  const user = { user: 'name' };

  createRunner(fetchUserWorker, { type: 'FETCH_USER', payload: { userId } })
    .map(call(services.getUserById, userId), user)
    .should.put({ type: 'FETCH_USER_SUCCESS', payload: user });
});

test('fetchUserWorker() should not make the request if the user already exists', () => {
  const userId = 123;
  const existingUser = { user: 'name' };

  createRunner(fetchUserWorker, { type: 'FETCH_USER', payload: { userId } })
    .map(select(selectors.getCurrentUser), existingUser)
    .should.not.call(services.getUserById, userId);
});

test('fetchUserWorker() with your own assertions', () => {
  const userId = 123;
  const user = { user: 'name' };

  const output = createRunner(fetchUserWorker, {
    type: 'FETCH_USER',
    payload: { userId },
  })
    .map(call(services.getUserById, userId), user)
    .run();

  expect(output.effects).toHaveLength(4);

  expect(output.effects).toContainEqual(
    put({ type: 'FETCH_USER_SUCCESS', payload: user }),
  );
});

test('fetchUserWorker() with snapshot testing', () => {
  const userId = 123;
  const user = { user: 'name' };

  const output = createRunner(fetchUserWorker, {
    type: 'FETCH_USER',
    payload: { userId },
  })
    .map(call(services.getUserById, userId), user)
    .run();

  expect(output).toMatchSnapshot();
});

function* fetchProductWorker(action: FetchProductAction) {
  const { productId } = action.payload;

  try {
    yield put({ type: 'FETCH_PRODUCT_REQUEST' });
    const product = yield call(services.getProductById, productId);
    yield put({ type: 'FETCH_PRODUCT_SUCCESS', payload: product });
  } catch (error) {
    yield put({ type: 'FETCH_PRODUCT_FAILURE', payload: error.message });
  }
}

test('fetchProductWorker() should dispatch FETCH_PRODUCT_FAILURE if services.getProductById() fails', () => {
  const productId = 123;
  const error = new Error('Unable to fetch product');

  createRunner(fetchProductWorker, {
    type: 'FETCH_PRODUCT',
    payload: { productId },
  })
    .map(call(services.getProductById, productId), throwError(error))
    .should.put({ type: 'FETCH_PRODUCT_FAILURE', payload: error.message });
});

function* sendPingWorker(action: SendPingAction) {
  yield delay(1000);
  const pong1 = yield call(services.ping);

  yield delay(1000);
  const pong2 = yield call(services.ping);

  yield delay(1000);
  const pong3 = yield call(services.ping);

  yield put({
    type: 'RECEIVE_PONG',
    payload: { results: [pong1, pong2, pong3] },
  });
}

test('sendPingWorker() should dispatch RECEIVE_PONG with different results', () => {
  createRunner(sendPingWorker, { type: 'SEND_PING' })
    .map(call(services.ping), 12, 10, 11)
    .should.put({
      type: 'RECEIVE_PONG',
      payload: { results: [12, 10, 11] },
    });
});

function* notifyWatcher() {
  try {
    for (;;) {
      yield take('NOTIFY');
      yield put({ type: 'NOTIFY_REQUEST' });
      yield call(services.notify);
      yield put({ type: 'NOTIFY_SUCCESS' });
    }
  } finally {
    yield put({ type: 'NOTIFY_END' });
  }
}

test('notifyWatcher() should dispatch NOTIFY_END', () => {
  createRunner(notifyWatcher)
    .map(call(services.notify), finalize())
    .should.put({ type: 'NOTIFY_END' });
});

function* findProduct(id: number) {
  if (id < 0) {
    throw new Error(`Unable to find product ${id}`);
  }

  return yield call(services.getProductById, id);
}

test('findProduct() should throw an error when a negative id is given', () => {
  const id = -123;

  createRunner(findProduct, id)
    .catch(Error)
    .should.throw(/^Unable to find product/);
});
