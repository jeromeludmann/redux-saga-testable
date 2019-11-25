export const fn1 = () => {};
export const fn2 = () => {};
export const fn3 = () => {};

export const RUNNER_CALL_SITE = /^ *at .*\/test\/.+\.test\.ts:\d+:\d+.*$/;
export const USER_CALL_SITE = /^ *at \[USER CALL SITE\]$/;

export function runAndCatch(fn: Function): Error & { callSite: string } {
  try {
    fn();
    throw new Error('No error thrown from the given function');
  } catch (error) {
    (error as ReturnType<typeof runAndCatch>).callSite =
      getCallSite(error.stack) ?? '';
    return error;
  }
}

function getCallSite(stack: string): string | null {
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

export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.stack = `${this.name}\n  at [USER CALL SITE]`;
  }
}
