import { Effect, Saga } from '@redux-saga/types';
import { ExtendedSagaAssertions } from './aliases';

export interface SagaRunner {
  /**
   * Maps an effect to a value.
   */
  map(effect: Effect, value: any, ...nextValues: any[]): SagaRunner;

  /**
   * Mocks the result of an effect.
   * @deprecated Use `map()` instead.
   */
  mock(effect: Effect, result: any, ...nextResults: any[]): SagaRunner;

  /**
   * Provides the assertion methods.
   */
  should: SagaAssertions;

  /**
   * Catches silently an error thrown by the saga.
   */
  catch(error: ErrorPattern): SagaRunner;

  /**
   * Clones the current runner instance.
   */
  clone(): SagaRunner;

  /**
   * Runs the saga.
   */
  run(): SagaOutput;
}

export interface SagaAssertions extends ExtendedSagaAssertions<SagaRunner> {
  /**
   * Asserts that the saga yields an effect.
   */
  yield(effect: Effect): SagaRunner;

  /**
   * Asserts that the saga returns a value.
   */
  return(value: any): SagaRunner;

  /**
   * Asserts that the saga throws an error.
   */
  throw(error: ErrorPattern): SagaRunner;

  /**
   * Negates the next assertion.
   */
  not: Omit<SagaAssertions, 'not'>;
}

/**
 * The saga output produced by `run()` method.
 */
export interface SagaOutput {
  effects: Effect[];
  return?: any;
  error?: Error;
}

/**
 * The error pattern used to silently catch a thrown error.
 */
export type ErrorPattern =
  | string
  | RegExp
  | Error
  | { new (...args: any[]): any };

export const THROW_ERROR = '@@redux-saga-testable/THROW_ERROR';

export interface ThrowError {
  [THROW_ERROR]: boolean;
  error: Error;
}

export const FINALIZE = '@@redux-saga-testable/FINALIZE';

export interface Finalize {
  [FINALIZE]: boolean;
}

export interface SagaRunnerState {
  saga: Saga;
  arguments: Parameters<Saga>;
  environment: Mapping[];
  catchingError?: ErrorPattern;
  output?: SagaOutput;
}

export interface Mapping {
  effect: Effect;
  values: any[];
}
