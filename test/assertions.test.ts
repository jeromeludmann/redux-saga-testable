/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { createMockTask } from '@redux-saga/testing-utils';
import { channel, Task } from 'redux-saga';
import { createRunner, Runner } from 'redux-saga-testable';
import * as effects from 'redux-saga/effects';
import { fn1, fn2, fn3, UserError } from './helpers/mocks';

describe('runner.should.yield()', () => {
  const saga = function* () {
    yield effects.put({ type: 'SUCCESS', payload: 'result' });
  };

  test('asserts that the saga yields an effect', () => {
    createRunner(saga).should.yield(
      effects.put({ type: 'SUCCESS', payload: 'result' }),
    );
  });

  test('asserts that the saga does not yield an effect', () => {
    createRunner(saga).should.not.yield(effects.call(fn1));
  });

  test('does not assert that the saga yields an effect', () => {
    const runSaga = () => createRunner(saga).should.yield(effects.call(fn1));

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });

  test('does not assert that the saga does not yield an effect', () => {
    const runSaga = () =>
      createRunner(saga).should.not.yield(
        effects.put({ type: 'SUCCESS', payload: 'result' }),
      );

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });

  test('does not assert that the saga yields an effect without providing an effect', () => {
    const runSaga = () =>
      (createRunner(saga) as Runner & {
        should: { yield: () => Runner };
      }).should.yield();

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });
});

describe('runner.should.return()', () => {
  const saga = function* () {
    return 'result1';
  };

  test('asserts that the saga returns a value', () => {
    createRunner(saga).should.return('result1');
  });

  test('asserts that the saga does not return a value', () => {
    createRunner(saga).should.not.return('result2');
  });

  test('does not assert that the saga returns a value', () => {
    const runSaga = () => createRunner(saga).should.return('result2');

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });

  test('does not assert that the saga does not return a value', () => {
    const runSaga = () => createRunner(saga).should.not.return('result1');

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });

  test('does accept "0" as an argument', () => {
    const saga = function* () {
      return 0;
    };

    createRunner(saga).should.return(0);
  });

  test('does accept "undefined" as an argument', () => {
    const saga = function* () {
      return;
    };

    createRunner(saga).should.return(undefined);
  });

  test('does not assert that the saga returns an effect without providing a value', () => {
    const runSaga = () =>
      (createRunner(saga) as Runner & {
        should: { return: () => Runner };
      }).should.return();

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });
});

describe('runner.should.throw()', () => {
  const saga = function* () {
    yield effects.call(fn1);
    throw new UserError('Failure');
  };

  test('asserts that the saga throws an error', () => {
    createRunner(saga).catch(Error).should.throw('Failure');
  });

  test('asserts that the saga does not throw an error', () => {
    createRunner(saga).catch('Failure').should.not.throw('unthrown');
  });

  test('does not assert that the saga throws an error', () => {
    const runSaga = () =>
      createRunner(saga).catch('Failure').should.throw('unthrown');

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });

  test('does not assert that the saga does not throw an error', () => {
    const runSaga = () =>
      createRunner(saga).catch('Failure').should.not.throw('Failure');

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });

  test('does not assert that the saga throws an error that is not thrown', () => {
    const saga = function* () {
      yield effects.put({ type: 'SUCCESS' });
    };

    const runSaga = () => createRunner(saga).should.throw(Error);

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });

  test('does not assert that the saga throws an error without providing an error pattern', () => {
    const saga = function* () {
      throw new UserError('Failure');
    };

    const runSaga = () =>
      (createRunner(saga) as Runner & {
        should: { throw: () => Runner };
      }).should.throw();

    expect(runSaga).toThrowErrorMatchingSnapshot();
  });
});

