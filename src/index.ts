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

  return _createRunner({
    saga,
    arguments: args,
    environment: [],
  })
}

/**
 * Creates a saga runner.
 * @deprecated Use `createRunner()` instead.
 */
export const use = createRunner

/**
 * Throws an error from the saga when mapped as a value.
 */
export function throwError(error: Error): ThrowError {
  if (!error) {
    throw createError('Missing error argument', throwError)
  }

  return {
    [THROW_ERROR]: true,
    error,
  }
}

/**
 * Finalizes the saga when mapped as a value.
 */
export function finalize(): Finalize {
  return {
    [FINALIZE]: true,
  }
}
