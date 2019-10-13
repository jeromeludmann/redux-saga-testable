import { _createRunner } from './runner'
import { createError } from './utils'
import {
  SagaRunner,
  ThrowError,
  THROW_ERROR,
  Finalize,
  FINALIZE,
} from './types/runner'

/**
 * Creates a saga runner.
 */
export function createRunner<Saga extends (...args: any[]) => any>(
  saga: Saga,
  ...args: Parameters<Saga>
): SagaRunner {
  if (!saga) {
    throw createError('Missing saga argument', createRunner)
  }

  return _createRunner(
    {
      injections: [],
      assertions: [],
    },
    saga,
    args,
  )
}

/**
 * Creates a saga runner.
 * @deprecated Use `createRunner()` instead.
 */
export const use = createRunner

/**
 * Throws an error from the saga when injected as a value.
 */
export function throwError(error: Error): ThrowError {
  return {
    [THROW_ERROR]: true,
    error,
  }
}

/**
 * Finalizes the saga when injected as a value.
 */
export function finalize(): Finalize {
  return {
    [FINALIZE]: true,
  }
}
