/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  createRunner,
  finalize,
  Runner,
  throwError,
  ThrowError,
} from 'redux-saga-testable';
import { call, Effect, put } from 'redux-saga/effects';
import { fn1, fn2, fn3, UserError } from './helpers/mocks';

describe('runner.run()', () => {
  test('runs a saga that yields effects', () => {
    const saga = function* () {
      yield call(fn1);
      yield put({ type: 'SUCCESS' });
    };

    const output = createRunner(saga).run();

    expect(output.effects).toEqual([call(fn1), put({ type: 'SUCCESS' })]);
  });

  test('runs a saga that returns a value', () => {
    const saga = function* () {
      yield call(fn1);
      return 'return value';
    };

    const output = createRunner(saga).run();

    expect(output.return).toEqual('return value');
  });

  test('runs a saga that yields expressions that are not effects', () => {
    const saga = function* () {
      const result = yield { message: 'not an effect' };
      yield put({ type: 'SUCCESS', payload: result });
    };

    const output = createRunner(saga).run();

    expect(output.effects).toEqual([
      put({ type: 'SUCCESS', payload: { message: 'not an effect' } }),
    ]);
    expect(output.effects).not.toContainEqual(({
      message: 'not an effect',
    } as unknown) as Effect);
  });

  test('runs a saga twice from the same shared instance', () => {
    const saga = function* () {
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
    const saga = function* () {
      yield call(fn1);
      throw new UserError('Failure');
    };

    const runSaga = () => createRunner(saga).run();

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });

  test('does not run a saga that throws an object', () => {
    const saga = function* () {
      yield call(fn1);
      throw { message: 'Failure' };
    };

    const runSaga = () => createRunner(saga).run();

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });

  test('does not run a saga that throws a string', () => {
    const saga = function* () {
      yield call(fn1);
      throw 'Failure';
    };

    const runSaga = () => createRunner(saga).run();

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });

  test('does not run a saga that yields an infinity of effects', () => {
    const saga = function* () {
      for (;;) yield put({ type: 'SUCCESS' });
    };

    const runSaga = () => createRunner(saga).run();

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });
});

describe('runner.map()', () => {
  test('maps an effect to a value', () => {
    const saga = function* () {
      const result = yield call(fn1);
      yield put({ type: 'SUCCESS', payload: result });
    };

    const output = createRunner(saga).map(call(fn1), 'result').run();

    expect(output.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: 'result' }),
    );
  });

  test('maps an effect to undefined', () => {
    const saga = function* () {
      const result = yield call(fn1);
      yield put({ type: 'SUCCESS', payload: result });
    };

    const output = createRunner(saga).map(call(fn1), undefined).run();

    expect(output.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: undefined }),
    );
  });

  test('maps an effect to throwError()', () => {
    const saga = function* () {
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
    const saga = function* () {
      yield call(fn1);
    };

    const runSaga = () =>
      createRunner(saga)
        .map(call(fn1), (throwError as () => ThrowError)())
        .run();

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });

  test('maps an effect to finalize()', () => {
    const saga = function* () {
      let result = undefined;
      try {
        result = yield call(fn1);
        yield put({ type: 'SUCCESS' });
      } finally {
        yield put({ type: 'END', result });
      }
    };

    const output = createRunner(saga).map(call(fn1), finalize()).run();

    expect(output.effects).toEqual([call(fn1), put({ type: 'END' })]);
  });

  test('maps an effect to finalize() with a value', () => {
    const saga = function* () {
      let result = undefined;
      try {
        result = yield call(fn1);
        yield put({ type: 'SUCCESS' });
      } finally {
        yield put({ type: 'END', result });
      }
    };

    const output = createRunner(saga).map(call(fn1), finalize('result')).run();

    expect(output.effects).toEqual([
      call(fn1),
      put({ type: 'END', result: 'result' }),
    ]);
  });

  test('maps an effect to several values', () => {
    const saga = function* () {
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
    const saga = function* () {
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
    const saga = function* () {
      const result1 = yield call(fn1);
      yield put({ type: 'SUCCESS', payload: result1 });
    };

    const output = createRunner(saga).map(call(fn1), null).run();

    expect(output.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: null }),
    );
  });

  test('does not map an unyielded effect to a value', () => {
    const saga = function* () {
      yield put({ type: 'SUCCESS' });
    };

    const runSaga = () => createRunner(saga).map(call(fn1), 'result').run();

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });

  test('does not map an effect several times', () => {
    const saga = function* () {
      const result = call(fn1);
      yield put({ type: 'SUCCESS', payload: result });
    };

    const runSaga = () =>
      createRunner(saga)
        .map(call(fn1), 'result1')
        .map(call(fn1), 'result2')
        .run();

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });

  test('does not map an effect to too many values', () => {
    const saga = function* () {
      const result = yield call(fn1);
      yield put({ type: 'SUCCESS', payload: result });
    };

    const runSaga = () =>
      createRunner(saga).map(call(fn1), 'result', 'unused result').run();

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });

  test('does not map an effect without providing a value', () => {
    const saga = function* () {
      const result = yield call(fn1);
      yield put({ type: 'SUCCESS', payload: result });
    };

    const runSaga = () =>
      (createRunner(saga) as Runner & {
        map: (effect: Effect) => Runner;
      })
        .map(call(fn1))
        .run();

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });

  test('does not map an effect without providing an effect as an argument', () => {
    const saga = function* () {
      const result = call(fn1);
      yield put({ type: 'SUCCESS', payload: result });
    };

    const runSaga = () =>
      (createRunner(saga) as Runner & { map: () => Runner }).map().run();

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });
});

