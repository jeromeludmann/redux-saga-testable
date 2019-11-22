import {
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
} from 'redux-saga/effects';
import { Effect } from '@redux-saga/types';
import { defineCallSite } from './utils';
import { SagaRunner, SagaRunnerState } from './types/runner';

export const getExtendedSagaAssertions = (
  runner: SagaRunner,
  state: SagaRunnerState,
  isNegated: () => boolean,
  _yield: (
    runner: SagaRunner,
    state: SagaRunnerState,
    isNegated: () => boolean,
  ) => (...args: any[]) => SagaRunner,
) => {
  const createAlias = (effectCreator: (...effectArgs: any[]) => Effect) => {
    return function alias(...effectArgs: any[]) {
      try {
        return _yield(runner, state, isNegated)(effectCreator(...effectArgs));
      } catch (error) {
        defineCallSite(error, alias);
        throw error;
      }
    };
  };

  return {
    take: createAlias(take),
    takeMaybe: createAlias(takeMaybe),
    takeEvery: createAlias(takeEvery),
    takeLatest: createAlias(takeLatest),
    takeLeading: createAlias(takeLeading),
    put: createAlias(put),
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
  };
};
