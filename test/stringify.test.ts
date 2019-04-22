import { stringify, stringifyWithTemplate } from '../src/stringify'

describe('stringify()', () => {
  test('stringifies undefined', () => {
    expect(stringify(undefined)).toEqual('  undefined')
  })

  test('stringifies null', () => {
    expect(stringify(null)).toEqual('  null')
  })

  test('stringifies a number', () => {
    expect(stringify(123)).toEqual('  123')
  })

  test('stringifies a string', () => {
    expect(stringify('string')).toEqual('  "string"')
  })

  test('stringifies a regular expression', () => {
    expect(stringify(/^regexp$/)).toEqual('  /^regexp$/')
  })

  test('stringifies an anonymous function', () => {
    expect(stringify(function() {})).toEqual('  ƒ <anonymous>')
  })

  test('stringifies a named function', () => {
    expect(stringify(function fn() {})).toEqual('  ƒ fn')
  })

  test('stringifies an object', () => {
    expect(stringify({ key1: 'value1', key2: 'value2' })).toEqual(`  {
    key1: "value1",
    key2: "value2"
  }`)
  })

  test('stringifies an object with custom options', () => {
    expect(
      stringify({ key1: 'value1', key2: 'value2' }, { space: 4, depth: 2 }),
    ).toEqual(`    {
        key1: "value1",
        key2: "value2"
    }`)
  })

  test('stringifies an array', () => {
    expect(stringify([1, 2, 3])).toEqual(`  [
    1,
    2,
    3
  ]`)
  })

  test('stringifies an empty array', () => {
    expect(stringify([])).toEqual('  []')
  })

  test('stringifies a Map', () => {
    expect(stringify(new Map())).toEqual('  [object Map]')
  })
})

describe('stringifyWithTemplate()', () => {
  const state = {
    currentDepth: 0,
    maxDepth: 10,
    space: '  ',
    totalSpace: '  ',
  }

  const stateWithMaxDepthReached = {
    ...state,
    currentDepth: 0,
    maxDepth: 0,
  }

  const values = [{ key: 'value1' }, { key: 'value2' }]

  test('stringifies with default "options" provided', () => {
    expect(stringifyWithTemplate(() => values.map(value => value.key), state))
      .toEqual(`{
    value1,
    value2
  }`)
  })

  test('stringifies with custom "options" provided', () => {
    expect(
      stringifyWithTemplate(() => values.map(value => value.key), state, {
        prefix: 'CustomArray',
        wrapper: '[]',
        size: values.length,
      }),
    ).toEqual(`CustomArray [
    value1,
    value2
  ]`)
  })

  test('stringifies when "maxDepth" is reached with "size" option provided', () => {
    expect(
      stringifyWithTemplate(
        () => values.map(value => value.key),
        stateWithMaxDepthReached,
        { wrapper: '[]', size: values.length },
      ),
    ).toEqual('[…] (2)')
  })

  test('stringifies when "maxDepth" is reached without "size" option provided', () => {
    expect(
      stringifyWithTemplate(
        () => values.map(value => value.key),
        stateWithMaxDepthReached,
        { wrapper: '[]' },
      ),
    ).toEqual('[…]')
  })
})
