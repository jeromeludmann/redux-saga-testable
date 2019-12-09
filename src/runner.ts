import { Engine } from './engine';
import { Assertions } from './assertions';
import { RunnerError } from './errors';

/**
 * The runner returned by `createRunner()`.
 */
export class Runner extends Engine {
  /**
   * Provides the assertion methods.
   */
  should = new Assertions({ runner: this });

  /**
   * Clones the current runner instance.
   */
  clone() {
    return new Runner(this.saga, this.args, {
      mappings: [...this.mappings],
      errorToCatch: this.errorToCatch,
    });
  }
}

/**
 * Creates a `Runner`.
 */
export function createRunner<S extends (...args: any[]) => any>(
  saga: S,
  ...args: Parameters<S>
): Runner {
  if (arguments.length < 1) {
    throw new RunnerError('Missing saga argument', createRunner);
  }

  return new Runner(saga, args);
}
