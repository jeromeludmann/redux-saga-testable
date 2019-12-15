import { stringify } from './strings';

export class RunnerError extends Error {
  constructor(message: string | unknown[], callSite: Function) {
    super(
      (Array.isArray(message) ? message : [message])
        .map(line => (typeof line === 'string' ? line : stringify(line)))
        .join('\n\n'),
    );

    this.name = RunnerError.name;
    Error.captureStackTrace(this, callSite);
  }
}

export function captureStackTrace<F extends (...args: unknown[]) => any>(
  fn: F,
  callSite: Function,
): ReturnType<F> {
  try {
    return fn();
  } catch (error) {
    if (error.name === RunnerError.name) {
      Error.captureStackTrace(error, callSite);
    }

    throw error;
  }
}
