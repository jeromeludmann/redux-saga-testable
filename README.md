# redux-saga-testable

Practical unit test library for [`redux-saga`](https://github.com/redux-saga/redux-saga) providing features like effect recording, effect-value mapping and built-in assertions.

[![Build Status](https://travis-ci.org/jeromeludmann/redux-saga-testable.svg)](https://travis-ci.org/jeromeludmann/redux-saga-testable)
[![Coverage Status](https://coveralls.io/repos/github/jeromeludmann/redux-saga-testable/badge.svg)](https://coveralls.io/github/jeromeludmann/redux-saga-testable)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[`redux-saga`](https://github.com/redux-saga/redux-saga) is an awesome [`redux`](https://github.com/reduxjs/redux) middleware that avoids coupling between logic and side effects. It allows us to test the sagas in a pure way due to the ability of the generator functions to receive data from the outside.

The drawback is that we have to manually iterate over the generator function for each yielded effect. It makes the tests not very intuitive to write and noisy to read.

When testing a saga, we should not have to worry about what the generator function does behind. We would just like to check some arbitrary effects and eventually map effects to some values instead of triggering side effects. This simple library tries to make it easier.

## Table of contents

- [Installation](#installation)
- [Usage](#usage)
  - [Test a nominal case](#test-a-nominal-case)
  - [Test an error case](#test-an-error-case)
  - [Finalize a saga prematurely](#finalize-a-saga-prematurely)
  - [Catch an error thrown by a saga](#catch-an-error-thrown-by-a-saga)
  - [Clone a saga runner instance](#clone-a-saga-runner-instance)
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
import { createRunner } from 'redux-saga-testable'

test('fetchUser() should dispatch FETCH_SUCCESS', () => {
  const id = 123
  const mockUser = { user: 'name' }

  createRunner(fetchUser, id)
    .map(call(service.getUser, id), mockUser)
    .should.put({ type: 'FETCH_SUCCESS', payload: mockUser })
    .run()
})
```

[`createRunner(fetchUser, id)`](#createrunnersaga-args) creates a [`SagaRunner`](#sagarunner) object that exposes methods allowing to set up the behavior of the runner.

[`.map(call(service.getUser, id), mockUser)`](#runnermapeffect-value--nextvalues) allows to map an effect to a value.

[`.should.put({ type: 'FETCH_SUCCESS', payload: mockUser })`](#runnershouldyieldeffect) asserts that the saga yields a `PUT` effect (you can assert with any effect creator).

[`.run()`](#runnerrun) executes the saga and returns a [`SagaOutput`](#sagaoutput) object containing all the `effects` yielded by the saga, and optionally a `return` value or an `error`. Note that `runner.run()` **must be the last method call of the chain and is always required to produce an output**.

### Test an error case

You would also like to test the error case. It can be done using the [`throwError()`](#throwerrorerror) helper:

```ts
import { createRunner, throwError } from 'redux-saga-testable'

test('fetchUser() should dispatch FETCH_FAILURE', () => {
  const id = 456
  const mockError = new Error('Unable to fetch user')

  createRunner(fetchUser, id)
    .map(call(service.getUser, id), throwError(mockError))
    .should.put({ type: 'FETCH_FAILURE', payload: mockError.message })
    .run()
})
```

[`throwError()`](#throwerrorerror) tells the runner that we want to map an effect to an error that **will be thrown** when the saga will yield the given effect, instead of just assigning a simple value as a result of the effect.

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

You can do it by map an effect to [`finalize()`](#finalize) as a value:

```ts
import { createRunner, finalize } from 'redux-saga-testable'

test('watchNotify() should dispatch NOTIFY_END', () => {
  createRunner(watchNotify)
    .map(call(service.notify), finalize())
    .should.put({ type: 'NOTIFY_END' })
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
import { createRunner } from 'redux-saga-testable'

test('findUser() should throw an error', () => {
  const id = 789

  createRunner(findUser, id)
    .map(call(service.getUser, id), undefined)
    .should.throw(/^Unable to find user/)
    .run()
})
```

The runner will catch the error thrown by the saga and will record it under the [`SagaOutput`](#sagaoutput) object. Since it will not rethrow the error, the test will not fail and we can make assertions on the [`SagaOutput`](#sagaoutput) object. All the yielded effects remain recorded.

[Get the above examples](/test/examples.test.ts).

### Clone a saga runner instance

In order to have more concise tests, this feature allows to manage multiple runner instances (almost same purpose of [`cloneableGenerator`](https://github.com/redux-saga/redux-saga/tree/master/docs/api#cloneablegeneratorgeneratorfunc)).

When `runner.clone()` is invoked, a new [`SagaRunner`](#sagarunner) is created from the previous state. It is no longer required to remap effects again.

```ts
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

  runner1.map(call(fn1), 'result1')
  runner1.should.yield(fork(fn1))
  runner1.should.not.yield(fork(fn2))
  runner1.should.not.yield(fork(fn3))

  runner2.map(call(fn2), 'result2')

  const runner3 = runner2.clone()

  runner2.should.not.yield(fork(fn1))
  runner2.should.yield(fork(fn2))
  runner2.should.not.yield(fork(fn3))

  runner3.map(call(fn3), 'result3')
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
```

## API

### `createRunner(saga[, ...args])`

Creates a [SagaRunner](#sagarunner).

- `saga: Function` - a saga to use with the runner
- `args?: any[]` - arguments to be passed to the saga

Returns a [`SagaRunner`](#sagarunner).

```ts
const runner = createRunner(fetchUser, 'user_id')
```

### `runner.map(effect, value [, ...nextValues])`

Maps an effect to a value.

- `effect: Effect` - an effect to match
- `value: any` - a value to use
- `nextValues?: any[]` - next values to use

Returns the current [`SagaRunner`](#sagarunner).

```ts
createRunner(fetchUser, 'user_id')
  .map(call(getUser, 'user_id'), { name: 'mock name' })
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
createRunner(fetchUser, 'user_id')
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
createRunner(fetchUser, 'user_id')
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
createRunner(fetchUser, 'unknown_id')
  .should.throw(/User not found/)
  .run()
```

### `runner.catch(error)`

Catches silently an error thrown by the saga (alias of [`runner.should.throw()`](#runnershouldthrowerror)).

- `error: ErrorPattern` - a pattern that matches the thrown error

  The `ErrorPattern` can be:

  - a sub `string`
  - a `RegExp`
  - an `Error` object
  - an `Error` class

Returns the current [`SagaRunner`](#sagarunner).

```ts
createRunner(fetchUser, 'unknown_id')
  .catch(/User not found/)
  .run()
```

### `runner.clone()`

Clones the current runner instance.

Returns a copy of the current [`SagaRunner`](#sagarunner).

```ts
const rootRunner = createRunner(fetchUser, 'user_id')
const clonedRunner = rootRunner.clone()

clonedRunner.map(call(getUser), { name: 'mock name' })

rootRunner.should
  .put({
    type: 'FETCH_SUCCESS',
    payload: { user: undefined },
  })
  .run()

clonedRunner.should
  .put({
    type: 'FETCH_SUCCESS',
    payload: { user: { name: 'mock name' } },
  })
  .run()
```

### `runner.run()`

Runs the saga.

Returns a [`SagaOutput`](#sagaoutput).

```ts
createRunner(fetchUser).run()
```

### `throwError(error)`

Throws an error from the saga when mapped as a value.

- `error: Error` - an error to throw

Returns a `ThrowError` value.

```ts
createRunner(fetchUser)
  .map(getUser, throwError(new Error('Unable to get user')))
  .run()
```

### `finalize()`

Finalizes the saga when mapped as a value.

Returns a `Finalize` value.

```ts
createRunner(fetchUser)
  .map(getUser, finalize())
  .run()
```

### `SagaRunner`

The saga runner object returned by [`createRunner()`](#createrunnersaga-args).

- [`map: Function`](#runnermapeffect-value--nextvalues)
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
