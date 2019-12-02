import { isDeepStrictEqual } from 'util';
import { Action } from 'redux';
import { TakeableChannel, PuttableChannel, FlushableChannel } from 'redux-saga';
import { Effect } from 'redux-saga/effects';
import * as effects from 'redux-saga/effects';
import * as types from '@redux-saga/types';

import { Engine } from './engine';
import { RunnerError, setCallSite } from './errors';
import { ErrorPattern, matchError } from './utils';

export class Assertions<R extends Engine> {
  private readonly runner: R;
  private negated: boolean;

  constructor({ runner }: { runner: R }) {
    this.runner = runner;
    this.negated = false;

    this.take = this.createAlias(effects.take);
    this.takeMaybe = this.createAlias(effects.takeMaybe);
    this.takeEvery = this.createAlias(effects.takeEvery);
    this.takeLatest = this.createAlias(effects.takeLatest);
    this.takeLeading = this.createAlias(effects.takeLeading);
    this.put = this.createAlias(effects.put);
    this.putResolve = this.createAlias(effects.putResolve);
    this.call = this.createAlias(effects.call);
    this.apply = this.createAlias(effects.apply);
    this.cps = this.createAlias(effects.cps);
    this.fork = this.createAlias(effects.fork);
    this.spawn = this.createAlias(effects.spawn);
    this.join = this.createAlias(effects.join);
    this.cancel = this.createAlias(effects.cancel);
    this.select = this.createAlias(effects.select);
    this.actionChannel = this.createAlias(effects.actionChannel);
    this.flush = this.createAlias(effects.flush);
    this.cancelled = this.createAlias(effects.cancelled);
    this.setContext = this.createAlias(effects.setContext);
    this.getContext = this.createAlias(effects.getContext);
    this.delay = this.createAlias(effects.delay);
    this.throttle = this.createAlias(effects.throttle);
    this.debounce = this.createAlias(effects.debounce);
    this.retry = this.createAlias(effects.retry);
    this.all = this.createAlias(effects.all);
    this.race = this.createAlias(effects.race);
  }

  /**
   * Asserts that the saga yields an effect.
   */
  yield(effect: Effect) {
    try {
      if (!effect) {
        throw new RunnerError('Missing effect argument');
      }

      const output = this.runner.run();

      if (
        !this.assert(output.effects.some(e => isDeepStrictEqual(e, effect)))
      ) {
        throw new RunnerError('Assertion failure', [
          `${this.expected} effect:`,
          effect,
          'Received effects:',
          output.effects,
        ]);
      }

      return this.runner;
    } catch (error) {
      setCallSite(error, this.yield);
      throw error;
    } finally {
      this.negated = false;
    }
  }

  /**
   * Asserts that the saga returns a value.
   */
  return<T>(value: T) {
    try {
      if (arguments.length < 1) {
        throw new RunnerError('Missing value argument');
      }

      const output = this.runner.run();

      if (!this.assert(isDeepStrictEqual(output.return, value))) {
        throw new RunnerError('Assertion failure', [
          `${this.expected} return value:`,
          value,
          'Received return value:',
          output.return,
        ]);
      }

      return this.runner;
    } catch (error) {
      setCallSite(error, this.return);
      throw error;
    } finally {
      this.negated = false;
    }
  }

  /**
   * Asserts that the saga throws an error.
   */
  throw(error: ErrorPattern) {
    try {
      if (!error) {
        throw new RunnerError('Missing error pattern argument');
      }

      const output = this.runner.run();

      if (!this.assert(!!output.error && matchError(output.error, error))) {
        throw new RunnerError('Assertion failure', [
          `${this.expected} error pattern:`,
          error,
          'Received thrown error:',
          output.error,
        ]);
      }

      return this.runner;
    } catch (error) {
      setCallSite(error, this.throw);
      throw error;
    } finally {
      this.negated = false;
    }
  }

  /**
   * Negates the next assertion.
   */
  get not(): Omit<Assertions<R>, 'not'> {
    this.negated = true;
    return this;
  }

  private assert(assertion: boolean) {
    return this.negated ? !assertion : assertion;
  }

  private get expected() {
    return this.negated ? 'Not expected' : 'Expected';
  }

  private createAlias(effectCreator: (...args: any[]) => Effect) {
    const alias = (...effectArgs: unknown[]) => {
      try {
        return this.yield(effectCreator(...effectArgs));
      } catch (error) {
        setCallSite(error, alias);
        throw error;
      }
    };

    return alias;
  }

  // Extended assertions.
  // Based on the redux-saga type definitions.
  // See https://github.com/jeromeludmann/redux-saga-testable/issues/31

