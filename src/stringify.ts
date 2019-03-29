const SPACE = 2
const DEPTH = 6

export function stringify(
  value: any,
  opts: { space?: number; depth?: number } = {},
) {
  const space = new Array(opts.space || SPACE).fill(' ').join('')
  const maxDepth = opts.depth || DEPTH

  return `${space}${stringifyValue(value, {
    space: space,
    totalSpace: space,
    maxDepth,
    currentDepth: 0,
  })}`
}

interface State {
  space: string
  totalSpace: string
  maxDepth: number
  currentDepth: number
}

function stringifyValue(value: any, state: State): string {
  switch (typeof value) {
    case 'undefined':
      return 'undefined'

    case 'string':
      return `"${value}"`

    case 'function':
      return value
        .toString()
        .replace(
          /^function\s.*\((.*)\)\s{\s.*}$/,
          (_: string, args: string) => {
            const _args = args === '' ? '' : `(${args})`
            return `\u0192 ${value.name}${_args}`
          },
        )

    case 'object':
      if (value === null) return 'null'
      return stringifyObject(value, state)

    default:
      return value.toString()
  }
}

function stringifyObject(value: any, state: State): string {
  switch (value.constructor) {
    case Object:
      const keys = Object.keys(value)
      return stringifyWithTemplate(
        nextState =>
          keys.map(key => `${key}: ${stringifyValue(value[key], nextState)}`),
        state,
        { size: keys.length },
      )

    case Array:
      return stringifyWithTemplate(
        nextState =>
          (value as Array<any>).map(value => stringifyValue(value, nextState)),
        state,
        { wrapper: '[]', size: value.length },
      )

    default:
      return value.toString()
  }
}

export function stringifyWithTemplate(
  stringifier: (nextParams: State) => string[],
  state: State,
  opts: { prefix?: string; wrapper?: '{}' | '[]'; size?: number } = {},
) {
  const prefix = opts.prefix ? `${opts.prefix} ` : ''
  const [start, end] = (opts.wrapper || '{}').split('')

  const wrap = (str: string = '') => `${prefix}${start}${str}${end}`

  if (state.currentDepth === state.maxDepth) {
    return `${wrap(`\u2026`)}${opts.size ? ` (${opts.size})` : ''}`
  }

  const nextState = {
    ...state,
    totalSpace: state.totalSpace + state.space,
    currentDepth: state.currentDepth + 1,
  }

  const elements = stringifier(nextState)
  if (elements.length === 0) return wrap()

  const indented = elements
    .map((str: string) => `${nextState.totalSpace}${str}`)
    .join(',\n')

  return `${wrap(`\n${indented}\n${state.totalSpace}`)}`
}
