import { Action } from 'redux'
import {
  TakeableChannel,
  PuttableChannel,
  FlushableChannel,
  END,
} from 'redux-saga'
import {
  ChannelPutEffect,
  HelperWorkerParameters,
  ActionPattern,
  Pattern,
  Tail,
  take,
  takeMaybe,
  takeEvery,
  takeLatest,
  takeLeading,
  put,
  putResolve,
  call,
  apply,
  cps,
  CpsCallback,
  CpsFunctionParameters,
  fork,
  spawn,
  join,
  cancel,
  select,
  actionChannel,
  flush,
  cancelled,
  setContext,
  getContext,
  delay,
  throttle,
  debounce,
  retry,
  all,
  race,
} from 'redux-saga/effects'
import { ActionMatchingPattern, Effect, Task, Buffer } from '@redux-saga/types'

export interface ExtendedSagaAssertions<R> {
  /**
   * Alias for `should.yield(take(...))`
   */
  take(pattern?: ActionPattern): R

  take<A extends Action>(pattern?: ActionPattern<A>): R

  take<T>(channel: TakeableChannel<T>, multicastPattern?: Pattern<T>): R

  /**
   * Alias for `should.yield(takeMaybe(...))`
   */
  takeMaybe(pattern?: ActionPattern): R

  takeMaybe<A extends Action>(pattern?: ActionPattern<A>): R

  takeMaybe<T>(channel: TakeableChannel<T>, multicastPattern?: Pattern<T>): R

  /**
   * Alias for `should.yield(takeEvery(...))`
   */
  takeEvery<P extends ActionPattern>(
    pattern: P,
    worker: (action: ActionMatchingPattern<P>) => any,
  ): R

  takeEvery<P extends ActionPattern, Fn extends (...args: any[]) => any>(
    pattern: P,
    worker: Fn,
    ...args: HelperWorkerParameters<ActionMatchingPattern<P>, Fn>
  ): R

  takeEvery<A extends Action>(
    pattern: ActionPattern<A>,
    worker: (action: A) => any,
  ): R

  takeEvery<A extends Action, Fn extends (...args: any[]) => any>(
    pattern: ActionPattern<A>,
    worker: Fn,
    ...args: HelperWorkerParameters<A, Fn>
  ): R

  takeEvery<T>(channel: TakeableChannel<T>, worker: (item: T) => any): R

  takeEvery<T, Fn extends (...args: any[]) => any>(
    channel: TakeableChannel<T>,
    worker: Fn,
    ...args: HelperWorkerParameters<T, Fn>
  ): R

  /**
   * Alias for `should.yield(takeLatest(...))`
   */
  takeLatest<P extends ActionPattern>(
    pattern: P,
    worker: (action: ActionMatchingPattern<P>) => any,
  ): R

  takeLatest<P extends ActionPattern, Fn extends (...args: any[]) => any>(
    pattern: P,
    worker: Fn,
    ...args: HelperWorkerParameters<ActionMatchingPattern<P>, Fn>
  ): R

  takeLatest<A extends Action>(
    pattern: ActionPattern<A>,
    worker: (action: A) => any,
  ): R

  takeLatest<A extends Action, Fn extends (...args: any[]) => any>(
    pattern: ActionPattern<A>,
    worker: Fn,
    ...args: HelperWorkerParameters<A, Fn>
  ): R

  takeLatest<T>(channel: TakeableChannel<T>, worker: (item: T) => any): R

  takeLatest<T, Fn extends (...args: any[]) => any>(
    channel: TakeableChannel<T>,
    worker: Fn,
    ...args: HelperWorkerParameters<T, Fn>
  ): R

  /**
   * Alias for `should.yield(takeLeading(...))`
   */
  takeLeading<P extends ActionPattern>(
    pattern: P,
    worker: (action: ActionMatchingPattern<P>) => any,
  ): R

  takeLeading<P extends ActionPattern, Fn extends (...args: any[]) => any>(
    pattern: P,
    worker: Fn,
    ...args: HelperWorkerParameters<ActionMatchingPattern<P>, Fn>
  ): R

  takeLeading<A extends Action>(
    pattern: ActionPattern<A>,
    worker: (action: A) => any,
  ): R

  takeLeading<A extends Action, Fn extends (...args: any[]) => any>(
    pattern: ActionPattern<A>,
    worker: Fn,
    ...args: HelperWorkerParameters<A, Fn>
  ): R

  takeLeading<T>(channel: TakeableChannel<T>, worker: (item: T) => any): R

  takeLeading<T, Fn extends (...args: any[]) => any>(
    channel: TakeableChannel<T>,
    worker: Fn,
    ...args: HelperWorkerParameters<T, Fn>
  ): R

  /**
   * Alias for `should.yield(put(...))`
   */
  put<A extends Action>(action: A): R

  put<T>(channel: PuttableChannel<T>, action: T | END): ChannelPutEffect<T>

  /**
   * Alias for `should.yield(putResolve(...))`
   */
  putResolve<A extends Action>(action: A): R

  /**
   * Alias for `should.yield(call(...))`
   */
  call<Fn extends (...args: any[]) => any>(fn: Fn, ...args: Parameters<Fn>): R