  /**
   * Alias for `runner.should.yield(take(...))`
   */
  take: {
    (pattern?: types.ActionPattern): R;

    <A extends Action>(pattern?: types.ActionPattern<A>): R;

    <T>(channel: TakeableChannel<T>, multicastPattern?: types.Pattern<T>): R;
  };

  /**
   * Alias for `runner.should.yield(takeMaybe(...))`
   */
  takeMaybe: {
    (pattern?: types.ActionPattern): R;

    <A extends Action>(pattern?: types.ActionPattern<A>): R;

    <T>(channel: TakeableChannel<T>, multicastPattern?: types.Pattern<T>): R;
  };

  /**
   * Alias for `runner.should.yield(takeEvery(...))`
   */
  takeEvery: {
    <P extends types.ActionPattern>(
      pattern: P,
      worker: (action: types.ActionMatchingPattern<P>) => any,
    ): R;

    <P extends types.ActionPattern, Fn extends (...args: any[]) => any>(
      pattern: P,
      worker: Fn,
      ...args: effects.HelperWorkerParameters<
        types.ActionMatchingPattern<P>,
        Fn
      >
    ): R;

    <A extends Action>(
      pattern: types.ActionPattern<A>,
      worker: (action: A) => any,
    ): R;

    <A extends Action, Fn extends (...args: any[]) => any>(
      pattern: types.ActionPattern<A>,
      worker: Fn,
      ...args: effects.HelperWorkerParameters<A, Fn>
    ): R;

    <T>(channel: TakeableChannel<T>, worker: (item: T) => any): R;

    <T, Fn extends (...args: any[]) => any>(
      channel: TakeableChannel<T>,
      worker: Fn,
      ...args: effects.HelperWorkerParameters<T, Fn>
    ): R;
  };

  /**
   * Alias for `runner.should.yield(takeLatest(...))`
   */
  takeLatest: {
    <P extends types.ActionPattern>(
      pattern: P,
      worker: (action: types.ActionMatchingPattern<P>) => any,
    ): R;

    <P extends types.ActionPattern, Fn extends (...args: any[]) => any>(
      pattern: P,
      worker: Fn,
      ...args: effects.HelperWorkerParameters<
        types.ActionMatchingPattern<P>,
        Fn
      >
    ): R;

    <A extends Action>(
      pattern: types.ActionPattern<A>,
      worker: (action: A) => any,
    ): R;

    <A extends Action, Fn extends (...args: any[]) => any>(
      pattern: types.ActionPattern<A>,
      worker: Fn,
      ...args: effects.HelperWorkerParameters<A, Fn>
    ): R;

    <T>(channel: TakeableChannel<T>, worker: (item: T) => any): R;

    <T, Fn extends (...args: any[]) => any>(
      channel: TakeableChannel<T>,
      worker: Fn,
      ...args: effects.HelperWorkerParameters<T, Fn>
    ): R;
  };

  /**
   * Alias for `runner.should.yield(takeLeading(...))`
   */
  takeLeading: {
    <P extends types.ActionPattern>(
      pattern: P,
      worker: (action: types.ActionMatchingPattern<P>) => any,
    ): R;

    <P extends types.ActionPattern, Fn extends (...args: any[]) => any>(
      pattern: P,
      worker: Fn,
      ...args: effects.HelperWorkerParameters<
        types.ActionMatchingPattern<P>,
        Fn
      >
    ): R;

    <A extends Action>(
      pattern: types.ActionPattern<A>,
      worker: (action: A) => any,
    ): R;

    <A extends Action, Fn extends (...args: any[]) => any>(
      pattern: types.ActionPattern<A>,
      worker: Fn,
      ...args: effects.HelperWorkerParameters<A, Fn>
    ): R;

    <T>(channel: TakeableChannel<T>, worker: (item: T) => any): R;

    <T, Fn extends (...args: any[]) => any>(
      channel: TakeableChannel<T>,
      worker: Fn,
      ...args: effects.HelperWorkerParameters<T, Fn>
    ): R;
  };

  /**
   * Alias for `runner.should.yield(put(...))`
   */
  put: {
    <A extends Action>(action: A): R;

    <T>(channel: PuttableChannel<T>, action: T | types.END): R;
  };

  /**
   * Alias for `runner.should.yield(putResolve(...))`
   */
  putResolve: <A extends Action>(action: A) => R;

