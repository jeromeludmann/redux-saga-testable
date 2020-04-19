import { isDeepStrictEqual } from 'util';
import { Effect, Saga } from '@redux-saga/types';

import { RunnerError } from './errors';
import { stringify } from './strings';
import { ErrorPattern, isEffect, matchError } from './utils';

/**
 * The runner output returned by `runner.run()`.
 */
export interface RunnerOutput {
  effects: Effect[];
  return?: unknown;
  error?: Error;
}

interface EffectMapping {
  effect: Effect;
  values: unknown[];
}

interface InitialState {
  mappings: EffectMapping[];
  errorToCatch?: ErrorPattern;
}

const ENGINE = '@@redux-saga-testable/engine';

const THROW_ERROR = 'THROW_ERROR';

export interface ThrowError {
  [ENGINE]: typeof THROW_ERROR;
  error: Error;
}

const FINALIZE = 'FINALIZE';

export interface Finalize<T> {
  [ENGINE]: typeof FINALIZE;
  value?: T;
}

const MAX_YIELDED_EFFECTS = 100;

export class Engine {
  protected readonly saga: Saga;
  protected readonly args: Parameters<Saga>;
  protected mappings: EffectMapping[];
  protected errorToCatch?: ErrorPattern;
  private cachedOutput: RunnerOutput | null;

  constructor(saga: Saga, args: unknown[], initialState?: InitialState) {
    this.saga = saga;
    this.args = args;
    this.mappings = initialState?.mappings ?? [];
    this.errorToCatch = initialState?.errorToCatch;
    this.cachedOutput = null;
  }

  /**
   * Maps an effect to a value.
   */
  map(effect: Effect, value: unknown, ...nextValues: unknown[]): this {
    if (arguments.length < 1) {
      throw new RunnerError('Missing effect argument', this.map);
    }

    if (arguments.length < 2) {
      throw new RunnerError(
        ['The value to map is missing', 'Given effect:', stringify(effect)],
        this.map,
      );
    }

    const existingMapping = this.mappings.find(mapping =>
      isDeepStrictEqual(mapping.effect, effect),
    );

    if (existingMapping) {
      throw new RunnerError(
        [
          'Mapped values already provided for this effect',
          'Given effect:',
          stringify(effect),
          'Existing mapped values:',
          stringify(existingMapping.values),
        ],
        this.map,
      );
    }

    this.mappings.push({
      effect,
      values: [value, ...nextValues],
    });

    this.cachedOutput = null;

    return this;
  }

  /**
   * Catches silently an error thrown by the saga.
   */
  catch(error: ErrorPattern): this {
    if (arguments.length < 1) {
      throw new RunnerError('Missing error pattern argument', this.catch);
    }

    if (this.errorToCatch) {
      throw new RunnerError(
        [
          'Error pattern already provided',
          'Given error pattern:',
          stringify(this.errorToCatch),
        ],
        this.catch,
      );
    }

    this.errorToCatch = error;
    this.cachedOutput = null;

    return this;
  }

  /**
   * Runs the saga.
   */
  run(): RunnerOutput {
    // If an output already exists for the current engine state,
    // does not rerun the saga and returns the existing cached output.
    if (this.cachedOutput !== null) {
      return this.cachedOutput;
    }

    this.cachedOutput = { effects: [] };

    const iterator = this.saga(...this.args);
    let step: IteratorResult<any>;
    let nextValue = undefined;

    // Allows the runner to consume the mapping values without mutating them.
    const mappings: EffectMapping[] = this.mappings.map(mapping => ({
      ...mapping,
      values: Array.from(mapping.values),
    }));

    // Runs the saga, breaks when is done or when an error is thrown.
    for (;;) {
      try {
        step = this.next(iterator, nextValue);
      } catch (sagaError) {
        this.cachedOutput.error = sagaError;
        break;
      }

      if (step.done) {
        this.cachedOutput.return = step.value;
        break;
      }

      if (!isEffect(step.value)) {
        nextValue = step.value;
        continue;
      }

      if (this.cachedOutput.effects.length > MAX_YIELDED_EFFECTS) {
        throw new RunnerError('Too many yielded effects', this.run);
      }

      this.cachedOutput.effects.push(step.value);

      // Gets the value mapped with the current effect
      // and uses it as the next value to be passed to the generator.
      nextValue = mappings
        .find(mapping => isDeepStrictEqual(mapping.effect, step.value))
        ?.values.shift();
    }

    const unusedMapping = mappings.find(mapping => mapping.values.length > 0);

    if (unusedMapping) {
      throw new RunnerError(
        [
          'Unused mapped values',
          'Given effect:',
          stringify(unusedMapping.effect),
          'Unused mapped values:',
          stringify(unusedMapping.values),
        ],
        this.run,
      );
    }

    // Rethrows the error thrown by the saga itself.
    if (this.cachedOutput.error) {
      if (
        !this.errorToCatch ||
        !matchError(this.cachedOutput.error, this.errorToCatch)
      ) {
        throw this.cachedOutput.error;
      }
    }

    // Checks for useless `runner.catch()`.
    else if (this.errorToCatch) {
      throw new RunnerError(
        [
          'No error thrown by the saga',
          'Given error pattern:',
          stringify(this.errorToCatch),
        ],
        this.run,
      );
    }

    return this.cachedOutput;
  }

  private next<T>(iterator: Iterator<T>, value: any): IteratorResult<any> {
    if (value !== null && typeof value === 'object' && ENGINE in value) {
      switch (value[ENGINE]) {
        case THROW_ERROR:
          return iterator.throw!(value.error);
        case FINALIZE:
          if (value.value !== undefined) {
            iterator.next(value.value);
          }
          return iterator.return!();
      }
    }

    return iterator.next(value);
  }
}

/**
 * Throws an error from the saga when mapped as a value.
 */
export function throwError(error: Error): ThrowError {
  if (arguments.length < 1) {
    throw new RunnerError('Missing error argument', throwError);
  }

  return {
    [ENGINE]: THROW_ERROR,
    error,
  };
}

/**
 * Finalizes the saga when mapped as a value.
 */
export function finalize<T>(value?: T): Finalize<T> {
  return {
    [ENGINE]: FINALIZE,
    value,
  };
}
