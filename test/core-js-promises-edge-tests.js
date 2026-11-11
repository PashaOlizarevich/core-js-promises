const assert = require('assert').strict;
const tasks = require('../src/core-js-promises-tasks');

const delayedValue = (value, delay) =>
  new Promise((resolve) => setTimeout(resolve, delay, value));

describe('core-js-promises edge cases', () => {
  it('getPromise preserves zero and positive values', async () => {
    assert.equal(await tasks.getPromise(0), 0);
    assert.equal(await tasks.getPromise(42), 42);
  });

  it('getPromise rejects negative values', async () => {
    await assert.rejects(tasks.getPromise(-1), (reason) => reason === -1);
  });

  it('getPromiseResult normalizes both outcomes regardless of their values', async () => {
    assert.equal(
      await tasks.getPromiseResult(Promise.resolve('fail')),
      'success'
    );
    assert.equal(
      await tasks.getPromiseResult(Promise.reject('success')),
      'fail'
    );
  });

  it('getFirstResolvedPromiseResult waits for success after an earlier rejection', async () => {
    assert.equal(
      await tasks.getFirstResolvedPromiseResult([
        delayedValue(1, 20),
        Promise.reject(new Error('ignored')),
        delayedValue(2, 5),
      ]),
      2
    );
  });

  it('getFirstResolvedPromiseResult rejects with undefined when all inputs reject', async () => {
    await assert.rejects(
      tasks.getFirstResolvedPromiseResult([
        Promise.reject(1),
        Promise.reject(2),
      ]),
      (reason) => reason === undefined
    );
  });

  it('getFirstResolvedPromiseResult rejects an empty array', async () => {
    await assert.rejects(
      tasks.getFirstResolvedPromiseResult([]),
      (reason) => reason === undefined
    );
  });

  it('getFirstPromiseResult preserves a real rejection', async () => {
    const error = new Error('first rejection');
    await assert.rejects(
      tasks.getFirstPromiseResult([delayedValue(1, 10), Promise.reject(error)]),
      (reason) => reason === error
    );
  });

  it('getFirstPromiseResult keeps an empty race pending', async () => {
    const pending = tasks.getFirstPromiseResult([]).then(
      () => 'fulfilled',
      () => 'rejected'
    );
    assert.equal(
      await Promise.race([pending, delayedValue('pending', 10)]),
      'pending'
    );
  });

  it('getAllOrNothing preserves input order even when completion order differs', async () => {
    assert.deepEqual(
      await tasks.getAllOrNothing([delayedValue(1, 10), Promise.resolve(2)]),
      [1, 2]
    );
    assert.deepEqual(await tasks.getAllOrNothing([]), []);
  });

  it('getAllOrNothing rejects without waiting for an unfinished input', async () => {
    const error = new Error('failure');
    await assert.rejects(
      tasks.getAllOrNothing([new Promise(() => {}), Promise.reject(error)]),
      (reason) => reason === error
    );
  });

  it('getAllResult preserves zero and input order while replacing rejections', async () => {
    assert.deepEqual(
      await tasks.getAllResult([
        delayedValue(0, 10),
        Promise.reject(2),
        Promise.resolve(3),
        Promise.reject(),
      ]),
      [0, null, 3, null]
    );
    assert.deepEqual(await tasks.getAllResult([]), []);
  });

  it('queuePromises concatenates values in input order', async () => {
    assert.equal(
      await tasks.queuePromises([
        delayedValue(10, 10),
        Promise.resolve(0),
        Promise.resolve(30),
      ]),
      '10030'
    );
    assert.equal(await tasks.queuePromises([]), '');
  });

  it('queuePromises handles an early rejection in a later input', async () => {
    const error = new Error('later input failed');
    await assert.rejects(
      tasks.queuePromises([delayedValue(1, 10), Promise.reject(error)]),
      (reason) => reason === error
    );
  });

  it('queuePromises observes later rejections after the queue has failed', async () => {
    const error = new Error('first input failed');
    const laterFailure = new Promise((resolve, reject) =>
      setTimeout(reject, 5, new Error('later input failed'))
    );
    await assert.rejects(
      tasks.queuePromises([Promise.reject(error), laterFailure]),
      (reason) => reason === error
    );
    await delayedValue(null, 10);
  });
});
