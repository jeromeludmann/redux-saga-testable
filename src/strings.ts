const TAB_WIDTH = 2;
const MAX_DEPTH = 6;

type StringifierOptions = Partial<{
  tabWidth: number;
  maxDepth: number;
}>;

class Stringifier {
  private readonly tabWidth: string;
  private readonly maxDepth: number;
  private currentWidth: string;
  private currentDepth: number;

  constructor(opts: StringifierOptions) {
    this.tabWidth = new Array(opts.tabWidth ?? TAB_WIDTH).fill(' ').join('');
    this.maxDepth = opts.maxDepth ?? MAX_DEPTH;
    this.currentWidth = this.tabWidth;
    this.currentDepth = 0;
  }

  stringify(value: unknown): string {
    return `${this.tabWidth}${this.stringifyValue(value)}`;
  }

  private stringifyValue(value: any): string {
    switch (typeof value) {
      case 'undefined':
        return 'undefined';

      case 'string':
        return `"${value}"`;

      case 'function':
        return `\u0192 ${value.name || '<anonymous>'}`;

      case 'object':
        return this.stringifyObject(value);

      default:
        return value.toString();
    }
  }

  private stringifyObject(value: any): string {
    if (value === null) {
      return 'null';
    }

    if (Array.isArray(value)) {
      return this.stringifyArray(value);
    }

    if (value.constructor !== Object) {
      return value.toString();
    }

    const keys = [
      ...Object.keys(value),
      ...Object.getOwnPropertySymbols(value),
    ];

    return this.stringifyNested(
      () =>
        keys.map((key) => `${String(key)}: ${this.stringifyValue(value[key])}`),
      { wrapper: '{}', size: keys.length },
    );
  }

  private stringifyArray(value: unknown[]): string {
    return this.stringifyNested(
      () => value.map((value) => this.stringifyValue(value)),
      {
        wrapper: '[]',
        size: value.length,
      },
    );
  }

  private stringifyNested(
    stringifyFn: () => string[],
    opts: { wrapper: '{}' | '[]'; size: number },
  ): string {
    const [start, end] = opts.wrapper.split('');
    const wrap = (str: string): string => `${start}${str}${end}`;

    if (this.currentDepth === this.maxDepth) {
      return `${wrap(`\u2026`)} (${opts.size})`;
    }

    const prevWidth = this.currentWidth;

    this.currentWidth += this.tabWidth;
    ++this.currentDepth;

    const elements = stringifyFn();

    if (elements.length === 0) {
      return wrap('');
    }

    const nested = elements
      .map((str) => `${this.currentWidth}${String(str)}`)
      .join(',\n');

    this.currentWidth = prevWidth;

    return `${wrap(`\n${nested}\n${prevWidth}`)}`;
  }
}

export function stringify(
  value: unknown,
  { tabWidth, maxDepth }: StringifierOptions = {},
): string {
  return new Stringifier({ tabWidth, maxDepth }).stringify(value);
}
