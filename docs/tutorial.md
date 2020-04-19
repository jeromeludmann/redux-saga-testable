# Tutorial

The tutorial can be used as a guide to learn **redux-saga-testable**.

It uses [Jest] for the examples below, but that does not matter because you
should be able to use the test framework of your choice like [Mocha], [AVA],
etc.

## Contents

- [Test a simple use case]
- [Test an error use case]
- [Use your own assertion way]
- [Use snapshot testing]
- [Break an infinite loop]
- [Catch silently an error thrown by a saga]
- [Map an effect that is yielded several times]
- [Clone a saga runner instance]

## Test a simple use case

Considering the following saga:

```ts
function* fetchUserWorker(action: FetchUserAction) {
  const { userId } = action.payload;

  yield put({ type: 'FETCH_USER_REQUEST' });

  let user = yield select(selectors.getCurrentUser);
  if (user !== undefined) return;

  user = yield call(services.getUserById, userId);
  yield put({ type: 'FETCH_USER_SUCCESS', payload: user });
}
```

This saga fetches a user and dispatches `FETCH_USER_SUCCESS`. Note that if the
user already exists, it does nothing instead of calling
`services.getUserById()`.

You would like to assert that this saga dispatches the action
`FETCH_USER_SUCCESS` when the call to `services.getUserById()` returns a user:

```ts
import { createRunner } from 'redux-saga-testable';

test('fetchUserWorker() should dispatch FETCH_USER_SUCCESS', () => {
  const userId = 123;
  const user = { user: 'name' };

  createRunner(fetchUserWorker, { type: 'FETCH_USER', payload: { userId } })
    .map(call(services.getUserById, userId), user)
    .should.put({ type: 'FETCH_USER_SUCCESS', payload: user });
});
```

Let's see what happens step by step:

- ```code
  import { createRunner } from 'redux-saga-testable';
  ```

  Imports the saga runner creator function.

- ```code
  createRunner(fetchUserWorker, { type: 'FETCH_USER', payload: { userId } })
  ```

  Creates a saga runner instance from the saga `fetchUserWorker` and its action.

- ```code
  .map(call(services.getUserById, userId), user)
  ```

  Maps the effect `call(services.getUserById, id)` to the value `user`.

- ```code
  .should.put({ type: 'FETCH_USER_SUCCESS', payload: user });
  ```

  Asserts that the saga yields the effect
  `put({ type: 'FETCH_USER_SUCCESS', payload: user })`.

The test will pass if the runner can make the given assertions. Otherwise an
error will be thrown and the test will fail.

Now, you would like to ensure that the saga does not make the request to
`services.getUserById()` if the user already exists:

```ts
test('fetchUserWorker() should not make the request if the user already exists', () => {
  const userId = 123;
  const existingUser = { user: 'name' };

  createRunner(fetchUserWorker, { type: 'FETCH_USER', payload: { userId } })
    .map(select(selectors.getCurrentUser), existingUser)
    .should.not.call(services.getUserById, userId);
});
```

By mapping the effect `select(selectors.getCurrentUser)` to the value
`existingUser`, you have the ability to act on the saga behavior in order to
simulate an already existing user.

Explanations:

- ```code
  .map(select(selectors.getCurrentUser), existingUser)
  ```

  Maps the effect `select(selectors.getCurrentUser)` to the value `user`.

- ```code
  .should.not.call(services.getUserById, userId);
  ```

  Asserts that the saga does not yield the effect
  `call(services.getUserById, userId)`.

The order of the assertions does not matter.

## Test an error use case

Given the following saga:

```ts
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
```

If `services.getProductById()` returns a product, it dispatches
`FETCH_PRODUCT_SUCCESS`. If an error is thrown instead, it dispatches
`FETCH_PRODUCT_FAILURE`.

You would like to test the use case where an error is thrown inside the saga. It
can be done using the [`throwError()`][throwerror] helper while mapping the
effect:

```ts
import { throwError } from 'redux-saga-testable';

test('fetchUserWorker() should dispatch FETCH_USER_FAILURE if services.getUserById() fails', () => {
  const id = 123;
  const error = new Error('Unable to fetch user');

  createRunner(fetchUserWorker, { type: 'FETCH_USER', payload: { id } })
    .map(call(services.getUserById, id), throwError(error))
    .should.put({ type: 'FETCH_USER_FAILURE', payload: error.message });
});
```

Explanations:

- ```code
  import { throwError } from 'redux-saga-testable';
  ```

  Imports the helper `throwError()`.

- ```code
  .map(call(services.getUserById, id), throwError(error))
  ```

  Uses the helper by wrapping an `error` to create a thrown error and uses it as
  a mapped value.

[`throwError()`][throwerror] is an helper that tells the runner you want to
throw an error when the saga yields the given effect, instead of just assigning
a simple value as a result of the effect.

## Use your own assertion way

If you want to assert yourself without requiring built-in assertions provided by
[`runner.should`][runner.should], you can get the saga output by calling
[`runner.run()`][runner.run].

[`runner.run()`][runner.run] executes the saga and records all the effects
yielded during the running and returns a [`RunnerOutput`][runneroutput] object
containing all the `effects` yielded by the saga, and optionally a `return`
value or a thrown `error`:

```ts
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
```

Note that since [`runner.run()`][runner.run] is the only methods that does not
return the current [`Runner`][runner] instance, it must be the last method call
of the chain.

## Use snapshot testing

Snapshot testing is possible by using [`runner.run()`][runner.run]:

```ts
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
```

