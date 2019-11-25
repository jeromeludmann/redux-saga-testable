import { stringify } from 'redux-saga-testable/strings';

describe('stringify()', () => {
  test('undefined', () => {
    const value = undefined;
    expect(stringify(value)).toMatchSnapshot();
  });

  test('null', () => {
    const value = null;
    expect(stringify(value)).toMatchSnapshot();
  });

  test('number', () => {
    const value = 123;
    expect(stringify(value)).toMatchSnapshot();
  });

  test('string', () => {
    const value = 'string';
    expect(stringify(value)).toMatchSnapshot();
  });

  test('regexp', () => {
    const value = /^regexp$/;
    expect(stringify(value)).toMatchSnapshot();
  });

  test('anonymous function', () => {
    expect(stringify(function() {})).toMatchSnapshot();
  });

  test('named function', () => {
    const value = function fn() {};
    expect(stringify(value)).toMatchSnapshot();
  });

  test('Map', () => {
    const value = new Map();
    expect(stringify(value)).toMatchSnapshot();
  });

  test('Symbol', () => {
    const value = { [Symbol('key')]: { symbol: Symbol('value') } };
    expect(stringify(value)).toMatchSnapshot();
  });

  test('empty array', () => {
    const emptyArray: any[] = [];
    expect(stringify(emptyArray)).toMatchSnapshot();
  });

  test('array with custom spaces', () => {
    const value = ['value1', 'value2', 'value3'];

    expect(stringify(value, { tabWidth: 2 })).toMatchSnapshot();
    expect(stringify(value, { tabWidth: 4 })).toMatchSnapshot();
  });

  test('array with depth level', () => {
    const value = [[[[[['phew!']]]]]];

    expect(stringify(value, { maxDepth: 3 })).toMatchSnapshot();
    expect(stringify(value, { maxDepth: 6 })).toMatchSnapshot();
  });

  test('empty object', () => {
    const value = {};
    expect(stringify(value)).toMatchSnapshot();
  });

  test('object with custom spaces', () => {
    const value = { key1: 'value1', key2: 'value2', key3: 'value3' };

    expect(stringify(value, { tabWidth: 2 })).toMatchSnapshot();
    expect(stringify(value, { tabWidth: 4 })).toMatchSnapshot();
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

    expect(stringify(value, { maxDepth: 3 })).toMatchSnapshot();
    expect(stringify(value, { maxDepth: 6 })).toMatchSnapshot();
  });
});
