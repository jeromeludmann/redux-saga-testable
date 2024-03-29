export class RunnerError extends Error {
  constructor(message: string | unknown[], callSite: (...args: any[]) => any) {
    message = Array.isArray(message) ? message : [message];
    super(message.join('\n\n'));
    this.name = RunnerError.name;
    Error.captureStackTrace(this, callSite);
  }
}

export function captureStackTrace<F extends (...args: unknown[]) => any>(
  fn: F,
  callSite: (...args: any[]) => any,
): ReturnType<F> {
  try {
    return fn();
  } catch (error: any) {
    if (error.name === RunnerError.name) {
      Error.captureStackTrace(error, callSite);
    }

    throw error;
  }
}
