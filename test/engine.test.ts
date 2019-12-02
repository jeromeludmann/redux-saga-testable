import { Effect, put, call } from 'redux-saga/effects';
import {
  createRunner,
  throwError,
  finalize,
  Runner,
  ThrowError,
} from 'redux-saga-testable';
import {
  runAndCatch,
  RUNNER_CALL_SITE,
  USER_CALL_SITE,
  UserError,
  fn1,
  fn2,
  fn3,
} from './helpers';

describe('runner.run()', () => {
  test('runs a saga that yields effects', () => {
    const saga = function*() {
      yield call(fn1);
      yield put({ type: 'SUCCESS' });
    };

    const output = createRunner(saga).run();

    expect(output.effects).toEqual([call(fn1), put({ type: 'SUCCESS' })]);
  });

  test('runs a saga that returns a value', () => {
    const saga = function*() {
      yield call(() => {});
      return 'return value';
    };

    const output = createRunner(saga).run();

    expect(output.return).toEqual('return value');
  });

  test('runs a saga that yields expressions that are not effects', () => {
    const saga = function*() {
      const result = yield { message: 'not an effect' };
      yield put({ type: 'SUCCESS', payload: result });
    };

    const output = createRunner(saga).run();

    expect(output.effects).toEqual([
      put({ type: 'SUCCESS', payload: { message: 'not an effect' } }),
    ]);
    expect(output.effects).not.toContainEqual({ message: 'not an effect' });
  });

  test('runs a saga twice from the same shared instance', () => {
    const saga = function*() {
      const result1 = yield call(fn1);
      const result2 = yield call(fn2);
      yield put({ type: 'SUCCESS', payload: [result1, result2] });
    };

    const runner = createRunner(saga).map(call(fn1), 'result1');
    const output1 = runner.run();
    const output2 = runner.map(call(fn2), 'result2').run();

    expect(output1.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: ['result1', undefined] }),
    );
    expect(output2.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: ['result1', 'result2'] }),
    );
  });

  test('does not run a saga that throws an error', () => {
    const saga = function*() {
      yield call(fn1);
      throw new UserError('Failure');
    };

    const error = runAndCatch(() => createRunner(saga).run());

    expect(error.message).toMatch('Failure');
    expect(error.callSite).toMatch(USER_CALL_SITE);
  });

  test('does not run a saga that throws an object', () => {
    const saga = function*() {
      yield call(fn1);
      throw { message: 'Failure' };
    };

    const runSaga = () => createRunner(saga).run();

    expect(runSaga).toThrow('Failure');
  });

  test('does not run a saga that throws a string', () => {
    const saga = function*() {
      yield call(fn1);
      throw 'Failure';
    };

    const runSaga = () => createRunner(saga).run();

    expect(runSaga).toThrow('Failure');
  });

  test('does not run a saga that yields an infinity of effects', () => {
    const saga = function*() {
      for (;;) yield put({ type: 'SUCCESS' });
    };

    const error = runAndCatch(() => createRunner(saga).run());

    expect(error.message).toMatch('Too many yielded effects');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });
});

