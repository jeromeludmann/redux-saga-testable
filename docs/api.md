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
- `value: any` - a value to assign
- `nextValues?: any[]` - next values to assign

Returns the current [`SagaRunner`](#sagarunner).

```ts
createRunner(fetchUser, 'user_id')
  .map(call(getUser, 'user_id'), { name: 'mock name' })
  .run()
```

See also:

- [`throwError(error)`](#throwerrorerror)
- [`finalize()`](#finalize)

### `runner.catch(error)`

Catches silently an error thrown by the saga.

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
const runner1 = createRunner(fetchUser, 'user_id')
const runner2 = runner1.clone()

runner2.map(call(getUser), { name: 'mock name' })

runner1.should.put({
  type: 'FETCH_SUCCESS',
  payload: { user: undefined },
})

runner2.should.put({
  type: 'FETCH_SUCCESS',
  payload: { user: { name: 'mock name' } },
})
```

### `runner.run()`

Runs the saga.

Returns a [`SagaOutput`](#sagaoutput).

```ts
const output = createRunner(fetchUser).run()
```

### `runner.should.yield(effect)`

Asserts that the saga yields an effect.

- `effect: Effect` - an expected yielded effect

Returns the current [`SagaRunner`](#sagarunner).

```ts
createRunner(fetchUser, 'user_id').should.yield(
  put({
    type: 'FETCH_USER_SUCCESS',
    payload: { name: 'mock name' },
  }),
)
```

**Since v0.3, you can use effect creator aliases:**

```ts
createRunner(fetchUser, 'user_id').should.put({
  type: 'FETCH_USER_SUCCESS',
  payload: { name: 'mock name' },
})
```

### `runner.should.return(value)`

Asserts that the saga returns a value.

- `value: any` - an expected return value

Returns the current [`SagaRunner`](#sagarunner).

```ts
createRunner(fetchUser, 'user_id').should.return({ name: 'mock name' })
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
  .catch(Error)
  .should.throw(/User not found/)
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
- [`catch: Function`](#runnercatcherror)
- [`clone: Function`](#runnerclone)
- [`run: Function`](#runnerrun)
- [`should: SagaAssertions`](#sagaassertions)

### `SagaAssertions`

The saga assertions object exposed by `runner.should`.

- [`yield: Function`](#runnershouldyieldeffect)
- [`return: Function`](#runnershouldreturnvalue)
- [`throw: Function`](#runnershouldthrowerror)

### `SagaOutput`

The saga output object returned by [`runner.run()`](#runnerrun).

- `effects: Effect[]` - the yielded effects
- `return?: any` - the return value
- `error?: Error` - the thrown error
