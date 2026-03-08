const fs = require('fs');
const path = require('path');

class Structuralizer {
  constructor(dependencies = {}) {
    // Required dependencies
    this.aiService = dependencies.aiService;
    this.molecularProcessor = dependencies.molecularProcessor;
    this.nameResolver = dependencies.nameResolver;
    this.promptEngine = dependencies.promptEngine;
    this.errorHandler = dependencies.errorHandler;
    this.logger = dependencies.logger;

    // Optional dependencies
    this.materialSceneBuilder = dependencies.materialSceneBuilder || null;
    this.cache = dependencies.cache || null;
    
    // Configuration
    this.config = dependencies.config || {
      aiTimeout: 10000,
      maxRetries: 2,
      cacheEnabled: true
    };
    
    // Validate required dependencies
    this._validateDependencies();

    // Utility for pretty-printing responses (for debugging)
    this._prettyPrint = (obj, label = 'Response') => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Structuralizer] ${label}:`);
        console.log(JSON.stringify(obj, null, 2));
      }
      return obj;
    };
  }
  
  /**
   * @private
   */
  // Requires OPENAI_API_KEY to be present in environment and DI to provide aiClient.
  async _detectObjectInImage(imageBase64, x, y) {
    this.logger.info('Detecting object in image', {
      hasCoordinates: x !== undefined && y !== undefined
    });
    
    const prompt = this.promptEngine.generateDetectionPrompt({ x, y });
    
    const response = await this._callAI({
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { 
            type: 'image_url', 
            image_url: { 
              url: imageBase64.startsWith('http') 
                ? imageBase64 
                : `data:image/jpeg;base64,${imageBase64}`
            }
          }
        ]
      }],
      max_tokens: 200
    });
    
    if (!this.promptEngine.validateResponse('detection', response)) {
      throw new Error('Invalid detection response from AI');
    }

    const result = response;
    
    return result;
  }
  /**
   * Validate that all required dependencies are provided
   * @private
   */
  _validateDependencies() {
    const required = [
      'aiService',
      'molecularProcessor',
      'nameResolver',
      'promptEngine',
      'errorHandler',
      'logger'
    ];
    
    const missing = required.filter(dep => !this[dep]);
    if (missing.length > 0) {
      throw new Error(`Missing required dependencies: ${missing.join(', ')}`);
    }
  }
  

  async chemicals(payload) {
    const startTime = Date.now();

    if (this.cache && this.config.cacheEnabled) {
      const cacheKey = this._getCacheKey(payload);
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.info('Cache hit for prediction', {
          object: payload.object,
          duration: Date.now() - startTime
        });
        return cached;
      }
    }

    // Pass full payload so _chemicals can destructure { object, imageBase64, ... }
    const result = await this._chemicals(payload);

    if (this.cache && this.config.cacheEnabled && result) {
      const cacheKey = this._getCacheKey(payload);
      await this.cache.set(cacheKey, result, 300000); // 5 min TTL
    }

    this.logger.info('Prediction completed', {
      object: result.object,
      chemicalCount: result.chemicals?.length || 0,
      duration: Date.now() - startTime
    });

    return result;
  }
  
  /**
   * @private
   */
  async _chemicals(payload) {
    const {
      object: inputObject,
      imageBase64,
      x,
      y,
      lookupMode = 'GPT-5'
    } = payload;
    
    let objectText = inputObject?.trim() || '';
    let recommendedBox = null;
    let reason = null;

    // Step 1: Extract object from image if needed
    if (!objectText && imageBase64) {
      const detection = await this._detectObjectInImage(imageBase64, x, y);
      objectText = detection.object;
      recommendedBox = detection.recommendedBox;
    }
    
    // Step 2: Analyze using AI
    let predictionResult;

    // Use AI analysis for all lookup modes (simplified)
    predictionResult = await this._analyzeChemicals(objectText);
    
    // Step 3: Generate 3D structures
    const molecules = await this._generateStructures(
      predictionResult.chemicals || []
    );
    
    return {
      object: objectText,
      chemicals: molecules,
      recommendedBox,
      reason: predictionResult.reason || reason
    };
  }

  /**
   * Analyze material physics for a given object text.
   * Returns visualization_mode and scene data for crystal/liquid/gas,
   * or falls through to molecule mode.
   */
  async materialScene(objectText) {
    const trimmed = (objectText || '').trim();
    if (!trimmed) {
      return { visualization_mode: 'molecule', object: trimmed };
    }

    // Detect protein/PDB inputs before hitting the AI pipeline
    const proteinMatch = this._detectProtein(trimmed);
    if (proteinMatch) {
      return {
        visualization_mode: 'protein',
        object: trimmed,
        pdbId: proteinMatch.pdbId,
        proteinName: proteinMatch.name,
        description: `Protein structure: ${proteinMatch.name} (PDB: ${proteinMatch.pdbId})`
      };
    }

    try {
      const result = await this._analyzeMaterialPhysics(trimmed);

      const mode = result.visualization_mode;
      if ((mode === 'crystal' || mode === 'liquid' || mode === 'gas') && this.materialSceneBuilder) {
        const sceneData = this.materialSceneBuilder.build(result);
        if (sceneData) {
          return {
            visualization_mode: mode,
            object: result.object || trimmed,
            sceneData,
            description: result.description,
            reason: result.reason
          };
        }
      }

      // text or molecule mode, or no scene builder
      return {
        visualization_mode: mode,
        object: result.object || trimmed,
        description: result.description,
        textDescription: mode === 'text' ? result.description : undefined,
        reason: result.reason
      };
    } catch (err) {
      this.logger.warn('Material physics analysis failed, falling back to molecule mode', { error: err.message });
      return { visualization_mode: 'molecule', object: trimmed };
    }
  }

  /**
   * Detect if input refers to a known protein. Returns { pdbId, name } or null.
   * Matches explicit PDB IDs (e.g. "1CRN", "pdb 4HHB") and common protein names.
   * @private
   */
  _detectProtein(text) {
    const lower = text.toLowerCase().trim();

    // Explicit PDB ID pattern: 4-character alphanumeric starting with digit
    const pdbExplicit = lower.match(/^(?:pdb[:\s-]*)?([0-9][a-z0-9]{3})$/i);
    if (pdbExplicit) {
      return { pdbId: pdbExplicit[1].toUpperCase(), name: pdbExplicit[1].toUpperCase() };
    }

    // Well-known proteins mapped to representative PDB entries
    const knownProteins = {
      'hemoglobin': { pdbId: '4HHB', name: 'Hemoglobin' },
      'haemoglobin': { pdbId: '4HHB', name: 'Hemoglobin' },
      'insulin': { pdbId: '4INS', name: 'Insulin' },
      'myoglobin': { pdbId: '1MBN', name: 'Myoglobin' },
      'lysozyme': { pdbId: '1LYZ', name: 'Lysozyme' },
      'collagen': { pdbId: '1CAG', name: 'Collagen' },
      'keratin': { pdbId: '6EC0', name: 'Keratin' },
      'actin': { pdbId: '1ATN', name: 'Actin' },
      'tubulin': { pdbId: '1TUB', name: 'Tubulin' },
      'albumin': { pdbId: '1AO6', name: 'Human Serum Albumin' },
      'serum albumin': { pdbId: '1AO6', name: 'Human Serum Albumin' },
      'green fluorescent protein': { pdbId: '1EMA', name: 'Green Fluorescent Protein' },
      'gfp': { pdbId: '1EMA', name: 'Green Fluorescent Protein' },
      'cytochrome c': { pdbId: '1HRC', name: 'Cytochrome C' },
      'ubiquitin': { pdbId: '1UBQ', name: 'Ubiquitin' },
      'trypsin': { pdbId: '1TRN', name: 'Trypsin' },
      'catalase': { pdbId: '1DGH', name: 'Catalase' },
      'ferritin': { pdbId: '1FHA', name: 'Ferritin' },
      'rhodopsin': { pdbId: '1F88', name: 'Rhodopsin' },
      'p53': { pdbId: '1TUP', name: 'p53 Tumor Suppressor' },
      'crambin': { pdbId: '1CRN', name: 'Crambin' },
      'dna polymerase': { pdbId: '1TAU', name: 'DNA Polymerase' },
      'rna polymerase': { pdbId: '1I6H', name: 'RNA Polymerase' },
      'atp synthase': { pdbId: '1E79', name: 'ATP Synthase' },
      'spike protein': { pdbId: '6VXX', name: 'SARS-CoV-2 Spike Protein' },
      'cas9': { pdbId: '4OO8', name: 'CRISPR-Cas9' },
      'crispr': { pdbId: '4OO8', name: 'CRISPR-Cas9' },
      'nattokinase': { pdbId: '4DWW', name: 'Nattokinase' },
      'subtilisin': { pdbId: '4DWW', name: 'Subtilisin NAT (Nattokinase)' },
    };

    if (knownProteins[lower]) {
      return knownProteins[lower];
    }

    // Partial match: "human hemoglobin", "bovine insulin", etc.
    for (const [key, val] of Object.entries(knownProteins)) {
      if (lower.includes(key)) {
        return val;
      }
    }

    return null;
  }

  /**
   * @private
   */
  async _analyzeMaterialPhysics(objectText) {
    const prompt = this.promptEngine.generateMaterialPhysicsPrompt(objectText);

    const result = await this._callAI({
      messages: [
        { role: 'system', content: 'You are a materials science API. Always respond with valid JSON only, no markdown, no commentary.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 4000,
      temperature: 1.0
    });

    if (!this.promptEngine.validateResponse('material', result)) {
      throw new Error('Invalid material physics response from AI');
    }

    return result;
  }

  /**
   * @private
   */
  // Core AI analysis of the provided object text.
  // aiClient is injected by DI (see ServiceProvider) and sourced from OPENAI_API_KEY.
  async _analyzeChemicals(objectText) {

    const prompt = this.promptEngine.generateChemicalPrompt(
      objectText,
      { includeReason: true }
    );

    const result = await this._callAI({
      messages: [
        { role: 'system', content: 'You are a chemical analysis API. Always respond with valid JSON only, no markdown, no commentary. Be exhaustive — list every known chemical compound in the substance.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 16000,
      temperature: 1.0  // GPT-5 only supports temperature 1.0
    });

    if (!this.promptEngine.validateResponse('chemical', result)) {
      throw new Error('Invalid chemical response from AI');
    }

    return result;
  }
  
  /**
   * Call AI service through the generic OpenAI service
   * @private
   */
  async _callAI(params) {
    try {
      const result = await this.aiService.callAPI(params);
      return result;
    } catch (error) {
      throw error;
    }
  }

  
  /**
   * Generate 3D structures for molecules
   * @private
   */
  async _generateStructures(chemicals) {
    const results = [];
    
    for (const chemical of chemicals) {
      try {
        let sdfPath = null;
        let status = 'lookup_required';
        
        // Try to generate SDF if we have SMILES
        if (chemical.smiles) {
          sdfPath = await this.molecularProcessor.generateSDF(
            chemical.smiles,
            false // don't overwrite
          );
          status = sdfPath ? 'ok' : 'generation_failed';
        } 
        // Try to resolve by name if no SMILES
        else if (chemical.name) {
          const resolved = await this.nameResolver.resolveName(chemical.name);
          if (resolved.smiles) {
            sdfPath = await this.molecularProcessor.generateSDF(
              resolved.smiles,
              false
            );
            status = sdfPath ? 'ok' : 'generation_failed';
          }
        }
        
        results.push({
          name: chemical.name,
          smiles: chemical.smiles,
          sdfPath,
          status
        });
      } catch (error) {
        this.logger.warn('Failed to generate structure', {
          chemical: chemical.name,
          error: error
        });
        
        results.push({
          name: chemical.name,
          smiles: chemical.smiles,
          sdfPath: null,
          status: 'error'
        });
      }
    }
    
    return results;
  }
  
  /**
   * Generate cache key for payload
   * @private
   */
  _getCacheKey(payload) {
    const key = {
      object: payload.object,
      lookupMode: payload.lookupMode,
      x: payload.x,
      y: payload.y,
      imageHash: payload.imageBase64 
        ? this._hashString(payload.imageBase64.substring(0, 100))
        : null
    };
    
    return `structuralizer:${JSON.stringify(key)}`;
  }
  
  /**
   * Simple string hash for cache keys
   * @private
   */
  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}

// Export both the class and a legacy wrapper for backwards compatibility
module.exports = Structuralizer;

// Legacy export for existing code
module.exports.chemicals = async function(payload) {
  // This would need to get dependencies from somewhere
  // In practice, this would be removed and all callers would use DI
  throw new Error(
    'Legacy chemicals() function not supported. ' +
    'Please use dependency injection with Structuralizer class.'
  );
};
