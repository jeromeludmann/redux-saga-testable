const SPACE = 2;
const DEPTH = 6;

interface StringifyState {
  space: string;
  totalSpace: string;
  maxDepth: number;
  currentDepth: number;
}

export function stringify(
  value: any,
  opts: { space?: number; depth?: number } = {},
) {
  const space = new Array(opts.space || SPACE).fill(' ').join('');
  const maxDepth = opts.depth || DEPTH;

  return `${space}${stringifyValue(value, {
    space: space,
    totalSpace: space,
    maxDepth,
    currentDepth: 0,
  })}`;
}

function stringifyValue(value: any, state: StringifyState): string {
  switch (typeof value) {
    case 'undefined':
      return 'undefined';

    case 'string':
      return `"${value}"`;

    case 'function':
      return `\u0192 ${value.name || '<anonymous>'}`;

    case 'object':
      if (value === null) return 'null';
      return stringifyObject(value, state);

    default:
      return value.toString();
  }
}

function stringifyObject(value: any, state: StringifyState): string {
  switch (value.constructor) {
    case Object:
      const keys: Array<string | symbol> = Object.keys(value);
      keys.push(...Object.getOwnPropertySymbols(value));

      return stringifyWithTemplate(
        nextState =>
          keys.map(
            key => `${String(key)}: ${stringifyValue(value[key], nextState)}`,
          ),
        state,
        { size: keys.length },
      );

    case Array:
      return stringifyWithTemplate(
        nextState =>
          (value as Array<any>).map(value => stringifyValue(value, nextState)),
        state,
        { wrapper: '[]', size: value.length },
      );

    default:
      return value.toString();
  }
}

function stringifyWithTemplate(
  stringifier: (nextParams: StringifyState) => Array<string | symbol>,
  state: StringifyState,
  opts: { wrapper?: '{}' | '[]'; size: number },
) {
  const [start, end] = (opts.wrapper || '{}').split('');

  const wrap = (str: string = '') => `${start}${str}${end}`;

  if (state.currentDepth === state.maxDepth) {
    return `${wrap(`\u2026`)} (${opts.size})`;
  }

  const nextState = {
    ...state,
    totalSpace: state.totalSpace + state.space,
    currentDepth: state.currentDepth + 1,
  };

  const elements = stringifier(nextState);
  if (elements.length === 0) return wrap();

  const indented = elements
    .map((str: string | symbol) => `${nextState.totalSpace}${String(str)}`)
    .join(',\n');

  return `${wrap(`\n${indented}\n${state.totalSpace}`)}`;
}
