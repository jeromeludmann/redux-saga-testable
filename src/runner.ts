import { isDeepStrictEqual } from 'util';
import { Effect } from '@redux-saga/types';
import { stringify } from './stringify';
import { getExtendedSagaAssertions } from './aliases';
import {
  matchError,
  next,
  isEffect,
  createAssert,
  RunnerError,
  defineCallSite,
} from './utils';
import {
  SagaRunner,
  SagaRunnerState,
  ErrorPattern,
  SagaOutput,
} from './types/runner';

export const _createRunner = (state: SagaRunnerState): SagaRunner => {
  let negated = false;
  const isNegated = () => negated;
  const runner: any = {};

  runner.map = _map(runner, state);
  runner.mock = runner.map; // alias: could be removed later
  runner.catch = _catch(runner, state);
  runner.clone = _clone(state);
  runner.run = _run(runner, state);

  // creates the assertions interface
  runner.should = {
    yield: _yield(runner, state, isNegated),
    return: _return(runner, state, isNegated),
    throw: _throw(runner, state, isNegated),
    ...getExtendedSagaAssertions(runner, state, isNegated, _yield),
  };

  // negates the next assertion
  runner.should.not = runner.should;
  runner.should = new Proxy(runner.should, {
    get(target: any, key: string) {
      negated = key === 'not';
      return target[key];
    },
  });

  return runner;
};

export const _map = (runner: SagaRunner, state: SagaRunnerState) => (
  effect: Effect,
  ...values: any[]
): SagaRunner => {
  try {
    if (!effect) {
      throw new RunnerError('Missing effect argument');
    }

    if (values.length === 0) {
      throw new RunnerError(
        `The value to map is missing\n\nGiven effect:\n\n${stringify(effect)}`,
      );
    }

    const existingMapping = state.environment.find(mapping =>
      isDeepStrictEqual(mapping.effect, effect),
    );

    if (existingMapping) {
      throw new RunnerError(
        'Mapped values already provided for this effect\n\n' +
          `Given effect:\n\n${stringify(effect)}\n\n` +
          `Existing mapped values:\n\n${stringify(existingMapping.values)}`,
      );
    }

    state.environment.push({ effect, values });
    state.output = undefined;

    return runner;
  } catch (error) {
    defineCallSite(error, runner.map);
    throw error;
  }
};

export const _catch = (runner: SagaRunner, state: SagaRunnerState) => (
  pattern: ErrorPattern,
) => {
  try {
    if (!pattern) {
      throw new RunnerError('Missing error pattern argument');
    }

    if (state.catchingError) {
      throw new RunnerError(
        'Error pattern already provided\n\n' +
          `Given error pattern:\n\n${stringify(state.catchingError)}`,
      );
    }

    state.catchingError = pattern;
    state.output = undefined;

    return runner;
  } catch (error) {
    defineCallSite(error, runner.catch);
    throw error;
  }
};

export const _yield = (
  runner: SagaRunner,
  state: SagaRunnerState,
  isNegated: () => boolean,
) => (effect: Effect): SagaRunner => {
  try {
    if (!effect) {
      throw new RunnerError('Missing effect argument');
    }

    const output = _run(runner, state)();

    const assert = createAssert(
      output => output.effects.some(e => isDeepStrictEqual(e, effect)),
      isNegated(),
    );

    if (!assert(output)) {
      throw new RunnerError(
        'Assertion failure\n\n' +
          `Expected effect:\n\n${stringify(effect)}\n\n` +
          `Received effects:\n\n${stringify(output.effects)}`,
      );
    }

    return runner;
  } catch (error) {
    defineCallSite(error, runner.should.yield);
    throw error;
  }
};

export const _return = (
  runner: SagaRunner,
  state: SagaRunnerState,
  isNegated: () => boolean,
) => (value: any): SagaRunner => {
  try {
    const output = _run(runner, state)();

    const assert = createAssert(
      output => isDeepStrictEqual(output.return, value),
      isNegated(),
    );

    if (!assert(output)) {
      throw new RunnerError(
        'Assertion failure\n\n' +
          `Expected return value:\n\n${stringify(value)}\n\n` +
          `Received return value:\n\n${stringify(output.return)}`,
      );
    }

    return runner;
  } catch (error) {
    defineCallSite(error, runner.should.return);
    throw error;
  }
};

export const _throw = (
  runner: SagaRunner,
  state: SagaRunnerState,
  isNegated: () => boolean,
) => (pattern: ErrorPattern): SagaRunner => {
  try {
    if (!pattern) {
      throw new RunnerError('Missing error pattern argument');
    }

    const output = _run(runner, state)();

    const assert = createAssert(
      output => !!output.error && matchError(output.error, pattern),
      isNegated(),
    );

    if (!assert(output)) {
      throw new RunnerError(
        'Assertion failure\n\n' +
          `Expected error pattern:\n\n${stringify(pattern)}\n\n` +
          `Received thrown error:\n\n${stringify(output.error)}`,
      );
    }

    return runner;
  } catch (error) {
    defineCallSite(error, runner.should.throw);
    throw error;
  }
};

export const _clone = (state: SagaRunnerState) => (): SagaRunner => {
  return _createRunner({
    ...state,
    environment: [...state.environment],
  });
};

export const _run = (
  runner: SagaRunner,
  state: SagaRunnerState,
) => (): SagaOutput => {
  try {
    if (state.output !== undefined) {
      return state.output;
    }

    state.output = { effects: [] };

    const iterator = state.saga(...state.arguments);
    let sagaStep: IteratorResult<any>;
    let nextValue = undefined;

    // prevents mapping mutation
    const environment = state.environment.map(mapping => ({
      ...mapping,
      values: Array.from(mapping.values),
    }));

    for (;;) {
      try {
        sagaStep = next(iterator, nextValue);
      } catch (sagaError) {
        state.output.error = sagaError;
        break;
      }

      if (sagaStep.done) {
        state.output.return = sagaStep.value;
        break;
      }

      if (!isEffect(sagaStep.value)) {
        nextValue = sagaStep.value;
        continue;
      }

      if (state.output.effects.length > 100) {
        throw new RunnerError('Maximum yielded effects size reached');
      }

      state.output.effects.push(sagaStep.value);

      // injects the mapped value to the next iteration
      const mapping = environment.find(mapping =>
        isDeepStrictEqual(mapping.effect, sagaStep.value),
      );
      nextValue = mapping ? mapping.values.shift() : undefined;
    }

    // checks for unused mapped values
    const unusedMapping = environment.find(
      mapping => mapping.values.length > 0,
    );
    if (unusedMapping) {
      throw new RunnerError(
        'Unused mapped values\n\n' +
          `Given effect:\n\n${stringify(unusedMapping.effect)}\n\n` +
          `Unused mapped values:\n\n${stringify(unusedMapping.values)}`,
      );
    }

    // re-throws saga error if needed
    if (state.output.error) {
      if (
        !state.catchingError ||
        !matchError(state.output.error, state.catchingError)
      ) {
        throw state.output.error;
      }
    }

    // checks for unused catching error
    else if (state.catchingError) {
      throw new RunnerError(
        'No error thrown by the saga\n\n' +
          `Given error pattern:\n\n${stringify(state.catchingError)}`,
      );
    }

    return state.output;
  } catch (error) {
    defineCallSite(error, runner.run);
    throw error;
  }
};
