import React, { useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import '../assets/style.css';

const CITIES = [
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
  { name: 'New York', lat: 40.7128, lng: -74.006 },
  { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
  { name: 'Austin', lat: 30.2672, lng: -97.7431 },
  { name: 'Seattle', lat: 47.6062, lng: -122.3321 },
];

const DifficultyBadge = ({ difficulty }) => {
  const colorMap = { easy: '#81c784', moderate: '#ffb74d', hard: '#ef5350', impossible: 'rgba(255,255,255,0.3)' };
  const bg = colorMap[difficulty] || 'rgba(255,255,255,0.2)';
  return (
    <span style={{
      background: bg, color: '#111', padding: '3px 12px', borderRadius: '12px',
      fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px'
    }}>{difficulty}</span>
  );
};

const StrategyBadge = ({ strategy }) => {
  const colorMap = { buy: '#007aff', grow: '#81c784', both: '#ffb74d' };
  const bg = colorMap[strategy] || 'rgba(255,255,255,0.2)';
  return (
    <span style={{
      background: bg, color: '#111', padding: '5px 16px', borderRadius: '14px',
      fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px'
    }}>{strategy}</span>
  );
};

const AvailabilityDot = ({ availability }) => {
  const colorMap = { immediate: '#81c784', seasonal: '#ffb74d', limited: '#ef5350', pre_order: '#9575cd' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'rgba(245,245,247,0.7)' }}>
      <span style={{
        width: '7px', height: '7px', borderRadius: '50%', display: 'inline-block',
        background: colorMap[availability] || 'rgba(255,255,255,0.3)'
      }} />
      {(availability || '').replace('_', ' ')}
    </span>
  );
};

const GrowabilityCard = ({ growable, timeToObtain }) => {
  if (!growable) return null;
  const possible = growable.possible;
  return (
    <div className="molecule-card" style={{
      borderColor: possible ? 'rgba(129,199,132,0.2)' : undefined,
      padding: '16px 20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: possible ? '12px' : 0 }}>
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#f5f5f7' }}>
          {possible ? 'Growable' : 'Not Growable'}
        </span>
        <DifficultyBadge difficulty={growable.difficulty} />
      </div>
      {possible && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'rgba(245,245,247,0.6)' }}>
          {growable.climate_zones?.length > 0 && (
            <div><span style={{ color: 'rgba(245,245,247,0.4)' }}>Zones:</span> {growable.climate_zones.join(', ')}</div>
          )}
          {growable.growing_season_months && (
            <div><span style={{ color: 'rgba(245,245,247,0.4)' }}>Season:</span> {growable.growing_season_months} months</div>
          )}
          {timeToObtain?.grow_days && (
            <div><span style={{ color: 'rgba(245,245,247,0.4)' }}>Harvest:</span> ~{timeToObtain.grow_days} days</div>
          )}
          {growable.notes && (
            <div style={{ fontStyle: 'italic', marginTop: '4px', color: 'rgba(245,245,247,0.5)' }}>{growable.notes}</div>
          )}
        </div>
      )}
    </div>
  );
};

const PurchaseTable = ({ options }) => {
  if (!options || options.length === 0) return null;
  return (
    <div className="molecule-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.8fr 0.6fr 0.8fr',
        padding: '10px 16px', fontSize: '11px', fontWeight: 600,
        color: 'rgba(245,245,247,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px',
        background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.04)'
      }}>
        <span>Vendor</span><span>Type</span><span>Price</span><span>Quality</span><span>Status</span>
      </div>
      {/* Rows */}
      {options.map((opt, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.8fr 0.6fr 0.8fr',
          padding: '10px 16px', fontSize: '13px', alignItems: 'center',
          borderTop: i > 0 ? '1px solid rgba(255,255,255,0.03)' : 'none',
          background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
        }}>
          <span style={{ color: '#f5f5f7', fontWeight: 500 }}>{opt.vendor_name || opt.item_name || '--'}</span>
          <span style={{ color: 'rgba(245,245,247,0.5)', fontSize: '12px' }}>{(opt.source_type || '').replace(/_/g, ' ')}</span>
          <span style={{ fontWeight: 600 }}>
            {opt.estimated_price_usd
              ? <><span style={{ color: '#007aff' }}>${opt.estimated_price_usd}</span><span style={{ color: 'rgba(245,245,247,0.3)', fontWeight: 400 }}>/{opt.unit}</span></>
              : <span style={{ color: 'rgba(245,245,247,0.2)' }}>--</span>}
          </span>
          <span style={{ fontSize: '12px' }}>
            {opt.quality_tier
              ? <span style={{ color: opt.quality_tier === 'premium' || opt.quality_tier === 'organic' ? '#ffb74d' : 'rgba(245,245,247,0.5)' }}>{opt.quality_tier}</span>
              : opt.quality_score
                ? <span style={{ color: '#ffb74d' }}>Q{opt.quality_score}</span>
                : <span style={{ color: 'rgba(245,245,247,0.2)' }}>--</span>}
          </span>
          <AvailabilityDot availability={opt.availability} />
        </div>
      ))}
    </div>
  );
};

