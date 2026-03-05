'use strict';

const ServiceContainer = require('../../src/core/ServiceContainer');

describe('ServiceContainer', () => {
  let container;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  test('returns a registered value', async () => {
    container.register('x', 42);
    expect(await container.get('x')).toBe(42);
  });

  test('calls factory function and caches singleton', async () => {
    const factory = jest.fn(() => ({ id: 1 }));
    container.register('svc', factory);
    const a = await container.get('svc');
    const b = await container.get('svc');
    expect(a).toBe(b);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  test('throws when service is not registered', async () => {
    await expect(container.get('missing')).rejects.toThrow("Service 'missing' not registered");
  });

  test('propagates factory errors instead of silently returning null', async () => {
    container.register('broken', () => { throw new Error('factory failed'); });
    await expect(container.get('broken')).rejects.toThrow('factory failed');
  });

  test('detects circular dependencies', async () => {
    container.register('a', async (c) => await c.get('b'));
    container.register('b', async (c) => await c.get('a'));
    await expect(container.get('a')).rejects.toThrow('Circular dependency');
  });

  test('has() returns correct presence', () => {
    container.register('x', 1);
    expect(container.has('x')).toBe(true);
    expect(container.has('y')).toBe(false);
  });

  test('clear() resets singleton instances', async () => {
    let count = 0;
    container.register('svc', () => ++count);
    await container.get('svc');
    container.clear();
    await container.get('svc');
    expect(count).toBe(2);
  });
});
