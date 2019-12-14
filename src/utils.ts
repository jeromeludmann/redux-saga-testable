import { IO } from '@redux-saga/symbols';

export type ErrorPattern =
  | string
  | RegExp
  | Error
  | { new (...args: any[]): any };

export function matchError(error: Error, pattern: ErrorPattern): boolean {
  if (typeof error !== 'object') {
    error = { name: '', message: error };
  }

  if (typeof pattern === 'string' && error.message.includes(pattern)) {
    return true;
  }

  if (pattern instanceof RegExp && pattern.test(error.message)) {
    return true;
  }

  if (
    pattern instanceof Error &&
    error.name === pattern.name &&
    error.message === pattern.message
  ) {
    return true;
  }

  if (typeof pattern === 'function' && error instanceof pattern) {
    return true;
  }

  return false;
}

export function isEffect(obj: any): boolean {
  return obj !== null && typeof obj === 'object' && IO in obj;
}
