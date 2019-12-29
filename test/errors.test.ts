/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { call, Effect } from 'redux-saga/effects';
import {
  createRunner,
  throwError,
  Runner,
  ThrowError,
} from 'redux-saga-testable';
import { saga, fn1, fn2, UserError } from './helpers/mocks';
import { catchError, RUNNER_CALL_SITE, USER_CALL_SITE } from './helpers/errors';

describe('createRunner()', () => {
  test('"Missing saga argument"', () => {
    const error = catchError(() => (createRunner as () => Runner)());

    expect(error.message).toMatch('Missing saga argument');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });
});

describe('throwError()', () => {
  test('"Missing error argument"', () => {
    const error = catchError(() =>
      createRunner(saga).map(call(fn1), (throwError as () => ThrowError)()),
    );

    expect(error.message).toMatch('Missing error argument');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });
});

describe('runner.map()', () => {
  test('"Missing effect argument"', () => {
    const error = catchError(() =>
      (createRunner(saga) as Runner & { map: () => Runner }).map(),
    );

    expect(error.message).toMatch('Missing effect argument');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"The value to map is missing"', () => {
    const error = catchError(() =>
      (createRunner(saga) as Runner & {
        map: (effect: Effect) => Runner;
      }).map(call(fn1)),
    );

    expect(error.message).toMatch('The value to map is missing');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"Mapped values already provided for this effect"', () => {
    const error = catchError(() =>
      createRunner(saga)
        .map(call(fn1), 'result1')
        .map(call(fn1), 'result2'),
    );

    expect(error.message).toMatch(
      'Mapped values already provided for this effect',
    );
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });
});

describe('runner.catch()', () => {
  test('"Missing error pattern argument"', () => {
    const error = catchError(() =>
      (createRunner(saga) as Runner & { catch: () => Runner }).catch(),
    );

    expect(error.message).toMatch('Missing error pattern argument');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"Error pattern already provided"', () => {
    const error = catchError(() =>
      createRunner(saga)
        .catch(/^Saga/)
        .catch(/fails$/),
    );

    expect(error.message).toMatch('Error pattern already provided');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });
});

