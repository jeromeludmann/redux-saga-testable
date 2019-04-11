# redux-saga-testable

Practical unit test library for [`redux-saga`](https://github.com/redux-saga/redux-saga) providing features like effects recording and easy mocking.

[`redux-saga`](https://github.com/redux-saga/redux-saga) is an awesome [`redux`](https://github.com/reduxjs/redux) middleware that avoids coupling between logic and side effects. It allows us to test the sagas in a pure way due to the ability of the generator functions to receive data from the outside.

The drawback is that we have to manually iterate over the generator function for each yielded effect. It makes the tests not very intuitive to write and noisy to read.

When testing a saga, we should not have to worry about what the generator function does behind. We would just like to mock some results instead of triggering side effects. This simple library tries to make it easier.

## Table of contents

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [License](#license)

## Installation

Make sure you have [Node.js](https://nodejs.org) installed.

Then install:

```sh
npm install --save-dev redux-saga-testable
```

Unless you have special requirements, you should pass `--save-dev` since it will only be used during the development stage.

## Usage

We will use [Jest](https://github.com/facebook/jest) for the examples below, but that does not matter because you should be able to use the test framework of your choice like [Mocha](https://github.com/mochajs/mocha), [AVA](https://github.com/avajs/ava), etc.

[View API for more details](#api).

Assume that we have the following saga:

```ts
function* fetchUser(id: number) {
  try {
    yield put({ type: 'FETCH_PENDING' })
    const user = yield call(service.getUser, id)
    yield put({ type: 'FETCH_SUCCESS', payload: user })
  } catch (error) {
    yield put({ type: 'FETCH_FAILURE', payload: error.message })
  }
}
```

### Mock a result

In order to test the nominal case of this saga, a simple test would be written as following:

```ts
import { use } from 'redux-saga-testable'

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
```

[`use()`](#usesaga-args) creates a [`SagaRunner`](#sagarunner) object that exposes methods allowing to set up the behavior of the runner.

[`mock()`](#runnermockeffect-result-results) allows to provide a mock result of an effect yielded by the saga.

[`run()`](#runnerrun) executes the saga and returns a [`SagaOutput`](#sagaoutput) object containing all the `effects` yielded by the saga, and optionally a `return` value or an `error`. Note that `run()` **must be the last method call** of the chain.

### Mock a thrown error

You would also like to test the error case. It can be done using the [`throwError()`](#throwerrorerror) helper:

```ts
import { use, throwError } from 'redux-saga-testable'

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
```

[`throwError()`](#throwerrorerror) tells the runner that we want to mock an error that will be thrown when the saga will yield the given effect, instead of just assigning a simple value as a result of the effect.

### Finalize a saga prematurely

In some cases, it would be useful to manually finalize a saga that runs infinitely:

```ts
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
```

You can do it by using [`finalize()`](#finalize) as a mock result:

```ts
import { use, finalize } from 'redux-saga-testable'

test('watchNotify() should dispatch NOTIFY_END', () => {
  const output = use(watchNotify)
    .mock(call(service.notify), finalize())
    .run()

  expect(output.effects).toContainEqual(call(service.notify))
  expect(output.effects).toContainEqual(put({ type: 'NOTIFY_END' }))
})
```

The saga will be finalized after it yields the `call(service.notify)` effect and will reach the `finally` block.

### Catch an error thrown by the saga

Sometimes a saga (which is not a root saga) could throw an error:

```ts
function* findUser(id: number) {
  const user = yield call(service.getUser, id)

  if (!user) {
    throw new Error(`Unable to find user ${id}`)
  }

  return user
}
```

When it is the expected behavior to test, we can just invoke [`catch()`](#runnercatcherror) in order to swallow the thrown error:

```ts
import { use } from 'redux-saga-testable'

test('findUser() should throw an error', () => {
  const id = 789

  const output = use(findUser, id)
    .mock(call(service.getUser, id), undefined)
    .catch(/^Unable to find user/)
    .run()

  expect(output.error).toEqual(new Error(`Unable to find user ${id}`))
})
```

The runner will catch the error thrown by the saga and will record it under the [`SagaOutput`](#sagaoutput) object. Since it will not rethrow the error, the test will not fail and we can make assertions on the [`SagaOutput`](#sagaoutput) object. All the yielded effects remain recorded.

[Get the above examples](/test/examples.test.ts).

## API

### `SagaRunner`

The saga runner object returned by [`use()`](#usesaga-args).

- [`mock: Function`](#runnermockeffect-result-nextresults)
- [`catch: Function`](#runnercatcherror)
- [`run: Function`](#runnerrun)

### `SagaOutput`

The saga output object returned by [`runner.run()`](#runnerrun).

- `effects: Effect[]` - the yielded effects
- `return?: any` - the return value
- `error?: Error` - the thrown error

### `use(saga[, ...args])`

Creates a [SagaRunner](#sagarunner).

- `saga: Function` - a saga to use with the runner
- `args?: any[]` - arguments to be passed to the saga

Returns a [`SagaRunner`](#sagarunner).

```ts
const runner = use(fetchUser, 'user_id')
```

### `runner.mock(effect, result[, ...nextResults])`

Mocks the result of an effect.

- `effect: Effect` - an effect to match
- `result: any` - a mock result
- `results?: any[]` - next mock results

Returns the current [`SagaRunner`](#sagarunner).

```ts
const output = use(fetchUser)
  .mock(getUser, { name: 'mock name' })
  .run()
```

See also:

- [`throwError(error)`](#throwerrorerror)
- [`finalize()`](#finalize)

### `runner.catch(error)`

Catches an error thrown by the saga.

- `error: string | RegExp | Error | (new (...args: any[]) => any)` - a pattern that matches the thrown error

Returns the current [`SagaRunner`](#sagarunner).

```ts
const output = use(fetchUser)
  .catch(/User not found/)
  .run()
```

### `runner.run()`

Runs the saga.

Returns a [`SagaOutput`](#sagaoutput).

```ts
const output = use(fetchUser).run()
```

### `throwError(error)`

Throws an error when used as a mock result.

- `error: Error` - an error to throw

Returns a `ThrowError` mock result.

```ts
const output = use(fetchUser)
  .mock(getUser, throwError(new Error('Unable to get user')))
  .run()
```

### `finalize()`

Finalizes the saga when used as a mock result.

Returns a `Finalize` mock result.

```ts
const output = use(fetchUser)
  .mock(getUser, finalize())
  .run()
```

## License

[MIT](LICENSE)
