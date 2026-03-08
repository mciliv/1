const Structuralizer = require('../../src/server/services/Structuralizer');

// Minimal mocks — only what Structuralizer requires to construct
const createStructuralizer = () => {
  const mocks = {
    aiService: { callAPI: jest.fn() },
    molecularProcessor: { generateSDF: jest.fn(), processSmiles: jest.fn() },
    nameResolver: { resolveName: jest.fn() },
    promptEngine: {
      generateChemicalPrompt: jest.fn(),
      generateDetectionPrompt: jest.fn(),
      validateResponse: jest.fn(),
      repairJSON: jest.fn(),
    },
    errorHandler: { handle: jest.fn() },
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    cache: { get: jest.fn(), set: jest.fn() },
  };
  return new Structuralizer(mocks);
};

describe('Protein Detection (_detectProtein)', () => {
  let s;
  beforeAll(() => { s = createStructuralizer(); });

  // --- Explicit PDB IDs ---
  describe('explicit PDB IDs', () => {
    it.each([
      ['4HHB', '4HHB'],
      ['1crn', '1CRN'],
      ['pdb 4DWW', '4DWW'],
      ['PDB:6VXX', '6VXX'],
      ['pdb-1MBN', '1MBN'],
    ])('detects "%s" as PDB %s', (input, expectedPdb) => {
      const result = s._detectProtein(input);
      expect(result).not.toBeNull();
      expect(result.pdbId).toBe(expectedPdb);
    });
  });

  // --- Known proteins by name ---
  describe('known protein names', () => {
    it.each([
      ['nattokinase', '4DWW', 'Nattokinase'],
      ['hemoglobin', '4HHB', 'Hemoglobin'],
      ['haemoglobin', '4HHB', 'Hemoglobin'],
      ['insulin', '4INS', 'Insulin'],
      ['myoglobin', '1MBN', 'Myoglobin'],
      ['lysozyme', '1LYZ', 'Lysozyme'],
      ['collagen', '1CAG', 'Collagen'],
      ['keratin', '6EC0', 'Keratin'],
      ['actin', '1ATN', 'Actin'],
      ['tubulin', '1TUB', 'Tubulin'],
      ['albumin', '1AO6', 'Human Serum Albumin'],
      ['serum albumin', '1AO6', 'Human Serum Albumin'],
      ['gfp', '1EMA', 'Green Fluorescent Protein'],
      ['green fluorescent protein', '1EMA', 'Green Fluorescent Protein'],
      ['cytochrome c', '1HRC', 'Cytochrome C'],
      ['ubiquitin', '1UBQ', 'Ubiquitin'],
      ['trypsin', '1TRN', 'Trypsin'],
      ['catalase', '1DGH', 'Catalase'],
      ['ferritin', '1FHA', 'Ferritin'],
      ['rhodopsin', '1F88', 'Rhodopsin'],
      ['p53', '1TUP', 'p53 Tumor Suppressor'],
      ['crambin', '1CRN', 'Crambin'],
      ['dna polymerase', '1TAU', 'DNA Polymerase'],
      ['rna polymerase', '1I6H', 'RNA Polymerase'],
      ['atp synthase', '1E79', 'ATP Synthase'],
      ['spike protein', '6VXX', 'SARS-CoV-2 Spike Protein'],
      ['cas9', '4OO8', 'CRISPR-Cas9'],
      ['crispr', '4OO8', 'CRISPR-Cas9'],
      ['subtilisin', '4DWW', 'Subtilisin NAT (Nattokinase)'],
    ])('detects "%s" → PDB %s (%s)', (input, expectedPdb, expectedName) => {
      const result = s._detectProtein(input);
      expect(result).not.toBeNull();
      expect(result.pdbId).toBe(expectedPdb);
      expect(result.name).toBe(expectedName);
    });
  });

  // --- Partial / qualified matches ---
  describe('partial matches', () => {
    it.each([
      ['human hemoglobin', '4HHB'],
      ['bovine insulin', '4INS'],
      ['chicken lysozyme', '1LYZ'],
      ['human serum albumin', '1AO6'],
      ['the spike protein of sars-cov-2', '6VXX'],
    ])('detects "%s" → PDB %s', (input, expectedPdb) => {
      const result = s._detectProtein(input);
      expect(result).not.toBeNull();
      expect(result.pdbId).toBe(expectedPdb);
    });
  });

  // --- Non-proteins should return null ---
  describe('non-protein inputs', () => {
    it.each([
      'coffee',
      'water',
      'aspirin',
      'sodium chloride',
      'caffeine',
      'ethanol',
      'vitamin C',
      '',
    ])('returns null for "%s"', (input) => {
      expect(s._detectProtein(input)).toBeNull();
    });
  });
});

describe('materialScene protein routing', () => {
  it('returns visualization_mode "protein" for nattokinase', async () => {
    const s = createStructuralizer();
    const result = await s.materialScene('nattokinase');
    expect(result.visualization_mode).toBe('protein');
    expect(result.pdbId).toBe('4DWW');
    expect(result.proteinName).toBe('Nattokinase');
  });

  it('returns visualization_mode "protein" for explicit PDB ID', async () => {
    const s = createStructuralizer();
    const result = await s.materialScene('4HHB');
    expect(result.visualization_mode).toBe('protein');
    expect(result.pdbId).toBe('4HHB');
  });

  it('does not route "coffee" to protein mode', async () => {
    const s = createStructuralizer();
    // Mock the AI call so it doesn't actually hit the API
    s._analyzeMaterialPhysics = jest.fn().mockResolvedValue({
      visualization_mode: 'molecule',
      object: 'coffee',
    });
    const result = await s.materialScene('coffee');
    expect(result.visualization_mode).toBe('molecule');
  });
});
