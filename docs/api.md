# API

## Contents

- [`createRunner(saga [, ...args])`][createrunner]
- [`Runner`][runner]
  - [`runner.map(effect, value [, ...nextValues])`][runner.map]
  - [`runner.catch(error)`][runner.catch]
  - [`runner.clone()`][runner.clone]
  - [`runner.run()`][runner.run]
  - [`runner.should`][runner.should]
- [`throwError(error)`][throwerror]
- [`finalize()`][finalize]
- [`RunnerOutput`][runneroutput]
- [`Assertions`][assertions]
  - [`runner.should.yield(effect)`][runner.should.yield]
  - [`runner.should.return(value)`][runner.should.return]
  - [`runner.should.throw(error)`][runner.should.throw]
  - [`runner.should.not`][runner.should.not]
  - [`runner.should.call(fn)`, `runner.should.put(action)`,
    etc.][effectassertions]

## createRunner(saga [, ...args])

Creates a [`Runner`][runner].

Parameters:

- `saga: Function` - a saga to use with the runner
- `args?: any[]` - arguments to be passed to the saga

Returns a new [`Runner`][runner] instance.

Example:

```js
const runner = createRunner(fetchUser, fetchUserAction);
```

## Runner

The runner interface returned by [`createRunner()`][createrunner].

Properties:

- [`map: Function`][runner.map]
- [`catch: Function`][runner.catch]
- [`clone: Function`][runner.clone]
- [`run: Function`][runner.run]
- [`should: Assertions`][runner.should]

## runner.map(effect, value [, ...nextValues])

Maps an effect to a value.

Parameters:

- `effect: Effect` - an effect to match
- `value: any` - a value to assign
- `nextValues?: any[]` - next values to assign

Returns the current [`Runner`][runner].

Example:

```js
createRunner(fetchUser, fetchUserAction)
  .map(call(getUser), userId)
  .run();
```

See also the special values:

- [`throwError(error)`][throwerror]
- [`finalize()`][finalize]

## runner.catch(error)

Catches silently an error thrown by the saga.

Parameters:

- `error: ErrorPattern` - a pattern that matches the thrown error

  The `ErrorPattern` can be:

  - a sub `string`
  - a `RegExp`
  - an `Error` object
  - an `Error` class

Returns the current [`Runner`][runner].

Example:

```js
createRunner(fetchUser, fetchUserAction)
  .catch(/User not found/)
  .run();
```

## runner.clone()

Clones the current runner instance.

Returns a copy of the current [`Runner`][runner].

Example:

```js
const runnerWithCredentials = createRunner(fetchUser, fetchUserAction).map(
  select(getCredentials),
  credentials,
);

const runner1 = runnerWithCredentials.clone();

runner1
  .map(call(getUser), throwError(error))
  .should.select(getCredentials)
  .should.put({
    type: 'FETCH_USER_FAILURE',
    error: error.message,
  });

const runner2 = runnerWithCredentials.clone();

runner2
  .map(call(getUser), userId)
  .should.select(getCredentials)
  .should.put({
    type: 'FETCH_USER_SUCCESS',
    payload: { user },
  });
```

## runner.run()

Runs the saga.

Returns a [`RunnerOutput`][runneroutput].

Example:

```js
const output = createRunner(fetchUser, fetchUserAction).run();
```

## runner.should

Provides the [`Assertions`][assertions].

## throwError(error)

Throws an error from the saga when mapped as a value with
[`runner.map()`][runner.map].

Parameters:

- `error: Error` - an error to throw

Returns a `ThrowError` value.

Example:

```js
createRunner(fetchUser, fetchUserAction)
  .map(getUser, throwError(new Error('Unable to get user')))
  .run();
```

## finalize()

Finalizes the saga when mapped as a value with [`runner.map()`][runner.map].

Returns a `Finalize` value.

Example:

```js
createRunner(fetchUser, fetchUserAction)
  .map(getUser, finalize())
  .run();
```

## RunnerOutput

The runner output interface returned by [`runner.run()`][runner.run].

Properties:

- `effects: Effect[]` - the yielded effects
- `return?: any` - the return value
- `error?: Error` - the thrown error

## Assertions

The assertions interface provided by [`runner.should`][runner.should].

Properties:

- [`yield: Function`][runner.should.yield]
- [`return: Function`][runner.should.return]
- [`throw: Function`][runner.should.throw]
- [`not: Assertions`][runner.should.not]
- [`call: Function`, `put: Function`, ...][effectassertions]

All the [effect assertions][effectassertions] about redux-saga effect creators
are provided.

Since the assertions will run the saga, they should always be called **after**
[`runner.map()`][runner.map] or [`runner.catch()`][runner.catch].

## runner.should.yield(effect)

Asserts that the saga yields an effect.

Parameters:

- `effect: Effect` - an expected yielded effect

Returns the current [`Runner`][runner].

Example:

```js
createRunner(fetchUser, fetchUserAction).should.yield(
  put({
    type: 'FETCH_USER_SUCCESS',
    payload: { user },
  }),
);
```

See [effect assertions][effectassertions] for a more convenient use.

## runner.should.return(value)

Asserts that the saga returns a value.

Parameters:

- `value: any` - an expected return value

Returns the current [`Runner`][runner].

Example:

```js
createRunner(fetchUser, fetchUserAction).should.return(user);
```

## runner.should.throw(error)

Asserts that the saga throws an error.

Parameters:

- `error: ErrorPattern` - an error pattern that matches the expected thrown
  error

  The `ErrorPattern` can be:

  - a sub `string`
  - a `RegExp`
  - an `Error` object
  - an `Error` class

Returns the current [`Runner`][runner].

Example:

```js
createRunner(fetchUser, fetchUserAction)
  .catch(Error)
  .should.throw(/User not found/);
```

## runner.should.not

Negates the next [assertion][assertions].

Examples:

```js
createRunner(fetchUser, fetchUserAction).should.not.call(fetchProduct);
```

## (effect assertions)

Allows to make effect assertions like `runner.should.call(fn)`,
`runner.should.put(action)`, etc.

Same behavior as [`runner.should.yield(...)`][runner.should.yield] behind but in
a more concise way.

Examples:

```js
createRunner(fetchUser, fetchUserAction)
  .should.take('FETCH_USER')
  .should.select(getCredentials)
  .should.call(getUser, userId)
  .should.put({ type: 'FETCH_USER_SUCCESS' });
```

[createrunner]: #createrunnersaga--args
[runner]: #runner
[runner.map]: #runnermapeffect-value--nextvalues
[runner.catch]: #runnercatcherror
[runner.clone]: #runnerclone
[runner.run]: #runnerrun
[runner.should]: #runnershould
[throwerror]: #throwerrorerror
[finalize]: #finalize
[runneroutput]: #runneroutput
[assertions]: #assertions
[runner.should.yield]: #runnershouldyieldeffect
[runner.should.return]: #runnershouldreturnvalue
[runner.should.throw]: #runnershouldthrowerror
[runner.should.not]: #runnershouldnot
[effectassertions]: #effect-assertions