  /**
   * Alias for `runner.should.yield(call(...))`
   */
  call: {
    <Fn extends (...args: any[]) => any>(fn: Fn, ...args: Parameters<Fn>): R;

    <
      Ctx extends { [P in Name]: (this: Ctx, ...args: any[]) => any },
      Name extends string
    >(
      ctxAndFnName: [Ctx, Name],
      ...args: Parameters<Ctx[Name]>
    ): R;

    <
      Ctx extends { [P in Name]: (this: Ctx, ...args: any[]) => any },
      Name extends string
    >(
      ctxAndFnName: { context: Ctx; fn: Name },
      ...args: Parameters<Ctx[Name]>
    ): R;

    <Ctx, Fn extends (this: Ctx, ...args: any[]) => any>(
      ctxAndFn: [Ctx, Fn],
      ...args: Parameters<Fn>
    ): R;

    <Ctx, Fn extends (this: Ctx, ...args: any[]) => any>(
      ctxAndFn: { context: Ctx; fn: Fn },
      ...args: Parameters<Fn>
    ): R;
  };

  /**
   * Alias for `runner.should.yield(apply(...))`
   */
  apply: {
    <
      Ctx extends { [P in Name]: (this: Ctx, ...args: any[]) => any },
      Name extends string
    >(
      ctx: Ctx,
      fnName: Name,
      args: Parameters<Ctx[Name]>,
    ): R;

    <Ctx, Fn extends (this: Ctx, ...args: any[]) => any>(
      ctx: Ctx,
      fn: Fn,
      args: Parameters<Fn>,
    ): R;
  };

  /**
   * Alias for `runner.should.yield(cps(...))`
   */
  cps: {
    <Fn extends (cb: effects.CpsCallback<any>) => any>(fn: Fn): R;

    <Fn extends (...args: any[]) => any>(
      fn: Fn,
      ...args: effects.CpsFunctionParameters<Fn>
    ): R;

    <
      Ctx extends { [P in Name]: (this: Ctx, ...args: any[]) => void },
      Name extends string
    >(
      ctxAndFnName: [Ctx, Name],
      ...args: effects.CpsFunctionParameters<Ctx[Name]>
    ): R;

    <
      Ctx extends { [P in Name]: (this: Ctx, ...args: any[]) => void },
      Name extends string
    >(
      ctxAndFnName: { context: Ctx; fn: Name },
      ...args: effects.CpsFunctionParameters<Ctx[Name]>
    ): R;

    <Ctx, Fn extends (this: Ctx, ...args: any[]) => void>(
      ctxAndFn: [Ctx, Fn],
      ...args: effects.CpsFunctionParameters<Fn>
    ): R;

    <Ctx, Fn extends (this: Ctx, ...args: any[]) => void>(
      ctxAndFn: { context: Ctx; fn: Fn },
      ...args: effects.CpsFunctionParameters<Fn>
    ): R;
  };

  /**
   * Alias for `runner.should.yield(fork(...))`
   */
  fork: {
    <Fn extends (...args: any[]) => any>(fn: Fn, ...args: Parameters<Fn>): R;

    <
      Ctx extends { [P in Name]: (this: Ctx, ...args: any[]) => any },
      Name extends string
    >(
      ctxAndFnName: [Ctx, Name],
      ...args: Parameters<Ctx[Name]>
    ): R;

    <
      Ctx extends { [P in Name]: (this: Ctx, ...args: any[]) => any },
      Name extends string
    >(
      ctxAndFnName: { context: Ctx; fn: Name },
      ...args: Parameters<Ctx[Name]>
    ): R;

    <Ctx, Fn extends (this: Ctx, ...args: any[]) => any>(
      ctxAndFn: [Ctx, Fn],
      ...args: Parameters<Fn>
    ): R;

    <Ctx, Fn extends (this: Ctx, ...args: any[]) => any>(
      ctxAndFn: { context: Ctx; fn: Fn },
      ...args: Parameters<Fn>
    ): R;
  };

  /**
   * Alias for `runner.should.yield(spawn(...))`
   */
  spawn: {
    <Fn extends (...args: any[]) => any>(fn: Fn, ...args: Parameters<Fn>): R;

    <
      Ctx extends { [P in Name]: (this: Ctx, ...args: any[]) => any },
      Name extends string
    >(
      ctxAndFnName: [Ctx, Name],
      ...args: Parameters<Ctx[Name]>
    ): R;

    <
      Ctx extends { [P in Name]: (this: Ctx, ...args: any[]) => any },
      Name extends string
    >(
      ctxAndFnName: { context: Ctx; fn: Name },
      ...args: Parameters<Ctx[Name]>
    ): R;

    <Ctx, Fn extends (this: Ctx, ...args: any[]) => any>(
      ctxAndFn: [Ctx, Fn],
      ...args: Parameters<Fn>
    ): R;

    <Ctx, Fn extends (this: Ctx, ...args: any[]) => any>(
      ctxAndFn: { context: Ctx; fn: Fn },
      ...args: Parameters<Fn>
    ): R;
  };