describe('runner.run()', () => {
  const sagaInError = function*() {
    yield call(fn1);
    throw new UserError('Failure');
  };

  const infiniteSaga = function*() {
    for (;;) yield call(fn1);
  };

  test('a user error', () => {
    const error = catchError(() => createRunner(sagaInError).run());

    expect(error.message).toMatch('Failure');
    expect(error.callSite).toMatch(USER_CALL_SITE);
  });

  test('a user error thrown by runner.should.yield()', () => {
    const error = catchError(() =>
      createRunner(sagaInError).should.yield(call(fn1)),
    );

    expect(error.message).toMatch('Failure');
    expect(error.callSite).toMatch(USER_CALL_SITE);
  });

  test('a user error thrown by runner.should.return()', () => {
    const error = catchError(() =>
      createRunner(sagaInError).should.return(true),
    );

    expect(error.message).toMatch('Failure');
    expect(error.callSite).toMatch(USER_CALL_SITE);
  });

  test('a user error thrown by runner.should.throw()', () => {
    const error = catchError(() =>
      createRunner(sagaInError).should.throw('Failure'),
    );

    expect(error.message).toMatch('Failure');
    expect(error.callSite).toMatch(USER_CALL_SITE);
  });

  test('a user error thrown by runner.should.call()', () => {
    const error = catchError(() => createRunner(sagaInError).should.call(fn1));

    expect(error.message).toMatch('Failure');
    expect(error.callSite).toMatch(USER_CALL_SITE);
  });

  test('"Too many yielded effects"', () => {
    const error = catchError(() => createRunner(infiniteSaga).run());

    expect(error.message).toMatch('Too many yielded effects');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"Too many yielded effects" thrown by runner.should.yield()', () => {
    const error = catchError(() =>
      createRunner(infiniteSaga).should.yield(call(fn1)),
    );

    expect(error.message).toMatch('Too many yielded effects');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"Too many yielded effects" thrown by runner.should.return()', () => {
    const error = catchError(() =>
      createRunner(infiniteSaga).should.return(true),
    );

    expect(error.message).toMatch('Too many yielded effects');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"Too many yielded effects" thrown by runner.should.throw()', () => {
    const error = catchError(() =>
      createRunner(infiniteSaga).should.throw('Failure'),
    );

    expect(error.message).toMatch('Too many yielded effects');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"Too many yielded effects" thrown by runner.should.call()', () => {
    const error = catchError(() => createRunner(infiniteSaga).should.call(fn1));

    expect(error.message).toMatch('Too many yielded effects');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"Unused mapped values"', () => {
    const error = catchError(() =>
      createRunner(saga)
        .map(call(fn2), 'unused value')
        .run(),
    );

    expect(error.message).toMatch('Unused mapped values');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"Unused mapped values" thrown by runner.should.yield()', () => {
    const error = catchError(() =>
      createRunner(sagaInError)
        .map(call(fn2), 'unused value')
        .should.yield(call(fn1)),
    );

    expect(error.message).toMatch('Unused mapped values');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"Unused mapped values" thrown by runner.should.return()', () => {
    const error = catchError(() =>
      createRunner(sagaInError)
        .map(call(fn2), 'unused value')
        .should.return(true),
    );

    expect(error.message).toMatch('Unused mapped values');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"Unused mapped values" thrown by runner.should.throw()', () => {
    const error = catchError(() =>
      createRunner(sagaInError)
        .map(call(fn2), 'unused value')
        .should.throw('Failure'),
    );

    expect(error.message).toMatch('Unused mapped values');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"Unused mapped values" thrown by runner.should.call()', () => {
    const error = catchError(() =>
      createRunner(sagaInError)
        .map(call(fn2), 'unused value')
        .should.call(fn1),
    );

    expect(error.message).toMatch('Unused mapped values');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"No error thrown by the saga"', () => {
    const error = catchError(() =>
      createRunner(saga)
        .catch(Error)
        .run(),
    );

    expect(error.message).toMatch('No error thrown by the saga');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"No error thrown by the saga" thrown by runner.should.yield()', () => {
    const error = catchError(() =>
      createRunner(saga)
        .catch(Error)
        .should.yield(call(fn1)),
    );

    expect(error.message).toMatch('No error thrown by the saga');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"No error thrown by the saga" thrown by runner.should.return()', () => {
    const error = catchError(() =>
      createRunner(saga)
        .catch(Error)
        .should.return(true),
    );

    expect(error.message).toMatch('No error thrown by the saga');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"No error thrown by the saga" thrown by runner.should.throw()', () => {
    const error = catchError(() =>
      createRunner(saga)
        .catch(Error)
        .should.throw('Failure'),
    );

    expect(error.message).toMatch('No error thrown by the saga');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"No error thrown by the saga" thrown by runner.should.call()', () => {
    const error = catchError(() =>
      createRunner(saga)
        .catch(Error)
        .should.call(fn1),
    );

    expect(error.message).toMatch('No error thrown by the saga');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });
});

describe('runner.should.yield()', () => {
  test('"Missing effect argument"', () => {
    const error = catchError(() =>
      (createRunner(saga) as Runner & {
        should: { yield: () => Runner };
      }).should.yield(),
    );

    expect(error.message).toMatch('Missing effect argument');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"Assertion failure"', () => {
    const error = catchError(() => createRunner(saga).should.yield(call(fn2)));

    expect(error.message).toMatch('Assertion failure');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"Assertion failure" thrown by runner.should.call()', () => {
    const error = catchError(() => createRunner(saga).should.call(fn2));

    expect(error.message).toMatch('Assertion failure');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });
});

describe('runner.should.return()', () => {
  test('"Missing value argument"', () => {
    const error = catchError(() =>
      (createRunner(saga) as Runner & {
        should: { return: () => Runner };
      }).should.return(),
    );

    expect(error.message).toMatch('Missing value argument');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"Assertion failure"', () => {
    const error = catchError(() => createRunner(saga).should.return('result2'));

    expect(error.message).toMatch('Assertion failure');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });
});

describe('runner.should.throw()', () => {
  test('"Missing error pattern argument"', () => {
    const error = catchError(() =>
      (createRunner(saga) as Runner & {
        should: { throw: () => Runner };
      }).should.throw(),
    );

    expect(error.message).toMatch('Missing error pattern argument');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });

  test('"Assertion failure"', () => {
    const error = catchError(() => createRunner(saga).should.throw(Error));

    expect(error.message).toMatch('Assertion failure');
    expect(error.callSite).toMatch(RUNNER_CALL_SITE);
  });
});
