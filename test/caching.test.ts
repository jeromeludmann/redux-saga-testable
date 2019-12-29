import { call } from 'redux-saga/effects';
import { Engine } from 'redux-saga-testable/engine';
import { saga, fn1 } from './helpers/mocks';

describe('output caching', () => {
  test('new Engine() begins without a cached output', () => {
    const engine = new Engine(saga, []);

    expect((engine as any).cachedOutput).toEqual(null);
  });

  test('engine.run() produces a cached output', () => {
    const engine = new Engine(saga, []);
    engine.run();

    expect((engine as any).cachedOutput).not.toEqual(null);
  });

  test('engine.map() resets the cached output', () => {
    const engine = new Engine(saga, []);
    engine.run();
    engine.map(call(fn1), 'result');

    expect((engine as any).cachedOutput).toEqual(null);
  });

  test('engine.catch() resets the cached output', () => {
    const engine = new Engine(saga, []);
    engine.run();
    engine.catch(Error);

    expect((engine as any).cachedOutput).toEqual(null);
  });

  test('engine.run() runs the saga the first time', () => {
    const engine = new Engine(saga, []);
    const engineSaga = jest.spyOn(engine as any, 'saga');
    engine.run();

    expect(engineSaga).toHaveBeenCalled();
  });

  test('engine.run() does not run the saga and reuses the cached output', () => {
    const engine = new Engine(saga, []);
    engine.run();
    const engineSaga = jest.spyOn(engine as any, 'saga');
    engine.run();

    expect(engineSaga).not.toHaveBeenCalled();
  });
});
