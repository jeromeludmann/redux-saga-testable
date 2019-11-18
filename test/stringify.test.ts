import { stringify } from '../src/stringify';

describe('stringify()', () => {
  test('undefined', () => {
    const value = undefined;
    expect(stringify(value)).toEqual('  undefined');
  });

  test('null', () => {
    const value = null;
    expect(stringify(value)).toEqual('  null');
  });

  test('number', () => {
    const value = 123;
    expect(stringify(value)).toEqual('  123');
  });

  test('string', () => {
    const value = 'string';
    expect(stringify(value)).toEqual('  "string"');
  });

  test('regexp', () => {
    const value = /^regexp$/;
    expect(stringify(value)).toEqual('  /^regexp$/');
  });

  test('anonymous function', () => {
    expect(stringify(function() {})).toEqual('  ƒ <anonymous>');
  });

  test('named function', () => {
    const value = function fn() {};
    expect(stringify(value)).toEqual('  ƒ fn');
  });

  test('Map', () => {
    const value = new Map();
    expect(stringify(value)).toEqual('  [object Map]');
  });

  test('Symbol', () => {
    const value = { [Symbol('key')]: { symbol: Symbol('value') } };
    expect(stringify(value)).toEqual(`  {
    Symbol(key): {
      symbol: Symbol(value)
    }
  }`);
  });

  test('empty array', () => {
    const emptyArray: any[] = [];
    expect(stringify(emptyArray)).toEqual('  []');
  });

  test('array with custom spaces', () => {
    const value = ['value1', 'value2', 'value3'];

    expect(stringify(value, { space: 2 })).toEqual(`  [
    "value1",
    "value2",
    "value3"
  ]`);

    expect(stringify(value, { space: 4 })).toEqual(`    [
        "value1",
        "value2",
        "value3"
    ]`);
  });

  test('array with depth level', () => {
    const value = [[[[[['phew!']]]]]];

    expect(stringify(value, { depth: 3 })).toEqual(`  [
    [
      [
        […] (1)
      ]
    ]
  ]`);

    expect(stringify(value, { depth: 6 })).toEqual(`  [
    [
      [
        [
          [
            [
              "phew!"
            ]
          ]
        ]
      ]
    ]
  ]`);
  });

  test('empty object', () => {
    const value = {};
    expect(stringify(value)).toEqual(`  {}`);
  });

  test('object with custom spaces', () => {
    const value = { key1: 'value1', key2: 'value2', key3: 'value3' };

    expect(stringify(value, { space: 2 })).toEqual(`  {
    key1: "value1",
    key2: "value2",
    key3: "value3"
  }`);

    expect(stringify(value, { space: 4 })).toEqual(`    {
        key1: "value1",
        key2: "value2",
        key3: "value3"
    }`);
  });

  test('object with depth level', () => {
    const value = {
      key1: {
        key2: {
          key3: {
            key4: {
              key5: {
                key6: 'phew!',
              },
            },
          },
        },
      },
    };

    expect(stringify(value, { depth: 3 })).toEqual(`  {
    key1: {
      key2: {
        key3: {…} (1)
      }
    }
  }`);

    expect(stringify(value, { depth: 6 })).toEqual(`  {
    key1: {
      key2: {
        key3: {
          key4: {
            key5: {
              key6: "phew!"
            }
          }
        }
      }
    }
  }`);
  });
});
