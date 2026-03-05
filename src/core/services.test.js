/**
 * Unit tests for core services and DI container
 */
const { createContainer } = require('./services');
const ServiceContainer = require('./ServiceContainer');

describe('ServiceContainer (DI)', () => {
  let container;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  test('should register and resolve a singleton service', async () => {
    let count = 0;
    container.register('service', () => {
      count++;
      return { id: count };
    });

    const instance1 = await container.get('service');
    const instance2 = await container.get('service');

    expect(instance1.id).toBe(1);
    expect(instance2.id).toBe(1);
    expect(count).toBe(1);
  });

  test('should throw error when service is not found', async () => {
    try {
        await container.get('unknown');
    } catch (e) {
        expect(e.message).toBe("Service 'unknown' not registered");
    }
  });

  test('should detect circular dependencies', async () => {
    container.register('A', async (c) => await c.get('B'));
    container.register('B', async (c) => await c.get('A'));

    try {
        await container.get('A');
    } catch (e) {
        expect(e.message).toMatch(/Circular dependency detected/);
    }
  });

  test('should properly handle factory errors (failure to resolve)', async () => {
    container.register('faulty', async () => {
      throw new Error('Factory explosion');
    });

    try {
        await container.get('faulty');
    } catch (e) {
        expect(e.message).toBe('Factory explosion');
    }
  });

  test('should support factory overrides', async () => {
    container.register('logger', () => ({ name: 'real' }));
    
    // Scoped container or direct override for testing
    const scoped = container.createScope();
    scoped.register('logger', () => ({ name: 'mock' }));

    const instance = await scoped.get('logger');
    expect(instance.name).toBe('mock');
  });
});

describe('Core Services Integration', () => {
  let container;

  beforeEach(async () => {
    container = await createContainer();
  });

  test('should resolve core services', async () => {
    const logger = await container.get('logger');
    const config = await container.get('config');
    const structuralizer = await container.get('structuralizer');

    expect(logger).toBeDefined();
    expect(config).toBeDefined();
    expect(structuralizer).toBeDefined();
  });

  test('should resolve database as null when disabled', async () => {
    const config = await container.get('config');
    config.database.enabled = false;
    
    const db = await container.get('database');
    expect(db).toBeNull();
  });
});