describe('runner.map()', () => {
  test('maps an effect to a value', () => {
    const saga = function*() {
      const result = yield call(fn1);
      yield put({ type: 'SUCCESS', payload: result });
    };

    const output = createRunner(saga)
      .map(call(fn1), 'result')
      .run();

    expect(output.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: 'result' }),
    );
  });

  test('maps an effect to undefined', () => {
    const saga = function*() {
      const result = yield call(fn1);
      yield put({ type: 'SUCCESS', payload: result });
    };

    const output = createRunner(saga)
      .map(call(fn1), undefined)
      .run();

    expect(output.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: undefined }),
    );
  });

  test('maps an effect to throwError()', () => {
    const saga = function*() {
      try {
        const result = yield call(fn1);
        yield put({ type: 'SUCCESS', payload: result });
      } catch (error) {
        yield put({ type: 'FAILURE', payload: error.message });
      }
    };

    const output = createRunner(saga)
      .map(call(fn1), throwError(new UserError('Failure')))
      .run();

    expect(output.effects).toContainEqual(
      put({ type: 'FAILURE', payload: 'Failure' }),
    );
  });

  test('does not map an effect to throwError() without providing an error argument', () => {
    const saga = function*() {
      yield call(fn1);
    };

    const error = runAndCatch(() =>
      createRunner(saga)
        .map(call(fn1), (throwError as () => ThrowError)())
        .run(),
    );

    expect(error.message).toMatch('Missing error argument');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('maps an effect to finalize()', () => {
    const saga = function*() {
      try {
        yield call(fn1);
        yield put({ type: 'SUCCESS' });
      } finally {
        yield put({ type: 'END' });
      }
    };

    const output = createRunner(saga)
      .map(call(fn1), finalize())
      .run();

    expect(output.effects).toEqual([call(fn1), put({ type: 'END' })]);
  });

  test('maps an effect to several values', () => {
    const saga = function*() {
      const result1 = yield call(fn1);
      const result2 = yield call(fn1);
      const result3 = yield call(fn1);
      yield put({ type: 'SUCCESS', payload: [result1, result2, result3] });
    };

    const output = createRunner(saga)
      .map(call(fn1), 'result1', 'result2', 'result3')
      .run();

    expect(output.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: ['result1', 'result2', 'result3'] }),
    );
  });

  test('maps several effects to several values', () => {
    const saga = function*() {
      const result1 = yield call(fn1);
      const result2 = yield call(fn2);
      const result3 = yield call(fn3);
      yield put({ type: 'SUCCESS', payload: [result1, result2, result3] });
    };

    const output = createRunner(saga)
      .map(call(fn1), 'result1')
      .map(call(fn2), 'result2')
      .map(call(fn3), 'result3')
      .run();

    expect(output.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: ['result1', 'result2', 'result3'] }),
    );
  });

  test('maps an effect to a "null" value', () => {
    const saga = function*() {
      const result1 = yield call(fn1);
      yield put({ type: 'SUCCESS', payload: result1 });
    };

    const output = createRunner(saga)
      .map(call(fn1), null)
      .run();

    expect(output.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: null }),
    );
  });

  test('does not map an unyielded effect to a value', () => {
    const saga = function*() {
      yield put({ type: 'SUCCESS' });
    };

    const error = runAndCatch(() =>
      createRunner(saga)
        .map(call(fn1), 'result')
        .run(),
    );

    expect(error.message).toMatch('Unused mapped values');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('does not map an effect several times', () => {
    const saga = function*() {
      const result = call(fn1);
      yield put({ type: 'SUCCESS', payload: result });
    };

    const error = runAndCatch(() =>
      createRunner(saga)
        .map(call(fn1), 'result1')
        .map(call(fn1), 'result2')
        .run(),
    );

    expect(error.message).toMatch(
      'Mapped values already provided for this effect',
    );
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('does not map an effect to too many values', () => {
    const saga = function*() {
      const result = yield call(fn1);
      yield put({ type: 'SUCCESS', payload: result });
    };

    const error = runAndCatch(() =>
      createRunner(saga)
        .map(call(fn1), 'result', 'unused result')
        .run(),
    );

    expect(error.message).toMatch('Unused mapped values');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('does not map an effect without providing a value', () => {
    const saga = function*() {
      const result = yield call(fn1);
      yield put({ type: 'SUCCESS', payload: result });
    };

    const error = runAndCatch(() =>
      (createRunner(saga) as Runner & {
        map: (effect: Effect) => Runner;
      })
        .map(call(fn1))
        .run(),
    );

    expect(error.message).toMatch('The value to map is missing');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('does not map an effect without providing an effect as an argument', () => {
    const saga = function*() {
      const result = call(fn1);
      yield put({ type: 'SUCCESS', payload: result });
    };

    const error = runAndCatch(() =>
      (createRunner(saga) as Runner & { map: () => Runner }).map().run(),
    );

    expect(error.message).toMatch('Missing effect argument');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });
});

describe('runner.catch()', () => {
  test('catches an error that includes the given string', () => {
    const saga = function*() {
      yield call(fn1);
      throw new UserError('Failure');
    };

    const output = createRunner(saga)
      .catch('Failure')
      .run();

    expect(output.error).toEqual(new UserError('Failure'));
  });

  test('catches an error that matches the given regular expression', () => {
    const saga = function*() {
      yield call(fn1);
      throw new UserError('Failure');
    };

    const output = createRunner(saga)
      .catch(/^Failure$/)
      .run();

    expect(output.error).toEqual(new UserError('Failure'));
  });

  test('catches an error that is equal to the error object', () => {
    const saga = function*() {
      yield call(fn1);
      throw new UserError('Failure');
    };

    const output = createRunner(saga)
      .catch(new UserError('Failure'))
      .run();

    expect(output.error).toEqual(new UserError('Failure'));
  });

  test('catches an error that is instance of the error class', () => {
    const saga = function*() {
      yield call(fn1);
      throw new TypeError('Failure');
    };

    const output = createRunner(saga)
      .catch(TypeError)
      .run();

    expect(output.error).toEqual(new TypeError('Failure'));
  });

  test('catches an error that inherits from the error class', () => {
    const saga = function*() {
      yield call(fn1);
      throw new TypeError('Failure');
    };

    const output = createRunner(saga)
      .catch(Error)
      .run();

    expect(output.error).toEqual(new TypeError('Failure'));
  });

  test('catches a thrown object that has a "message" property', () => {
    const saga = function*() {
      yield call(fn1);
      throw { message: 'Failure' };
    };

    const output = createRunner(saga)
      .catch('Failure')
      .run();

    expect(output.error).toEqual({ message: 'Failure' });
  });

  test('catches a thrown string', () => {
    const saga = function*() {
      yield call(fn1);
      throw 'Failure';
    };

    const output = createRunner(saga)
      .catch('Failure')
      .run();

    expect(output.error).toEqual('Failure');
  });

  test('does not catch an error that does not match the error pattern', () => {
    const saga = function*() {
      yield call(fn1);
      throw new UserError('Failure');
    };

    const error = runAndCatch(() =>
      createRunner(saga)
        .catch('unthrown error message')
        .run(),
    );

    expect(error.message).toMatch('Failure');
    expect(error.callSite).toMatch(USER_CALL_SITE);
  });

  test('does not catch a thrown object that does not have "message" property', () => {
    const saga = function*() {
      yield call(fn1);
      throw { someKey: 'value of an uncatchable object' };
    };

    const runSaga = () =>
      createRunner(saga)
        .catch('value of an uncatchable object')
        .run();

    expect(runSaga).toThrow();
  });

  test('does not catch errors several times', () => {
    const saga = function*() {
      yield call(fn1);
      throw new UserError('Failure');
    };

    const error = runAndCatch(() =>
      createRunner(saga)
        .catch(/^Saga/)
        .catch(/fails$/)
        .run(),
    );

    expect(error.message).toMatch('Error pattern already provided');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('does not catch without providing an error pattern', () => {
    const saga = function*() {
      yield call(fn1);
      throw new UserError('Failure');
    };

    const error = runAndCatch(() =>
      (createRunner(saga) as Runner & { catch: () => Runner }).catch().run(),
    );

    expect(error.message).toMatch('Missing error pattern argument');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('does not catch an error that is not thrown', () => {
    const saga = function*() {
      yield call(fn1);
    };

    const error = runAndCatch(() =>
      createRunner(saga)
        .catch(Error)
        .run(),
    );

    expect(error.message).toMatch('No error thrown by the saga');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });
});

describe('output caching', () => {
  const saga = function*() {
    yield call(fn1);
  };

  let runner: any;

  beforeEach(() => {
    runner = createRunner(saga);
  });

  test('createRunner() begins without a cached output', () => {
    expect(runner.cachedOutput).toEqual(null);
  });

  test('runner.run() produces a cached output', () => {
    runner.run();

    expect(runner.cachedOutput).not.toEqual(null);
  });

  test('runner.map() resets the cached output', () => {
    runner.run();
    runner.map(call(fn1), 'result');

    expect(runner.cachedOutput).toEqual(null);
  });

  test('runner.catch() resets the cached output', () => {
    runner.run();
    runner.catch(Error);

    expect(runner.cachedOutput).toEqual(null);
  });

  test('runner.run() runs the saga', () => {
    const runSaga = jest.spyOn(runner, 'saga');
    runner.run();

    expect(runSaga).toHaveBeenCalled();
  });

  test('runner.run() reuses the cached output', () => {
    runner.run();
    const runSaga = jest.spyOn(runner, 'saga');
    runner.run();

    expect(runSaga).not.toHaveBeenCalled();
  });
});
