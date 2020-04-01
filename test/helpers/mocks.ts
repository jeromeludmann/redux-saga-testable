/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-empty-function */
import { call } from 'redux-saga/effects';

export const fn1 = () => {};
export const fn2 = () => {};
export const fn3 = () => {};

export const saga = function* () {
  yield call(fn1);
};

export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.stack = `${this.name}\n  at [USER CALL SITE]`;
  }
}
