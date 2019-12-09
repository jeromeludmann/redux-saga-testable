import { call } from 'redux-saga/effects';
import { createRunner } from 'redux-saga-testable';
import { fn1, saga } from './helpers';

describe('output caching', () => {
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
