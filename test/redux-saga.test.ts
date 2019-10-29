import * as assert from 'assert';
import { select, call, put } from 'redux-saga/effects';
import { createRunner, throwError } from 'redux-saga-testable';

describe('for redux-saga docs', () => {
  const myApi = (url: string, value: string) => Promise.resolve({ url, value });
  const somethingFromState = (state: any) => state;
  const success = (payload: any) => ({ type: 'SUCCESS', payload });
  const error = (e: Error) => ({ type: 'FAILURE', error: e });
  const selectedValue = 'someValue';
  const response = { status: 1, json: () => ['item1', 'item2', 'item3'] };

  function* callApi(url: string) {
    const someValue = yield select(somethingFromState);
    try {
      const result = yield call(myApi, url, someValue);
      yield put(success(result.json()));
      return result.status;
    } catch (e) {
      yield put(error(e));
      return -1;
    }
  }

  test('test success case with redux-saga-testable', () => {
    createRunner(callApi, 'url')
      .map(select(somethingFromState), selectedValue)
      .map(call(myApi, 'url', selectedValue), response)
      .should.put(success(response.json()));
  });

  test('test error case with redux-saga-testable', () => {
    const httpError = new Error('Network error');

    createRunner(callApi, 'url')
      .map(select(somethingFromState), selectedValue)
      .map(call(myApi, 'url', selectedValue), throwError(httpError))
      .should.put(error(httpError))
      .should.return(-1);
  });

  test('record effects with redux-saga-testable', () => {
    const output = createRunner(callApi, 'url')
      .map(select(somethingFromState), selectedValue)
      .map(call(myApi, 'url', selectedValue), response)
      .run();

    // produced output.effects
    //
    // [
    //   select(somethingFromState),
    //   call(myApi, 'url', selectedValue),
    //   put(success(response.json())),
    // ]

    assert.deepEqual(output.effects[1], call(myApi, 'url', selectedValue));
    assert.deepEqual(output.effects[2], put(success(response.json())));
  });
});
