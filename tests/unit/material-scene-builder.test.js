const path = require('path');
const MaterialSceneBuilder = require('../../src/server/services/material-scene-builder');

describe('MaterialSceneBuilder', () => {
  let builder;

  beforeEach(() => {
    builder = new MaterialSceneBuilder({ logger: { warn: jest.fn(), info: jest.fn() } });
  });

  describe('Crystal: NaCl rock salt', () => {
    it('generates correct atom count with Na and Cl elements, centered around origin', () => {
      const result = builder.build({
        visualization_mode: 'crystal',
        material_data: {
          lattice_type: 'rock_salt',
          lattice_constants: { a: 5.64 }
        },
        chemicals: [{ name: 'Sodium chloride' }]
      });

      // rock_salt has 8 basis atoms, 3x3x3 = 27 cells => 216 atoms
      expect(result.atoms).toHaveLength(216);

      const elements = new Set(result.atoms.map(a => a.element));
      expect(elements).toContain('Na');
      expect(elements).toContain('Cl');

      // Check centering: mean position should be near origin
      const meanX = result.atoms.reduce((s, a) => s + a.x, 0) / result.atoms.length;
      const meanY = result.atoms.reduce((s, a) => s + a.y, 0) / result.atoms.length;
      const meanZ = result.atoms.reduce((s, a) => s + a.z, 0) / result.atoms.length;
      expect(Math.abs(meanX)).toBeLessThan(2);
      expect(Math.abs(meanY)).toBeLessThan(2);
      expect(Math.abs(meanZ)).toBeLessThan(2);

      expect(result.metadata.visualization_mode).toBe('crystal');
      expect(result.metadata.lattice_type).toBe('rock_salt');
    });
  });

  describe('Crystal: Iron BCC', () => {
    it('generates correct atom count with Fe elements', () => {
      const result = builder.build({
        visualization_mode: 'crystal',
        material_data: {
          lattice_type: 'BCC',
          lattice_constants: { a: 2.87 }
        },
        chemicals: [{ name: 'Iron' }]
      });

      // BCC has 2 basis atoms, 3x3x3 = 27 cells => 54 atoms
      expect(result.atoms).toHaveLength(54);
      expect(result.atoms.every(a => a.element === 'Fe')).toBe(true);
    });
  });

  describe('Crystal: Diamond cubic', () => {
    it('generates correct atom count with C elements', () => {
      const result = builder.build({
        visualization_mode: 'crystal',
        material_data: {
          lattice_type: 'diamond_cubic',
          lattice_constants: { a: 3.57 }
        },
        chemicals: [{ name: 'Diamond' }]
      });

      // diamond_cubic has 8 basis atoms, 3x3x3 = 27 cells => 216 atoms
      expect(result.atoms).toHaveLength(216);
      expect(result.atoms.every(a => a.element === 'C')).toBe(true);
    });
  });

  describe('Liquid: Water', () => {
    it('loads fixture with 192 atoms (64 molecules)', () => {
      const result = builder.build({
        visualization_mode: 'liquid',
        material_data: { molecular_formula: 'H2O' },
        object: 'water'
      });

      expect(result).not.toBeNull();
      expect(result.atoms).toHaveLength(192);
      expect(result.metadata.molecule_count).toBe(64);
      expect(result.metadata.visualization_mode).toBe('liquid');
    });
  });

  describe('Liquid: Unknown substance', () => {
    it('generates random box', () => {
      const result = builder.build({
        visualization_mode: 'liquid',
        material_data: {
          molecular_formula: 'C2H5OH',
          molecules_hint: 32,
          density_g_cm3: 0.789
        },
        object: 'ethanol'
      });

      expect(result).not.toBeNull();
      // 32 molecules * 3 atoms each (uses water-like geometry fallback)
      expect(result.atoms.length).toBe(96);
      expect(result.metadata.visualization_mode).toBe('liquid');
    });
  });

  describe('Gas: Air', () => {
    it('generates N2 and O2 molecules in sparse box', () => {
      const result = builder.build({
        visualization_mode: 'gas',
        material_data: {
          components: [
            { formula: 'N2', fraction: 0.78 },
            { formula: 'O2', fraction: 0.21 }
          ]
        }
      });

      expect(result).not.toBeNull();
      const elements = new Set(result.atoms.map(a => a.element));
      expect(elements).toContain('N');
      expect(elements).toContain('O');
      expect(result.box.a).toBe(30); // sparse gas box
      expect(result.metadata.visualization_mode).toBe('gas');
    });
  });

  describe('Edge cases', () => {
    it('returns null for unknown visualization mode', () => {
      const result = builder.build({
        visualization_mode: 'unknown',
        material_data: {}
      });
      expect(result).toBeNull();
    });

    it('handles missing material_data gracefully', () => {
      const result = builder.build({
        visualization_mode: 'crystal',
        material_data: null
      });
      // Should use defaults and not throw
      expect(result).not.toBeNull();
      expect(result.atoms.length).toBeGreaterThan(0);
    });
  });
});
