# redux-saga-testable

[![npm](https://img.shields.io/npm/v/redux-saga-testable)](https://www.npmjs.com/package/redux-saga-testable)
![node](https://img.shields.io/node/v/redux-saga-testable)
![npm peer dependency version](https://img.shields.io/npm/dependency-version/redux-saga-testable/peer/redux)
![npm peer dependency version](https://img.shields.io/npm/dependency-version/redux-saga-testable/peer/redux-saga)
[![Travis (.org)](https://img.shields.io/travis/jeromeludmann/redux-saga-testable)](https://travis-ci.org/jeromeludmann/redux-saga-testable)
[![Coveralls github](https://img.shields.io/coveralls/github/jeromeludmann/redux-saga-testable)](https://coveralls.io/github/jeromeludmann/redux-saga-testable)
[![npm](https://img.shields.io/npm/dt/redux-saga-testable)](https://www.npmjs.com/package/redux-saga-testable)
[![NPM](https://img.shields.io/npm/l/redux-saga-testable)](/LICENSE)

Make [redux-saga](https://github.com/redux-saga/redux-saga) more easily testable.

## Features

- Runs sagas without iterating manually
- Allows to map effects to values
- Provides built-in effect assertions
- Works with snapshot testing
- Supports TypeScript

## Contents

- [Overview](#overview)
- [Getting started](#getting-started)
- [Contribute](#contribute)
- [License](#license)

## Documentation

- [Tutorial][tutorial]
- [API][api]

## Overview

It's about [redux-saga](https://github.com/redux-saga/redux-saga) and unit tests.

When you write unit tests of sagas, you have to manually iterate on the generator and pass your next value for each yielded effect. The number of iterations you have to `next()` depends on the number of `yield` in the saga.

If a `yield` statement is added, removed or just swapped with another, there is a good chance that you pass your next value to an unexpected effect. This causes tests boring to write, not easy to understand and too prone to breaking.

Ideally, you should not have to worry about what the saga does behind. You would just like to map some effects to some values and assert that some arbitrary effects happened, in a clear and concise way.

**redux-saga-testable** could help you. It runs your sagas without the need to iterate on the generator yourself, allows you to map effects to values and provides the assertions you need.

## Getting started

### Install

Get it with npm:

```sh
npm i -D redux-saga-testable
```

or yarn:

```sh
yarn add -D redux-saga-testable
```

### Usage

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

This saga fetches a user and dispatches `FETCH_USER_SUCCESS`. Note that if the user already exists, it does nothing instead of calling `services.getUserById()`.

You would like to assert that this saga dispatches the action `FETCH_USER_SUCCESS` when the call to `services.getUserById()` returns a user:

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

  Asserts that the saga yields the effect `put({ type: 'FETCH_USER_SUCCESS', payload: user })`.

The test will pass if the runner can make the given assertions. Otherwise an error will be thrown and the test will fail.

**See the [tutorial][tutorial] for more advanced examples or see the [API documentation][api].**

## Contribute

Pull requests are welcome.

To make one, fork this repository, clone it to your local and run `npm install`. Do your changes. Once you are done, commit and push to your forked repository and make your pull request.

See current [issues](https://github.com/jeromeludmann/redux-saga-testable/issues) but feel free to bring what you need.

## License

MIT

[api]: /docs/api.md
[tutorial]: /docs/tutorial.md
