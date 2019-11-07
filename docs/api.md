# API

## Contents

- [`createRunner(saga [, ...args])`][createrunner]
- [`runner.map(effect, value [, ...nextValues])`][runner.map]
- [`runner.catch(error)`][runner.catch]
- [`runner.clone()`][runner.clone]
- [`runner.run()`][runner.run]
- [`runner.should.yield(effect)`][runner.should.yield]
- [`runner.should.return(value)`][runner.should.return]
- [`runner.should.throw(error)`][runner.should.throw]
- [`throwError(error)`][throwerror]
- [`finalize()`][finalize]
- [`SagaRunner`][sagarunner]
- [`SagaAssertions`][sagaassertions]
- [`SagaOutput`][sagaoutput]

## createRunner(saga [, ...args])

Creates a [`SagaRunner`][sagarunner].

Parameters:

- `saga: Function` - a saga to use with the runner
- `args?: any[]` - arguments to be passed to the saga

Returns a new [`SagaRunner`][sagarunner] instance.

Example:

```ts
const runner = createRunner(fetchUser, 'user_id');
```

## runner.map(effect, value [, ...nextValues])

Maps an effect to a value.

Parameters:

- `effect: Effect` - an effect to match
- `value: any` - a value to assign
- `nextValues?: any[]` - next values to assign

Returns the current [`SagaRunner`][sagarunner].

Example:

```ts
createRunner(fetchUser, 'user_id')
  .map(call(getUser, 'user_id'), { name: 'mock name' })
  .run();
```

See also [`throwError()`][throwerror] and [`finalize()`][finalize].

## runner.catch(error)

Catches silently an error thrown by the saga.

Parameters:

- `error: ErrorPattern` - a pattern that matches the thrown error

  The `ErrorPattern` can be:

  - a sub `string`
  - a `RegExp`
  - an `Error` object
  - an `Error` class

Returns the current [`SagaRunner`][sagarunner].

Example:

```ts
createRunner(fetchUser, 'unknown_id')
  .catch(/User not found/)
  .run();
```

## runner.clone()

Clones the current runner instance.

Returns a copy of the current [`SagaRunner`][sagarunner].

Example:

```ts
const runner1 = createRunner(fetchUser, 'user_id');
const runner2 = runner1.clone();

runner2.map(call(getUser), { name: 'mock name' });

runner1.should.put({
  type: 'FETCH_SUCCESS',
  payload: { user: undefined },
});

runner2.should.put({
  type: 'FETCH_SUCCESS',
  payload: { user: { name: 'mock name' } },
});
```

## runner.run()

Runs the saga.

Returns a [`SagaOutput`][sagaoutput].

Example:

```ts
const output = createRunner(fetchUser).run();
```

## runner.should.yield(effect)

Asserts that the saga yields an effect.

Parameters:

- `effect: Effect` - an expected yielded effect

Returns the current [`SagaRunner`][sagarunner].

Example:

```ts
createRunner(fetchUser, 'user_id').should.yield(
  put({
    type: 'FETCH_USER_SUCCESS',
    payload: { name: 'mock name' },
  }),
);
```

**Since v0.3, effect creator aliases are provided:**

```ts
createRunner(fetchUser, 'user_id').should.put({
  type: 'FETCH_USER_SUCCESS',
  payload: { name: 'mock name' },
});
```

## runner.should.return(value)

Asserts that the saga returns a value.

Parameters:

- `value: any` - an expected return value

Returns the current [`SagaRunner`][sagarunner].

Example:

```ts
createRunner(fetchUser, 'user_id').should.return({ name: 'mock name' });
```

## runner.should.throw(error)

Asserts that the saga throws an error.

Parameters:

- `error: ErrorPattern` - an error pattern that matches the expected thrown error

  The `ErrorPattern` can be:

  - a sub `string`
  - a `RegExp`
  - an `Error` object
  - an `Error` class

Returns the current [`SagaRunner`][sagarunner].

Example:

```ts
createRunner(fetchUser, 'unknown_id')
  .catch(Error)
  .should.throw(/User not found/);
```

## throwError(error)

Throws an error from the saga when mapped as a value.

Parameters:

- `error: Error` - an error to throw

Returns a `ThrowError` value.

Example:

```ts
createRunner(fetchUser)
  .map(getUser, throwError(new Error('Unable to get user')))
  .run();
```

## finalize()

Finalizes the saga when mapped as a value.

Returns a `Finalize` value.

Example:

```ts
createRunner(fetchUser)
  .map(getUser, finalize())
  .run();
```

## SagaRunner

The saga runner object returned by [`createRunner()`][createrunner].

Properties:

- [`map: Function`][runner.map]
- [`catch: Function`][runner.catch]
- [`clone: Function`][runner.clone]
- [`run: Function`][runner.run]
- [`should: SagaAssertions`][sagaassertions]

## SagaAssertions

The saga assertions object exposed by `runner.should`.

Properties:

- [`yield: Function`][runner.should.yield]
- [`return: Function`][runner.should.return]
- [`throw: Function`][runner.should.throw]

## SagaOutput

The saga output object returned by [`runner.run()`][runner.run].

Properties:

- `effects: Effect[]` - the yielded effects
- `return?: any` - the return value
- `error?: Error` - the thrown error

[createrunner]: #createrunnersaga--args
[runner.map]: #runnermapeffect-value--nextvalues
[runner.catch]: #runnercatcherror
[runner.clone]: #runnerclone
[runner.run]: #runnerrun
[runner.should.yield]: #runnershouldyieldeffect
[runner.should.return]: #runnershouldreturnvalue
[runner.should.throw]: #runnershouldthrowerror
[throwerror]: #throwerrorerror
[finalize]: #finalize
[sagarunner]: #sagarunner
[sagaassertions]: #sagaassertions
[sagaoutput]: #sagaoutput