  call<
    Ctx extends { [P in Name]: (this: Ctx, ...args: any[]) => any },
    Name extends string
  >(
    ctxAndFnName: [Ctx, Name],
    ...args: Parameters<Ctx[Name]>
  ): R

  call<
    Ctx extends { [P in Name]: (this: Ctx, ...args: any[]) => any },
    Name extends string
  >(
    ctxAndFnName: { context: Ctx; fn: Name },
    ...args: Parameters<Ctx[Name]>
  ): R

  call<Ctx, Fn extends (this: Ctx, ...args: any[]) => any>(
    ctxAndFn: [Ctx, Fn],
    ...args: Parameters<Fn>
  ): R

  call<Ctx, Fn extends (this: Ctx, ...args: any[]) => any>(
    ctxAndFn: { context: Ctx; fn: Fn },
    ...args: Parameters<Fn>
  ): R

  /**
   * Alias for `should.yield(apply(...))`
   */
  apply<
    Ctx extends { [P in Name]: (this: Ctx, ...args: any[]) => any },
    Name extends string
  >(
    ctx: Ctx,
    fnName: Name,
    args: Parameters<Ctx[Name]>,
  ): R

  apply<Ctx, Fn extends (this: Ctx, ...args: any[]) => any>(
    ctx: Ctx,
    fn: Fn,
    args: Parameters<Fn>,
  ): R

  /**
   * Alias for `should.yield(cps(...))`
   */
  cps<Fn extends (cb: CpsCallback<any>) => any>(fn: Fn): R

  cps<Fn extends (...args: any[]) => any>(
    fn: Fn,
    ...args: CpsFunctionParameters<Fn>
  ): R

  cps<
    Ctx extends { [P in Name]: (this: Ctx, ...args: any[]) => void },
    Name extends string
  >(
    ctxAndFnName: [Ctx, Name],
    ...args: CpsFunctionParameters<Ctx[Name]>
  ): R

  cps<
    Ctx extends { [P in Name]: (this: Ctx, ...args: any[]) => void },
    Name extends string
  >(
    ctxAndFnName: { context: Ctx; fn: Name },
    ...args: CpsFunctionParameters<Ctx[Name]>
  ): R

  cps<Ctx, Fn extends (this: Ctx, ...args: any[]) => void>(
    ctxAndFn: [Ctx, Fn],
    ...args: CpsFunctionParameters<Fn>
  ): R

  cps<Ctx, Fn extends (this: Ctx, ...args: any[]) => void>(
    ctxAndFn: { context: Ctx; fn: Fn },
    ...args: CpsFunctionParameters<Fn>
  ): R

  /**
   * Alias for `should.yield(fork(...))`
   */
  fork<Fn extends (...args: any[]) => any>(fn: Fn, ...args: Parameters<Fn>): R

  fork<
    Ctx extends { [P in Name]: (this: Ctx, ...args: any[]) => any },
    Name extends string
  >(
    ctxAndFnName: [Ctx, Name],
    ...args: Parameters<Ctx[Name]>
  ): R

  fork<
    Ctx extends { [P in Name]: (this: Ctx, ...args: any[]) => any },
    Name extends string
  >(
    ctxAndFnName: { context: Ctx; fn: Name },
    ...args: Parameters<Ctx[Name]>
  ): R

  fork<Ctx, Fn extends (this: Ctx, ...args: any[]) => any>(
    ctxAndFn: [Ctx, Fn],
    ...args: Parameters<Fn>
  ): R

  fork<Ctx, Fn extends (this: Ctx, ...args: any[]) => any>(
    ctxAndFn: { context: Ctx; fn: Fn },
    ...args: Parameters<Fn>
  ): R

  /**
   * Alias for `should.yield(spawn(...))`
   */
  spawn<Fn extends (...args: any[]) => any>(fn: Fn, ...args: Parameters<Fn>): R

  spawn<
    Ctx extends { [P in Name]: (this: Ctx, ...args: any[]) => any },
    Name extends string
  >(
    ctxAndFnName: [Ctx, Name],
    ...args: Parameters<Ctx[Name]>
  ): R

  spawn<
    Ctx extends { [P in Name]: (this: Ctx, ...args: any[]) => any },
    Name extends string
  >(
    ctxAndFnName: { context: Ctx; fn: Name },
    ...args: Parameters<Ctx[Name]>
  ): R

  spawn<Ctx, Fn extends (this: Ctx, ...args: any[]) => any>(
    ctxAndFn: [Ctx, Fn],
    ...args: Parameters<Fn>
  ): R

  spawn<Ctx, Fn extends (this: Ctx, ...args: any[]) => any>(
    ctxAndFn: { context: Ctx; fn: Fn },
    ...args: Parameters<Fn>
  ): R

  /**
   * Alias for `should.yield(join(...))`
   */
  join(task: Task): R

  join(tasks: Task[]): R

  /**
   * Alias for `should.yield(cancel(...))`
   */
  cancel(task: Task): R

  cancel(tasks: Task[]): R

  cancel(): R

  /**
   * Alias for `should.yield(select(...))`
   */
  select(): R

