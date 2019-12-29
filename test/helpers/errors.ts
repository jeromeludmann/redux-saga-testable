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