  /**
   * Alias for `runner.should.yield(join(...))`
   */
  join: {
    (task: types.Task): R;

    (tasks: types.Task[]): R;
  };

  /**
   * Alias for `runner.should.yield(cancel(...))`
   */
  cancel: {
    (task: types.Task): R;

    (tasks: types.Task[]): R;

    (): R;
  };

  /**
   * Alias for `runner.should.yield(select(...))`
   */
  select: {
    (): R;

    <Fn extends (state: any, ...args: any[]) => any>(
      selector: Fn,
      ...args: effects.Tail<Parameters<Fn>>
    ): R;
  };

  /**
   * Alias for `runner.should.yield(actionChannel(...))`
   */
  actionChannel: (
    pattern: types.ActionPattern,
    buffer?: types.Buffer<Action>,
  ) => R;

  /**
   * Alias for `runner.should.yield(flush(...))`
   */
  flush: <T>(channel: FlushableChannel<T>) => R;

  /**
   * Alias for `runner.should.yield(cancelled(...))`
   */
  cancelled: () => R;

  /**
   * Alias for `runner.should.yield(setContext(...))`
   */
  setContext: <C extends object>(props: C) => R;

  /**
   * Alias for `runner.should.yield(getContext(...))`
   */
  getContext: (prop: string) => R;

  /**
   * Alias for `runner.should.yield(delay(...))`
   */
  delay: <T = true>(ms: number, val?: T) => R;

  /**
   * Alias for `runner.should.yield(throttle(...))`
   */
  throttle: {
    <P extends types.ActionPattern>(
      ms: number,
      pattern: P,
      worker: (action: types.ActionMatchingPattern<P>) => any,
    ): R;

    <P extends types.ActionPattern, Fn extends (...args: any[]) => any>(
      ms: number,
      pattern: P,
      worker: Fn,
      ...args: effects.HelperWorkerParameters<
        types.ActionMatchingPattern<P>,
        Fn
      >
    ): R;

    <A extends Action>(
      ms: number,
      pattern: types.ActionPattern<A>,
      worker: (action: A) => any,
    ): R;

    <A extends Action, Fn extends (...args: any[]) => any>(
      ms: number,
      pattern: types.ActionPattern<A>,
      worker: Fn,
      ...args: effects.HelperWorkerParameters<A, Fn>
    ): R;

    <T>(ms: number, channel: TakeableChannel<T>, worker: (item: T) => any): R;

    <T, Fn extends (...args: any[]) => any>(
      ms: number,
      channel: TakeableChannel<T>,
      worker: Fn,
      ...args: effects.HelperWorkerParameters<T, Fn>
    ): R;
  };

  /**
   * Alias for `runner.should.yield(debounce(...))`
   */
  debounce: {
    <P extends types.ActionPattern>(
      ms: number,
      pattern: P,
      worker: (action: types.ActionMatchingPattern<P>) => any,
    ): R;

    <P extends types.ActionPattern, Fn extends (...args: any[]) => any>(
      ms: number,
      pattern: P,
      worker: Fn,
      ...args: effects.HelperWorkerParameters<
        types.ActionMatchingPattern<P>,
        Fn
      >
    ): R;

    <A extends Action>(
      ms: number,
      pattern: types.ActionPattern<A>,
      worker: (action: A) => any,
    ): R;

    <A extends Action, Fn extends (...args: any[]) => any>(
      ms: number,
      pattern: types.ActionPattern<A>,
      worker: Fn,
      ...args: effects.HelperWorkerParameters<A, Fn>
    ): R;

    <T>(ms: number, channel: TakeableChannel<T>, worker: (item: T) => any): R;

    <T, Fn extends (...args: any[]) => any>(
      ms: number,
      channel: TakeableChannel<T>,
      worker: Fn,
      ...args: effects.HelperWorkerParameters<T, Fn>
    ): R;
  };

  /**
   * Alias for `runner.should.yield(retry(...))`
   */
  retry: <Fn extends (...args: any[]) => any>(
    maxTries: number,
    delayLength: number,
    fn: Fn,
    ...args: Parameters<Fn>
  ) => R;

  /**
   * Alias for `runner.should.yield(all(...))`
   */
  all: {
    <T>(effects: T[]): R;

    <T>(effects: { [key: string]: T }): R;
  };

  /**
   * Alias for `runner.should.yield(race(...))`
   */
  race: {
    <T>(effects: { [key: string]: T }): R;

    <T>(effects: T[]): R;
  };
}
