const promptEngine = require('../../src/core/PromptEngine');

describe('PromptEngine material physics', () => {
  describe('generateMaterialPhysicsPrompt', () => {
    it('returns a string containing the object name', () => {
      const prompt = promptEngine.generateMaterialPhysicsPrompt('iron');
      expect(typeof prompt).toBe('string');
      expect(prompt).toContain('iron');
    });

    it('includes template content about visualization modes', () => {
      const prompt = promptEngine.generateMaterialPhysicsPrompt('water');
      expect(prompt).toContain('visualization');
      expect(prompt).toContain('crystal');
      expect(prompt).toContain('liquid');
      expect(prompt).toContain('gas');
      expect(prompt).toContain('molecule');
    });
  });

  describe('validateResponse for material type', () => {
    it('accepts valid crystal response', () => {
      const valid = promptEngine.validateResponse('material', {
        object: 'salt',
        visualization_mode: 'crystal',
        material_data: { lattice_type: 'rock_salt' }
      });
      expect(valid).toBe(true);
    });

    it('accepts valid liquid response', () => {
      const valid = promptEngine.validateResponse('material', {
        object: 'water',
        visualization_mode: 'liquid'
      });
      expect(valid).toBe(true);
    });

    it('accepts valid molecule response', () => {
      const valid = promptEngine.validateResponse('material', {
        object: 'caffeine',
        visualization_mode: 'molecule'
      });
      expect(valid).toBe(true);
    });

    it('accepts valid text response', () => {
      const valid = promptEngine.validateResponse('material', {
        object: 'wood',
        visualization_mode: 'text'
      });
      expect(valid).toBe(true);
    });

    it('rejects invalid visualization_mode', () => {
      const valid = promptEngine.validateResponse('material', {
        object: 'iron',
        visualization_mode: 'invalid_mode'
      });
      expect(valid).toBe(false);
    });

    it('rejects missing object', () => {
      const valid = promptEngine.validateResponse('material', {
        visualization_mode: 'crystal'
      });
      expect(valid).toBe(false);
    });

    it('rejects null response', () => {
      const valid = promptEngine.validateResponse('material', null);
      expect(valid).toBe(false);
    });
  });
});