  select<Fn extends (state: any, ...args: any[]) => any>(
    selector: Fn,
    ...args: Tail<Parameters<Fn>>
  ): R

  /**
   * Alias for `should.yield(actionChannel(...))`
   */
  actionChannel(pattern: ActionPattern, buffer?: Buffer<Action>): R

  /**
   * Alias for `should.yield(flush(...))`
   */
  flush<T>(channel: FlushableChannel<T>): R

  /**
   * Alias for `should.yield(cancelled(...))`
   */
  cancelled(): R

  /**
   * Alias for `should.yield(setContext(...))`
   */
  setContext<C extends object>(props: C): R

  /**
   * Alias for `should.yield(getContext(...))`
   */
  getContext(prop: string): R

  /**
   * Alias for `should.yield(delay(...))`
   */
  delay<T = true>(ms: number, val?: T): R

  /**
   * Alias for `should.yield(throttle(...))`
   */
  throttle<P extends ActionPattern>(
    ms: number,
    pattern: P,
    worker: (action: ActionMatchingPattern<P>) => any,
  ): R

  throttle<P extends ActionPattern, Fn extends (...args: any[]) => any>(
    ms: number,
    pattern: P,
    worker: Fn,
    ...args: HelperWorkerParameters<ActionMatchingPattern<P>, Fn>
  ): R

  throttle<A extends Action>(
    ms: number,
    pattern: ActionPattern<A>,
    worker: (action: A) => any,
  ): R

  throttle<A extends Action, Fn extends (...args: any[]) => any>(
    ms: number,
    pattern: ActionPattern<A>,
    worker: Fn,
    ...args: HelperWorkerParameters<A, Fn>
  ): R

  throttle<T>(
    ms: number,
    channel: TakeableChannel<T>,
    worker: (item: T) => any,
  ): R

  throttle<T, Fn extends (...args: any[]) => any>(
    ms: number,
    channel: TakeableChannel<T>,
    worker: Fn,
    ...args: HelperWorkerParameters<T, Fn>
  ): R

  /**
   * Alias for `should.yield(debounce(...))`
   */
  debounce<P extends ActionPattern>(
    ms: number,
    pattern: P,
    worker: (action: ActionMatchingPattern<P>) => any,
  ): R

  debounce<P extends ActionPattern, Fn extends (...args: any[]) => any>(
    ms: number,
    pattern: P,
    worker: Fn,
    ...args: HelperWorkerParameters<ActionMatchingPattern<P>, Fn>
  ): R

  debounce<A extends Action>(
    ms: number,
    pattern: ActionPattern<A>,
    worker: (action: A) => any,
  ): R

  debounce<A extends Action, Fn extends (...args: any[]) => any>(
    ms: number,
    pattern: ActionPattern<A>,
    worker: Fn,
    ...args: HelperWorkerParameters<A, Fn>
  ): R

  debounce<T>(
    ms: number,
    channel: TakeableChannel<T>,
    worker: (item: T) => any,
  ): R

  debounce<T, Fn extends (...args: any[]) => any>(
    ms: number,
    channel: TakeableChannel<T>,
    worker: Fn,
    ...args: HelperWorkerParameters<T, Fn>
  ): R

  /**
   * Alias for `should.yield(retry(...))`
   */
  retry<Fn extends (...args: any[]) => any>(
    maxTries: number,
    delayLength: number,
    fn: Fn,
    ...args: Parameters<Fn>
  ): R

  /**
   * Alias for `should.yield(all(...))`
   */
  all<T>(effects: T[]): R

  all<T>(effects: { [key: string]: T }): R

  /**
   * Alias for `should.yield(race(...))`
   */
  race<T>(effects: { [key: string]: T }): R

  race<T>(effects: T[]): R
}

export const withExtendedSagaAssertions = <R, S, N>(
  runner: R,
  newState: S,
  isNegated: N,
  _yield: (runner: R, state: S, isNegated: N) => (...args: any[]) => R,
) => {
  const createAlias = (effectCreator: (...args: any[]) => Effect) => (
    ...args: any[]
  ) => _yield(runner, newState, isNegated)(effectCreator(...args))

  return {
    put: createAlias(put),
    take: createAlias(take),
    takeMaybe: createAlias(takeMaybe),
    takeEvery: createAlias(takeEvery),
    takeLatest: createAlias(takeLatest),
    takeLeading: createAlias(takeLeading),
    putResolve: createAlias(putResolve),
    call: createAlias(call),
    apply: createAlias(apply),
    cps: createAlias(cps),
    fork: createAlias(fork),
    spawn: createAlias(spawn),
    join: createAlias(join),
    cancel: createAlias(cancel),
    select: createAlias(select),
    actionChannel: createAlias(actionChannel),
    flush: createAlias(flush),
    cancelled: createAlias(cancelled),
    setContext: createAlias(setContext),
    getContext: createAlias(getContext),
    delay: createAlias(delay),
    throttle: createAlias(throttle),
    debounce: createAlias(debounce),
    retry: createAlias(retry),
    all: createAlias(all),
    race: createAlias(race),
  }
}
