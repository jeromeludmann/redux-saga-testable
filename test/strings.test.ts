/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { stringify } from 'redux-saga-testable/strings';

describe('stringify()', () => {
  test('undefined', () => {
    const undefinedValue = undefined;
    expect(stringify(undefinedValue)).toMatchSnapshot();
  });

  test('null', () => {
    const nullValue = null;
    expect(stringify(nullValue)).toMatchSnapshot();
  });

  test('number', () => {
    const number = 123;
    expect(stringify(number)).toMatchSnapshot();
  });

  test('string', () => {
    const string = 'string';
    expect(stringify(string)).toMatchSnapshot();
  });

  test('regexp', () => {
    const regexp = /^regexp$/;
    expect(stringify(regexp)).toMatchSnapshot();
  });

  test('function', () => {
    const fn = () => true;
    expect(stringify(fn)).toMatchSnapshot();
  });

  test('anonymous function', () => {
    expect(stringify(() => true)).toMatchSnapshot();
  });

  test('Map', () => {
    const map = new Map();
    expect(stringify(map)).toMatchSnapshot();
  });

  test('Set', () => {
    const set = new Set();
    expect(stringify(set)).toMatchSnapshot();
  });

  test('Symbol', () => {
    const symbol = { [Symbol('key')]: { symbol: Symbol('value') } };
    expect(stringify(symbol)).toMatchSnapshot();
  });

  test('array with custom spaces', () => {
    const array = ['value1', 'value2', 'value3'];

    expect(stringify(array, { tabWidth: 2 })).toMatchSnapshot();
    expect(stringify(array, { tabWidth: 4 })).toMatchSnapshot();
  });

  test('empty array', () => {
    const emptyArray: any[] = [];
    expect(stringify(emptyArray)).toMatchSnapshot();
  });

  test('array with depth level', () => {
    const deepArray = [[[[[['phew!']]]]]];

    expect(stringify(deepArray, { maxDepth: 3 })).toMatchSnapshot();
    expect(stringify(deepArray, { maxDepth: 6 })).toMatchSnapshot();
  });

  test('object with custom spaces', () => {
    const object = {
      key1: 'value1',
      key2: 'value2',
      key3: 'value3',
    };

    expect(stringify(object, { tabWidth: 2 })).toMatchSnapshot();
    expect(stringify(object, { tabWidth: 4 })).toMatchSnapshot();
  });

  test('empty object', () => {
    const emptyObject = {};
    expect(stringify(emptyObject)).toMatchSnapshot();
  });

  test('object with depth level', () => {
    const deepObject = {
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

    expect(stringify(deepObject, { maxDepth: 3 })).toMatchSnapshot();
    expect(stringify(deepObject, { maxDepth: 6 })).toMatchSnapshot();
  });
});
