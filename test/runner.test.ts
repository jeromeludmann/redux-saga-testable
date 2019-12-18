/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { put, call, fork } from 'redux-saga/effects';
import { createRunner } from 'redux-saga-testable';
import { fn1, fn2, fn3 } from './helpers';

describe('createRunner()', () => {
  test('creates a runner with a saga and its arguments', () => {
    const saga = function*() {
      yield put({ type: 'SUCCESS' });
    };

    const runner = createRunner(saga);

    expect(runner).toHaveProperty('map');
    expect(runner).toHaveProperty('should.yield');
    expect(runner).toHaveProperty('should.return');
    expect(runner).toHaveProperty('should.throw');
    expect(runner).toHaveProperty('catch');
    expect(runner).toHaveProperty('clone');
    expect(runner).toHaveProperty('run');
  });
});

describe('runner.clone()', () => {
  test('clones instances of a saga runner several times', () => {
    const saga = function*() {
      const result1 = yield call(fn1);
      const result2 = yield call(fn2);
      const result3 = yield call(fn3);

      if (result1) {
        yield fork(fn1);
      }

      if (result2) {
        yield fork(fn2);
      }

      if (result3) {
        yield fork(fn3);
      }

      yield put({ type: 'SUCCESS', payload: [result1, result2, result3] });
    };

    const runner = createRunner(saga);

    const runner1 = runner.clone();
    const runner2 = runner.clone();

    runner1.map(call(fn1), 'result1');
    runner1.should.yield(fork(fn1));
    runner1.should.not.yield(fork(fn2));
    runner1.should.not.yield(fork(fn3));

    runner2.map(call(fn2), 'result2');

    const runner3 = runner2.clone();

    runner2.should.not.yield(fork(fn1));
    runner2.should.yield(fork(fn2));
    runner2.should.not.yield(fork(fn3));

    runner3.map(call(fn3), 'result3');
    runner3.should.not.yield(fork(fn1));
    runner3.should.yield(fork(fn2));
    runner3.should.yield(fork(fn3));

    const output1 = runner1.run();
    const output2 = runner2.run();
    const output3 = runner3.run();

    expect(output1.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: ['result1', undefined, undefined] }),
    );
    expect(output2.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: [undefined, 'result2', undefined] }),
    );
    expect(output3.effects).toContainEqual(
      put({ type: 'SUCCESS', payload: [undefined, 'result2', 'result3'] }),
    );
  });
});
