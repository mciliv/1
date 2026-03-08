import React from 'react';
import MoleculeViewer from './MoleculeViewer';
import SceneViewer from './SceneViewer';
import ProteinViewer from './ProteinViewer';

const MolecularColumn = ({ column, onRemove, showRemove = true }) => {
  const vizMode = column.visualizationMode;

  return (
    <div className="column">
      {/* GUARANTEED VISIBLE HEADER */}
      <div className="column-header">
        <div className="column-meta">
          <div className="column-title">
            {column.query}
          </div>
        </div>
        {showRemove && (
          <button
            onClick={onRemove}
            className="btn-ghost"
          >
            ×
          </button>
        )}
      </div>

      {/* Failure indicator — show actual error */}
      {column.failed && (
        <div className="alert-warning">
          {column.errorMessage || 'Analysis failed'}
        </div>
      )}

      {/* Text description mode */}
      {vizMode === 'text' && column.textDescription && (
        <div className="alert-info">
          {column.textDescription}
        </div>
      )}

      {/* Material scene mode (crystal/liquid/gas) */}
      {(vizMode === 'crystal' || vizMode === 'liquid' || vizMode === 'gas') && column.sceneData && (
        <SceneViewer sceneData={column.sceneData} title={column.query} />
      )}

      {/* Protein structure mode */}
      {vizMode === 'protein' && column.pdbId && (
        <ProteinViewer pdbId={column.pdbId} title={column.proteinName || column.query} />
      )}

      {/* No molecules found (not a failure, not a scene mode) */}
      {!column.loading && !column.failed && !vizMode && column.viewers && column.viewers.length === 0 && (
        <div className="alert-info">
          No specific molecules found. This is normal for concepts like "{column.query}".
        </div>
      )}

      {/* Molecule viewers */}
      {column.viewers && column.viewers.map((mol, idx) => (
        <MoleculeViewer key={idx} molecularData={mol} />
      ))}
    </div>
  );
};

export default MolecularColumn;