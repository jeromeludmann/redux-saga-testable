export class RunnerError extends Error {
  constructor(message: string | unknown[], callSite: Function) {
    message = Array.isArray(message) ? message : [message];
    super(message.join('\n\n'));

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
