import { stringify } from './strings';

export class RunnerError extends Error {
  constructor(message: string, params: any[] = [], fn?: Function) {
    super(
      params.reduce((message, param) => {
        if (typeof param !== 'string') {
          param = stringify(param);
        }
        message += `\n\n${param}`;
        return message;
      }, message),
    );

    this.name = RunnerError.name;
    Error.captureStackTrace(this, fn ?? RunnerError);
  }
}

export function setCallSite(error: Error, fn: Function) {
  if (error.name === RunnerError.name) {
    Error.captureStackTrace(error, fn);
  }
}
