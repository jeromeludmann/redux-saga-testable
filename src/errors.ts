import { stringify } from './strings';

export class RunnerError extends Error {
  constructor(message: string, callSite: Function, explanations: any[] = []) {
    super(
      explanations.reduce((message, param) => {
        if (typeof param !== 'string') {
          param = stringify(param);
        }
        message += `\n\n${param}`;
        return message;
      }, message),
    );

    this.name = RunnerError.name;
    Error.captureStackTrace(this, callSite);
  }
}

export function captureStackTrace<F extends (...args: any[]) => any>(
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