describe('runner.catch()', () => {
  test('catches an error that includes the given string', () => {
    const saga = function* () {
      yield call(fn1);
      throw new UserError('Failure');
    };

    const output = createRunner(saga).catch('Failure').run();

    expect(output.error).toEqual(new UserError('Failure'));
  });

  test('catches an error that matches the given regular expression', () => {
    const saga = function* () {
      yield call(fn1);
      throw new UserError('Failure');
    };

    const output = createRunner(saga)
      .catch(/^Failure$/)
      .run();

    expect(output.error).toEqual(new UserError('Failure'));
  });

  test('catches an error that is equal to the error object', () => {
    const saga = function* () {
      yield call(fn1);
      throw new UserError('Failure');
    };

    const output = createRunner(saga).catch(new UserError('Failure')).run();

    expect(output.error).toEqual(new UserError('Failure'));
  });

  test('catches an error that is instance of the error class', () => {
    const saga = function* () {
      yield call(fn1);
      throw new TypeError('Failure');
    };

    const output = createRunner(saga).catch(TypeError).run();

    expect(output.error).toEqual(new TypeError('Failure'));
  });

  test('catches an error that inherits from the error class', () => {
    const saga = function* () {
      yield call(fn1);
      throw new TypeError('Failure');
    };

    const output = createRunner(saga).catch(Error).run();

    expect(output.error).toEqual(new TypeError('Failure'));
  });

  test('catches a thrown object that has a "message" property', () => {
    const saga = function* () {
      yield call(fn1);
      throw { message: 'Failure' };
    };

    const output = createRunner(saga).catch('Failure').run();

    expect(output.error).toEqual({ message: 'Failure' });
  });

  test('catches a thrown string', () => {
    const saga = function* () {
      yield call(fn1);
      throw 'Failure';
    };

    const output = createRunner(saga).catch('Failure').run();

    expect(output.error).toEqual('Failure');
  });

  test('does not catch an error that does not match the error pattern', () => {
    const saga = function* () {
      yield call(fn1);
      throw new UserError('Failure');
    };

    const runSaga = () =>
      createRunner(saga).catch('unthrown error message').run();

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });

  test('does not catch a thrown object that does not have "message" property', () => {
    const saga = function* () {
      yield call(fn1);
      throw { someKey: 'value of an uncatchable object' };
    };

    const runSaga = () =>
      createRunner(saga).catch('value of an uncatchable object').run();

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });

  test('does not catch errors several times', () => {
    const saga = function* () {
      yield call(fn1);
      throw new UserError('Failure');
    };

    const runSaga = () =>
      createRunner(saga)
        .catch(/^Saga/)
        .catch(/fails$/)
        .run();

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });

  test('does not catch without providing an error pattern', () => {
    const saga = function* () {
      yield call(fn1);
      throw new UserError('Failure');
    };

    const runSaga = () =>
      (createRunner(saga) as Runner & { catch: () => Runner }).catch().run();

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });

  test('does not catch an error that is not thrown', () => {
    const saga = function* () {
      yield call(fn1);
    };

    const runSaga = () => createRunner(saga).catch(Error).run();

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });
});