describe('runner.should.not', () => {
  test('can negate many times', () => {
    const saga = function* (throws = false) {
      yield effects.call(fn1);
      if (throws) throw new Error('Failure');
      return 'END';
    };

    createRunner(saga)
      .should.yield(effects.call(fn1))
      .should.not.yield(effects.call(fn2))
      .should.yield(effects.call(fn1));

    createRunner(saga)
      .should.not.yield(effects.call(fn2))
      .should.yield(effects.call(fn1))
      .should.not.yield(effects.call(fn2));

    createRunner(saga)
      .should.return('END')
      .should.not.return('START')
      .should.return('END');

    createRunner(saga)
      .should.not.return('START')
      .should.return('END')
      .should.not.return('START');

    createRunner(saga, true)
      .catch(Error)
      .should.throw('Failure')
      .should.not.throw('Success')
      .should.throw('Failure');

    createRunner(saga, true)
      .catch(Error)
      .should.not.throw('Success')
      .should.throw('Failure')
      .should.not.throw('Success');
  });
});

describe('effect assertions', () => {
  test('runner.should.take()', () => {
    const saga = function* () {
      yield effects.take('FETCH_USER');
    };

    createRunner(saga)
      .should.take('FETCH_USER')
      .should.not.take('FETCH_PRODUCT');
  });

  test('runner.should.takeMaybe()', () => {
    const saga = function* () {
      yield effects.takeMaybe('FETCH_USER');
    };

    createRunner(saga)
      .should.takeMaybe('FETCH_USER')
      .should.not.takeMaybe('FETCH_PRODUCT');
  });

  test('runner.should.takeEvery()', () => {
    const saga = function* () {
      yield effects.takeEvery('FETCH_USER', fn1);
    };

    createRunner(saga)
      .should.takeEvery('FETCH_USER', fn1)
      .should.not.takeEvery('FETCH_USER', fn2);
  });

  test('runner.should.takeLatest()', () => {
    const saga = function* () {
      yield effects.takeLatest('FETCH_USER', fn1);
    };

    createRunner(saga)
      .should.takeLatest('FETCH_USER', fn1)
      .should.not.takeLatest('FETCH_USER', fn2);
  });

  test('runner.should.takeLeading()', () => {
    const saga = function* () {
      yield effects.takeLeading('FETCH_USER', fn1);
    };

    createRunner(saga)
      .should.takeLeading('FETCH_USER', fn1)
      .should.not.takeLeading('FETCH_PRODUCT', fn1);
  });

  test('runner.should.put()', () => {
    const saga = function* () {
      yield effects.put({ type: 'SUCCESS' });
    };

    createRunner(saga)
      .should.put({ type: 'SUCCESS' })
      .should.not.put({ type: 'FAILURE' });
  });

  test('runner.should.putResolve()', () => {
    const saga = function* () {
      yield effects.putResolve({ type: 'SUCCESS' });
    };

    createRunner(saga)
      .should.putResolve({ type: 'SUCCESS' })
      .should.not.putResolve({ type: 'FAILURE' });
  });

  test('runner.should.call()', () => {
    const saga = function* () {
      yield effects.call(fn1);
    };

    createRunner(saga).should.call(fn1).should.not.call(fn2);
  });

  test('runner.should.apply()', () => {
    const saga = function* () {
      yield effects.apply({ key: 'value' }, fn1, []);
    };

    createRunner(saga)
      .should.apply({ key: 'value' }, fn1, [])
      .should.not.apply({ key: 'value' }, fn2, []);
  });

  test('runner.should.cps()', () => {
    const saga = function* () {
      yield effects.cps(fn1);
    };

    createRunner(saga).should.cps(fn1).should.not.cps(fn2);
  });

  test('runner.should.fork()', () => {
    const saga = function* () {
      yield effects.fork(fn1);
    };

    createRunner(saga).should.fork(fn1).should.not.fork(fn2);
  });

  test('runner.should.spawn()', () => {
    const saga = function* () {
      yield effects.spawn(fn1);
    };

    createRunner(saga).should.spawn(fn1).should.not.spawn(fn2);
  });

  test('runner.should.join()', () => {
    const mockTask = createMockTask();

    const saga = function* () {
      const task: Task = yield effects.fork(fn1);
      yield effects.join(task);
    };

    createRunner(saga)
      .map(effects.fork(fn1), mockTask)
      .should.join(mockTask)
      .should.not.join(createMockTask());
  });

  test('runner.should.cancel()', () => {
    const mockTask = createMockTask();

    const saga = function* () {
      const task: Task = yield effects.fork(fn1);
      yield effects.cancel(task);
    };

    createRunner(saga)
      .map(effects.fork(fn1), mockTask)
      .should.cancel(mockTask)
      .should.not.cancel(createMockTask());
  });

  test('runner.should.select()', () => {
    const getUser = (state: any) => state.user;
    const getProduct = (state: any) => state.product;

    const saga = function* () {
      yield effects.select(getUser);
    };

    createRunner(saga).should.select(getUser).should.not.select(getProduct);
  });

  test('runner.should.actionChannel()', () => {
    const saga = function* () {
      yield effects.actionChannel('FETCH_USER');
    };

    createRunner(saga)
      .should.actionChannel('FETCH_USER')
      .should.not.actionChannel('FETCH_PRODUCT');
  });

  test('runner.should.flush()', () => {
    const chan = channel();

    const saga = function* () {
      yield effects.flush(chan);
    };

    createRunner(saga).should.flush(chan).should.not.flush(channel());
  });

  test('runner.should.cancelled()', () => {
    const saga = function* (shouldCancel: boolean) {
      if (shouldCancel) {
        yield effects.cancelled();
      }
    };

    createRunner(saga, true).should.cancelled();

    createRunner(saga, false).should.not.cancelled();
  });

  test('runner.should.setContext()', () => {
    const saga = function* () {
      yield effects.setContext({ key: 'user' });
    };

    createRunner(saga)
      .should.setContext({ key: 'user' })
      .should.not.setContext({ key: 'product' });
  });

  test('runner.should.getContext()', () => {
    const saga = function* () {
      yield effects.getContext('key');
    };

    createRunner(saga).should.getContext('key').should.not.getContext('name');
  });

  test('runner.should.delay()', () => {
    const saga = function* () {
      yield effects.delay(1000);
    };

    createRunner(saga).should.delay(1000).should.not.delay(3000);
  });

  test('runner.should.throttle()', () => {
    const saga = function* () {
      yield effects.throttle(1000, 'FETCH_USER', fn1);
    };

    createRunner(saga)
      .should.throttle(1000, 'FETCH_USER', fn1)
      .should.not.throttle(3000, 'FETCH_USER', fn1)
      .should.not.throttle(1000, 'FETCH_PRODUCT', fn1)
      .should.not.throttle(1000, 'FETCH_USER', fn2);
  });

  test('runner.should.debounce()', () => {
    const saga = function* () {
      yield effects.debounce(1000, 'FETCH_USER', fn1);
    };

    createRunner(saga)
      .should.debounce(1000, 'FETCH_USER', fn1)
      .should.not.debounce(3000, 'FETCH_USER', fn1)
      .should.not.debounce(1000, 'FETCH_PRODUCT', fn1)
      .should.not.debounce(1000, 'FETCH_USER', fn2);
  });

  test('runner.should.retry()', () => {
    const saga = function* () {
      yield effects.retry(3, 10, fn1);
    };

    createRunner(saga)
      .should.retry(3, 10, fn1)
      .should.not.retry(5, 10, fn1)
      .should.not.retry(3, 30, fn1)
      .should.not.retry(5, 10, fn2);
  });

  test('runner.should.all()', () => {
    const saga = function* () {
      yield effects.all([effects.call(fn1), effects.call(fn2)]);
    };

    createRunner(saga)
      .should.all([effects.call(fn1), effects.call(fn2)])
      .should.not.all([effects.call(fn1)])
      .should.not.all([effects.call(fn1), effects.call(fn2), effects.call(fn3)])
      .should.not.all([effects.call(fn2), effects.call(fn1)]);
  });

  test('runner.should.race()', () => {
    const saga = function* () {
      yield effects.race({
        response1: effects.call(fn1),
        response2: effects.call(fn2),
      });
    };

    createRunner(saga)
      .should.race({
        response1: effects.call(fn1),
        response2: effects.call(fn2),
      })
      .should.not.race({
        response1: effects.call(fn1),
      })
      .should.not.race({
        response1: effects.call(fn1),
        response2: effects.call(fn2),
        response3: effects.call(fn3),
      })
      .should.not.race({
        response1: effects.call(fn2),
        response2: effects.call(fn1),
      });
  });
});
