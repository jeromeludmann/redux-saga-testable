/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { call } from 'redux-saga/effects';

export const fn1 = () => {};
export const fn2 = () => {};
export const fn3 = () => {};

export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.stack = `${this.name}\n  at [USER CALL SITE]`;
  }
}

export const RUNNER_CALL_SITE = /^ *at .*\/test\/.+\.test\.ts:\d+:\d+.*$/;

export const USER_CALL_SITE = /^ *at \[USER CALL SITE\]$/;

function getFirstCallSite(stack: string): string | null {
  if (!stack) {
    return null;
  }

  const stacks: string[] = stack.split('\n');

  for (;;) {
    if (stacks[0].trimLeft().startsWith('at ')) {
      return stacks[0];
    }

    stacks.shift();

    if (stacks.length === 0) {
      return null;
    }
  }
}

export function catchError(fn: Function): Error & { callSite: string } {
  try {
    fn();
  } catch (error) {
    (error as ReturnType<typeof catchError>).callSite =
      getFirstCallSite(error.stack) ?? '';
    return error;
  }

  const e = new Error('No error thrown from the given function');
  Error.captureStackTrace(e, catchError);
  throw e;
}

export const saga = function*() {
  yield call(fn1);
};

export const sagaInError = function*() {
  yield call(fn1);
  throw new UserError('Failure');
};

export const infiniteSaga = function*() {
  for (;;) yield call(fn1);
};
