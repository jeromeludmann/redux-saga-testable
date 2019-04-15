# redux-saga-testable

Practical unit test library for [`redux-saga`](https://github.com/redux-saga/redux-saga) providing features like effects recording, easy mocking and built-in assertions.

[![Build Status](https://travis-ci.org/jeromeludmann/redux-saga-testable.svg)](https://travis-ci.org/jeromeludmann/redux-saga-testable)
[![Coverage Status](https://coveralls.io/repos/github/jeromeludmann/redux-saga-testable/badge.svg)](https://coveralls.io/github/jeromeludmann/redux-saga-testable)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[`redux-saga`](https://github.com/redux-saga/redux-saga) is an awesome [`redux`](https://github.com/reduxjs/redux) middleware that avoids coupling between logic and side effects. It allows us to test the sagas in a pure way due to the ability of the generator functions to receive data from the outside.

The drawback is that we have to manually iterate over the generator function for each yielded effect. It makes the tests not very intuitive to write and noisy to read.

When testing a saga, we should not have to worry about what the generator function does behind. We would just like to mock some results instead of triggering side effects. This simple library tries to make it easier.

## Table of contents

- [Installation](#installation)
- [Usage](#usage)
  - [Test a nominal case](#test-a-nominal-case)
  - [Test an error case](#test-an-error-case)
  - [Finalize a saga prematurely](#finalize-a-saga-prematurely)
  - [Catch an error thrown by a saga](#catch-an-error-thrown-by-a-saga)
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

### Test a nominal case

In order to test the nominal case of this saga, a simple test would be written as following:

```ts
import { use } from 'redux-saga-testable'

test('fetchUser() should dispatch FETCH_SUCCESS', () => {
  const id = 123
  const mockUser = { user: 'name' }

  use(fetchUser, id)
    .mock(call(service.getUser, id), mockUser)
    .should.yield(put({ type: 'FETCH_SUCCESS', payload: mockUser }))
    .run()
})
```

[`runner.use()`](#usesaga-args) creates a [`SagaRunner`](#sagarunner) object that exposes methods allowing to set up the behavior of the runner.

[`runner.mock()`](#runnermockeffect-result-results) allows to provide a mock result of an effect yielded by the saga.

[`runner.should.yield()`](#runnershouldyieldeffect) asserts that the saga yields a specific effect.

[`runner.run()`](#runnerrun) executes the saga and returns a [`SagaOutput`](#sagaoutput) object containing all the `effects` yielded by the saga, and optionally a `return` value or an `error`. Note that `runner.run()` **must be the last method call** of the chain.

### Test an error case

You would also like to test the error case. It can be done using the [`throwError()`](#throwerrorerror) helper:

```ts
import { use, throwError } from 'redux-saga-testable'

test('fetchUser() should dispatch FETCH_FAILURE', () => {
  const id = 456
  const mockError = new Error('Unable to fetch user')

  use(fetchUser, id)
    .mock(call(service.getUser, id), throwError(mockError))
    .should.yield(put({ type: 'FETCH_FAILURE', payload: mockError.message }))
    .run()
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
  use(watchNotify)
    .mock(call(service.notify), finalize())
    .should.yield(put({ type: 'NOTIFY_END' }))
    .run()
})
```

The saga will be finalized after it yields the `call(service.notify)` effect and will reach the `finally` block.

### Catch an error thrown by a saga

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

When it is the expected behavior to test, we can invoke [`runner.should.throw()`](#runnershouldthrowerror) ([`runner.catch()`](#runnercatcherror) works the same way) in order to swallow the thrown error:

```ts
import { use } from 'redux-saga-testable'

test('findUser() should throw an error', () => {
  const id = 789

  use(findUser, id)
    .mock(call(service.getUser, id), undefined)
    .should.throw(/^Unable to find user/)
    .run()
})
```

The runner will catch the error thrown by the saga and will record it under the [`SagaOutput`](#sagaoutput) object. Since it will not rethrow the error, the test will not fail and we can make assertions on the [`SagaOutput`](#sagaoutput) object. All the yielded effects remain recorded.

[Get the above examples](/test/examples.test.ts).

## API

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
use(fetchUser, 'user_id')
  .mock(call(getUser, 'user_id'), { name: 'mock name' })
  .run()
```

See also:

- [`throwError(error)`](#throwerrorerror)
- [`finalize()`](#finalize)

### `runner.should.yield(effect)`

Asserts that the saga yields an effect.

- `effect: Effect` - an expected yielded effect

Returns the current [`SagaRunner`](#sagarunner).

```ts
use(fetchUser, 'user_id')
  .should.yield(
    put({
      type: 'FETCH_USER_SUCCESS',
      payload: { name: 'mock name' },
    }),
  )
  .run()
```

### `runner.should.return(value)`

Asserts that the saga returns a value.

- `value: any` - an expected return value

Returns the current [`SagaRunner`](#sagarunner).

```ts
use(fetchUser, 'user_id')
  .should.return({ name: 'mock name' })
  .run()
```

### `runner.should.throw(error)`

Asserts that the saga throws an error.

- `error: ErrorPattern` - an error pattern that matches the expected thrown error

  The `ErrorPattern` can be:

  - a sub `string`
  - a `RegExp`
  - an `Error` object
  - an `Error` class

Returns the current [`SagaRunner`](#sagarunner).

```ts
use(fetchUser, 'unknown_id')
  .should.throw(/User not found/)
  .run()
```

### `runner.catch(error)`

Catches an error thrown by the saga (alias of [`runner.should.throw()`](#runnershouldthrowerror)).

- `error: ErrorPattern` - a pattern that matches the thrown error

  The `ErrorPattern` can be:

  - a sub `string`
  - a `RegExp`
  - an `Error` object
  - an `Error` class

Returns the current [`SagaRunner`](#sagarunner).

```ts
use(fetchUser, 'unknown_id')
  .catch(/User not found/)
  .run()
```

### `runner.run()`

Runs the saga.

Returns a [`SagaOutput`](#sagaoutput).

```ts
use(fetchUser).run()
```

### `throwError(error)`

Throws an error when used as a mock result.

- `error: Error` - an error to throw

Returns a `ThrowError` mock result.

```ts
use(fetchUser)
  .mock(getUser, throwError(new Error('Unable to get user')))
  .run()
```

### `finalize()`

Finalizes the saga when used as a mock result.

Returns a `Finalize` mock result.

```ts
use(fetchUser)
  .mock(getUser, finalize())
  .run()
```

### `SagaRunner`

The saga runner object returned by [`use()`](#usesaga-args).

- [`mock: Function`](#runnermockeffect-result-nextresults)
- [`should.yield: Function`](#runnershouldyieldeffect)
- [`should.return: Function`](#runnershouldreturnvalue)
- [`should.throw: Function`](#runnershouldthrowerror)
- [`catch: Function`](#runnercatcherror)
- [`run: Function`](#runnerrun)

### `SagaOutput`

The saga output object returned by [`runner.run()`](#runnerrun).

- `effects: Effect[]` - the yielded effects
- `return?: any` - the return value
- `error?: Error` - the thrown error

## License

[MIT](LICENSE)