const LocalSuppliersCard = ({ suppliers }) => {
  if (!suppliers || suppliers.length === 0) return null;
  return (
    <div className="molecule-card" style={{ padding: '16px 20px' }}>
      <div style={{ fontSize: '15px', fontWeight: 600, color: '#f5f5f7', marginBottom: '12px' }}>
        Local Suppliers ({suppliers.length})
      </div>
      {suppliers.map((s, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none'
        }}>
          <div>
            <div style={{ color: '#f5f5f7', fontWeight: 500, fontSize: '14px' }}>{s.item_name || s.vendor_name}</div>
            <div style={{ color: 'rgba(245,245,247,0.4)', fontSize: '12px' }}>
              {s.vendor_name}{s.distance_km != null ? ` \u2022 ${s.distance_km.toFixed(1)} km` : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {s.quality_score && <div style={{ color: '#ffb74d', fontSize: '13px', fontWeight: 600 }}>Q{s.quality_score}</div>}
            {s.supplier_rating && <div style={{ color: 'rgba(245,245,247,0.4)', fontSize: '11px' }}>Rating {s.supplier_rating}</div>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function DeliveryPage() {
  const [itemInput, setItemInput] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const { analyzeDelivery, loading, error } = useApi();
  const [result, setResult] = useState(null);
  const [searchError, setSearchError] = useState('');

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!itemInput.trim() || loading) return;
    setSearchError('');
    setResult(null);
    try {
      const location = CITIES.find(c => c.name === selectedCity) || {};
      const data = await analyzeDelivery(itemInput.trim(), {
        city: location.name, lat: location.lat, lng: location.lng
      });
      setResult(data);
    } catch (err) {
      setSearchError(err.message || 'Analysis failed');
    }
  }, [itemInput, selectedCity, analyzeDelivery, loading]);

  return (
    <div className="app">
      <div className="main" style={{ paddingTop: '32px', maxWidth: '720px' }}>
        {/* Breadcrumb nav */}
        <div style={{ marginBottom: '32px', animation: 'fadeIn 0.5s ease-out' }}>
          <a href="/" className="back-link" style={{ marginBottom: '16px', display: 'inline-flex' }}>
            ← Back
          </a>
          <h1 className="app-title" style={{ textAlign: 'left', marginTop: '20px', marginBottom: '8px', fontSize: '28px' }}>
            Delivery
          </h1>
          <p style={{ color: 'rgba(245,245,247,0.5)', fontSize: '14px', margin: 0 }}>
            Find how to obtain any ingredient, material, or product
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="input-wrapper">
          <div className="input-row" style={{ marginBottom: '12px' }}>
            <input
              className="input-base"
              type="text"
              value={itemInput}
              onChange={(e) => setItemInput(e.target.value)}
              placeholder="e.g., heirloom tomatoes, saffron, vanilla beans..."
              autoFocus
              style={{ paddingRight: '20px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
            <select
              className="select"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              style={{ flex: 1, minHeight: '52px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <option value="">Any location</option>
              {CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !itemInput.trim()}
              style={{ minWidth: '140px', borderRadius: '12px' }}
            >
              {loading ? 'Analyzing...' : 'Find options'}
            </button>
          </div>
        </form>

        {/* Error */}
        {(searchError || (error && error.message)) && (
          <div className="error-banner" style={{ marginTop: '16px' }}>
            <div className="error-banner-content">
              <div className="error-banner-header">
                <span className="error-icon">!</span>
                <span className="error-message">{searchError || error.message}</span>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ marginTop: '28px', animation: 'fadeInUp 0.5s ease-out' }}>
            {/* Header */}
            <div className="column-header" style={{ marginBottom: '20px' }}>
              <div className="column-meta">
                <div className="column-title" style={{ fontSize: '20px' }}>{result.item}</div>
                {result.location?.city && (
                  <span style={{ color: 'rgba(245,245,247,0.4)', fontSize: '13px', marginLeft: '8px' }}>
                    in {result.location.city}
                  </span>
                )}
              </div>
              <StrategyBadge strategy={result.recommended_strategy} />
            </div>

            {/* Reasoning */}
            {result.reasoning && (
              <div style={{
                padding: '14px 18px', marginBottom: '16px', fontSize: '14px', lineHeight: '1.6',
                color: 'rgba(245,245,247,0.7)', background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px',
                borderLeft: '3px solid rgba(0,122,255,0.4)'
              }}>
                {result.reasoning}
              </div>
            )}

            {/* Time metrics */}
            {result.time_to_obtain && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                {result.time_to_obtain.buy_days != null && (
                  <div className="molecule-card" style={{
                    flex: 1, padding: '16px', textAlign: 'center', marginBottom: 0
                  }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#007aff' }}>{result.time_to_obtain.buy_days}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(245,245,247,0.4)', marginTop: '2px' }}>days to buy</div>
                  </div>
                )}
                {result.time_to_obtain.grow_days != null && (
                  <div className="molecule-card" style={{
                    flex: 1, padding: '16px', textAlign: 'center', marginBottom: 0
                  }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#81c784' }}>{result.time_to_obtain.grow_days}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(245,245,247,0.4)', marginTop: '2px' }}>days to grow</div>
                  </div>
                )}
              </div>
            )}

            <GrowabilityCard growable={result.growable} timeToObtain={result.time_to_obtain} />

            {result.purchase_options?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#f5f5f7', marginBottom: '10px' }}>
                  Purchase Options ({result.purchase_options.length})
                </div>
                <PurchaseTable options={result.purchase_options} />
              </div>
            )}

            <LocalSuppliersCard suppliers={result.local_suppliers} />
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !searchError && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(245,245,247,0.3)', animation: 'fadeIn 0.8s ease-out' }}>
            <div style={{ fontSize: '15px', lineHeight: '1.8' }}>
              Search for any ingredient, material, or product to find<br/>
              growing feasibility, pricing, and purchase options.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
