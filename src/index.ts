import { _createRunner } from './runner';
import { RunnerError, defineCallSite } from './utils';
import {
  SagaRunner,
  ThrowError,
  THROW_ERROR,
  Finalize,
  FINALIZE,
} from './types/runner';

/**
 * Creates a saga runner.
 */
export function createRunner<Saga extends (...args: any[]) => any>(
  saga: Saga,
  ...args: Parameters<Saga>
): SagaRunner {
  try {
    if (!saga) {
      throw new RunnerError('Missing saga argument');
    }

    return _createRunner({
      saga,
      arguments: args,
      environment: [],
    });
  } catch (error) {
    defineCallSite(error, createRunner);
    throw error;
  }
}

/**
 * Creates a saga runner.
 * @deprecated Use `createRunner()` instead.
 */
export const use = createRunner;

/**
 * Throws an error from the saga when mapped as a value.
 */
export function throwError(error: Error): ThrowError {
  try {
    if (!error) {
      throw new RunnerError('Missing error argument');
    }

    return {
      [THROW_ERROR]: true,
      error,
    };
  } catch (error) {
    defineCallSite(error, throwError);
    throw error;
  }
}

/**
 * Finalizes the saga when mapped as a value.
 */
export function finalize(): Finalize {
  return {
    [FINALIZE]: true,
  };
}