The [`RunnerOutput`][runneroutput] returned by [`createrunner()`][createrunner]
will be serialized and used as a snapshot.

## Break an infinite loop

Now let's go with that:

```ts
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
```

This saga yields `call(services.notify)` when it receives an action `NOTIFY`.
Note that it will never terminated since it runs an infinite loop.

This is a case where you would like to finalize a saga prematurely:

```ts
import { finalize } from 'redux-saga-testable';

test('notifyWatcher() should dispatch NOTIFY_END', () => {
  createRunner(notifyWatcher)
    .map(call(services.notify), finalize())
    .should.put({ type: 'NOTIFY_END' });
});
```

Explanations:

- ```code
  import { finalize } from 'redux-saga-testable';
  ```

  Imports the helper `finalize()`.

- ```code
  .map(call(services.notify), finalize())
  ```

  Uses the helper as a mapped value to break the infinite loop that will end the
  saga.

[`finalize()`][finalize] will break the infinite loop and the saga will be
finalized. When a saga is finalized, it will reach its next `finally` block
before to terminate completely.

## Catch silently an error thrown by a saga

Sometimes a saga (which is not a root saga) could throw an error:

```ts
function* findProduct(id: number) {
  if (id < 0) {
    throw new Error(`Unable to find product ${id}`);
  }

  return yield call(services.getProductById, id);
}
```

This saga will throw an error under condition `id < 0`.

When it is the expected behavior to test, you would like to avoid that the saga
throws an error and causes a test failure.

You have to invoke [`runner.catch()`][runner.catch] before the first assertion
in order to swallow the thrown error. You can then make an assertion, like
[`runner.should.throw()`][runner.should.throw]:

```ts
test('findProduct() should throw an error when a negative id is given', () => {
  const id = -123;

  createRunner(findProduct, id)
    .catch(Error)
    .should.throw(/^Unable to find product/);
});
```

Explanations:

- ```code
  .catch(Error)
  ```

  Catches silently (swallow) errors that inherit from `Error`.

- ```code
  .should.throw(/^Unable to find product/);
  ```

  Asserts that the saga throws an error that matches the pattern
  `/^Unable to find product/`.

The runner will catch the error thrown by the saga and will record it under the
key `error` of the [`RunnerOutput`][runneroutput] object. Since it will not
rethrow the error, the test will not fail. Now you are able to make your
assertions although the saga throwing an error.

## Map an effect that is yielded several times

Assuming you have this case:

```ts
function* sendPingWorker(action: SendPingAction) {
  yield delay(action.payload.delay);
  const pong1 = yield call(services.ping);

  yield delay(action.payload.delay);
  const pong2 = yield call(services.ping);

  yield delay(action.payload.delay);
  const pong3 = yield call(services.ping);

  yield put({
    type: 'RECEIVE_PONG',
    payload: { results: [pong1, pong2, pong3] },
  });
}
```

It sends a ping three times using `services.ping()` and dispatches
`RECEIVE_PONG` at the end.

You would like to be able to map several values for the same effect
`call(services.ping)` that is repeated three times:

```ts
test('sendPingWorker() should dispatch RECEIVE_PONG with different results', () => {
  createRunner(sendPingWorker, { type: 'SEND_PING', payload: { delay: 1000 } })
    .map(call(services.ping), 12, 10, 11)
    .should.put({
      type: 'RECEIVE_PONG',
      payload: { results: [12, 10, 11] },
    });
});
```

Explanations:

- ```code
  .map(call(services.ping), 12, 10, 11)
  ```

  Maps the effect `call(services.ping)` to three different values: `12`, `10`
  and `11`.

The runner will sequentially map the effect `call(services.ping)` to values
`12`, `10` and `11`. Note here that the order of given arguments matters.

## Clone a saga runner instance

In order to have more concise tests, this feature allows to manage multiple
runner instances (almost same purpose of
[`cloneableGenerator()`][cloneablegenerator] somehow).

When [`runner.clone()`][runner.clone] is invoked, a new [`Runner`][runner] is
created from the existing one. It is no longer required to redo effect mapping
(or catch error) again.

You can [see more details here][runner.clone].

[jest]: https://github.com/facebook/jest
[mocha]: https://github.com/mochajs/mocha
[ava]: https://github.com/avajs/ava
[test a simple use case]: #test-a-simple-use-case
[test an error use case]: #test-an-error-use-case
[use your own assertion way]: #use-your-own-assertion-way
[use snapshot testing]: #use-snapshot-testing
[break an infinite loop]: #break-an-infinite-loop
[catch silently an error thrown by a saga]: #catch-silently-an-error-thrown-by-a-saga
[map an effect that is yielded several times]: #map-an-effect-that-is-yielded-several-times
[clone a saga runner instance]: #clone-a-saga-runner-instance
[cloneablegenerator]: https://github.com/redux-saga/redux-saga/tree/master/docs/api#cloneablegeneratorgeneratorfunc
[createrunner]: api.md#createrunnersaga--args
[runner]: api.md#runner
[runner.map]: api.md#runnermapeffect-value--nextvalues
[runner.catch]: api.md#runnercatcherror
[runner.clone]: api.md#runnerclone
[runner.run]: api.md#runnerrun
[runner.should]: api.md#runnershould
[throwerror]: api.md#throwerrorerror
[finalize]: api.md#finalizevalue
[runneroutput]: api.md#runneroutput
[runner.should.yield]: api.md#runnershouldyieldeffect
[runner.should.return]: api.md#runnershouldreturnvalue
[runner.should.throw]: api.md#runnershouldthrowerror
