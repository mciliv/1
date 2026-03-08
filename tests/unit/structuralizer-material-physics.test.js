const Structuralizer = require('../../src/server/services/Structuralizer');

describe('Structuralizer material physics flow', () => {
  const createMocks = (overrides = {}) => ({
    aiService: { callAPI: jest.fn() },
    molecularProcessor: { generateSDF: jest.fn(), processSmiles: jest.fn() },
    nameResolver: { resolveName: jest.fn() },
    promptEngine: {
      generateChemicalPrompt: jest.fn(),
      generateDetectionPrompt: jest.fn(),
      generateMaterialPhysicsPrompt: jest.fn().mockReturnValue('test prompt'),
      validateResponse: jest.fn().mockReturnValue(true),
      repairJSON: jest.fn()
    },
    errorHandler: { handle: jest.fn(e => ({ message: e.message })) },
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    materialSceneBuilder: {
      build: jest.fn().mockReturnValue({
        atoms: [{ element: 'O', x: 0, y: 0, z: 0 }],
        box: { a: 10, b: 10, c: 10 },
        metadata: { visualization_mode: 'liquid', atom_count: 1 }
      })
    },
    ...overrides
  });

  it('calls materialSceneBuilder.build() when AI returns liquid mode', async () => {
    const mocks = createMocks();
    mocks.aiService.callAPI.mockResolvedValue({
      object: 'water',
      visualization_mode: 'liquid',
      material_data: { molecular_formula: 'H2O' },
      description: 'Liquid water'
    });

    const struct = new Structuralizer(mocks);
    const result = await struct.materialScene('water');

    expect(mocks.materialSceneBuilder.build).toHaveBeenCalled();
    expect(result.visualization_mode).toBe('liquid');
    expect(result.sceneData).toBeDefined();
    expect(result.sceneData.atoms).toHaveLength(1);
  });

  it('returns molecule mode without calling build when AI returns molecule', async () => {
    const mocks = createMocks();
    mocks.aiService.callAPI.mockResolvedValue({
      object: 'caffeine',
      visualization_mode: 'molecule',
      description: 'Organic molecule'
    });

    const struct = new Structuralizer(mocks);
    const result = await struct.materialScene('caffeine');

    expect(mocks.materialSceneBuilder.build).not.toHaveBeenCalled();
    expect(result.visualization_mode).toBe('molecule');
  });

  it('falls through to molecule mode when _analyzeMaterialPhysics throws', async () => {
    const mocks = createMocks();
    mocks.aiService.callAPI.mockRejectedValue(new Error('Network error'));

    const struct = new Structuralizer(mocks);
    const result = await struct.materialScene('water');

    expect(result.visualization_mode).toBe('molecule');
    expect(mocks.logger.warn).toHaveBeenCalled();
  });

  it('skips material physics when materialSceneBuilder is null', async () => {
    const mocks = createMocks({ materialSceneBuilder: null });
    mocks.aiService.callAPI.mockResolvedValue({
      object: 'iron',
      visualization_mode: 'crystal',
      material_data: { lattice_type: 'BCC' },
      description: 'BCC crystal'
    });

    const struct = new Structuralizer(mocks);
    const result = await struct.materialScene('iron');

    // Should return crystal mode but without sceneData since no builder
    expect(result.visualization_mode).toBe('crystal');
    expect(result.sceneData).toBeUndefined();
  });

  it('response shape includes visualization_mode field', async () => {
    const mocks = createMocks();
    mocks.aiService.callAPI.mockResolvedValue({
      object: 'salt',
      visualization_mode: 'crystal',
      material_data: { lattice_type: 'rock_salt' },
      description: 'Rock salt crystal'
    });

    const struct = new Structuralizer(mocks);
    const result = await struct.materialScene('salt');

    expect(result).toHaveProperty('visualization_mode');
    expect(result).toHaveProperty('object');
  });

  it('returns molecule mode for empty input', async () => {
    const mocks = createMocks();
    const struct = new Structuralizer(mocks);
    const result = await struct.materialScene('');

    expect(result.visualization_mode).toBe('molecule');
    expect(mocks.aiService.callAPI).not.toHaveBeenCalled();
  });
});
