import React, { useEffect, useRef, useState } from 'react';
import logger from '../logger.js';

const ProteinViewer = ({ pdbId, title }) => {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // Wait for NGL to load
      let attempts = 0;
      while (typeof window.NGL === 'undefined' && attempts < 50) {
        await new Promise(r => setTimeout(r, 200));
        attempts++;
        if (cancelled) return;
      }

      if (typeof window.NGL === 'undefined') {
        setStatus('failed');
        setError('NGL Viewer failed to load');
        return;
      }

      if (!containerRef.current || cancelled) return;

      // Clean up previous stage
      if (stageRef.current) {
        stageRef.current.dispose();
        stageRef.current = null;
      }

      try {
        const stage = new window.NGL.Stage(containerRef.current, {
          backgroundColor: '#000000',
          quality: 'medium',
        });
        stageRef.current = stage;

        // Handle resize
        const observer = new ResizeObserver(() => stage.handleResize());
        observer.observe(containerRef.current);

        // Load from RCSB PDB
        const comp = await stage.loadFile(
          `rcsb://${pdbId.toUpperCase()}`,
          { defaultRepresentation: false }
        );

        if (cancelled) return;

        // Cartoon representation for secondary structure
        comp.addRepresentation('cartoon', {
          colorScheme: 'chainid',
          smoothSheet: true,
        });

        // Show ligands as ball+stick
        comp.addRepresentation('ball+stick', {
          sele: 'hetero and not water',
          colorScheme: 'element',
        });

        stage.autoView();
        stage.setSpin(true);
        setStatus('loaded');

        return () => observer.disconnect();
      } catch (err) {
        if (!cancelled) {
          logger.warn(`Protein load failed for ${pdbId}: ${err.message}`);
          setStatus('failed');
          setError(`Could not load protein: ${pdbId}`);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (stageRef.current) {
        try { stageRef.current.dispose(); } catch (_) {}
        stageRef.current = null;
      }
    };
  }, [pdbId]);

  return (
    <div className="molecule-card">
      <div className="molecule-title">
        <a
          href={`https://www.rcsb.org/structure/${pdbId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {title || pdbId.toUpperCase()}
        </a>
        <span style={{ fontSize: '11px', color: 'rgba(245,245,247,0.4)', marginLeft: '8px' }}>
          PDB
        </span>
        {status === 'failed' && ' ❌'}
      </div>
      <div
        ref={containerRef}
        className="viewer"
        style={{ minHeight: '300px' }}
      >
        {status === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(245,245,247,0.4)', fontSize: '13px' }}>
            Loading protein structure...
          </div>
        )}
        {status === 'failed' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ef5350', fontSize: '13px' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProteinViewer;
