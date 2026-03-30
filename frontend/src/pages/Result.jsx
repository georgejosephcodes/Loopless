import React, { useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Navigation, Sun, Moon } from 'lucide-react';
import { useTheme } from '../ThemeContext';

const Result = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();

  useEffect(() => {
    if (!state || !Array.isArray(state.locations) || state.locations.length === 0) {
      navigate('/', { replace: true });
    }
  }, [state, navigate]);

  const { locations, totalDistanceKm, matrix } = useMemo(() => ({
    locations: Array.isArray(state?.locations) ? state.locations : [],
    totalDistanceKm: Number(state?.distance ?? 0),
    matrix: Array.isArray(state?.matrix) ? state.matrix : [],
  }), [state]);

  const pathWithDistances = useMemo(() => {
    if (locations.length === 0 || !matrix.length) return [];
    let running = 0;
    const list = locations.map((loc, i) => {
      if (i > 0) {
        const d = matrix[locations[i - 1].originalIdx]?.[loc.originalIdx] ?? 0;
        running += d;
      }
      return { ...loc, accumulated: (running / 1000).toFixed(2), isStart: i === 0, isReturn: false };
    });
    list.push({ ...locations[0], id: `${locations[0].id}-return`, accumulated: totalDistanceKm.toFixed(2), isStart: false, isReturn: true });
    return list;
  }, [locations, matrix, totalDistanceKm]);

  if (locations.length === 0) return null;

  const t = {
    bg: dark ? '#0f172a' : '#f8fafc',
    titleColor: dark ? '#f1f5f9' : '#1e293b',
    cardBg: dark ? '#1e293b' : 'white',
    cardShadow: dark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.05)',
    rowBorder: dark ? '#334155' : '#f1f5f9',
    nameColor: dark ? '#e2e8f0' : '#334155',
    accumColor: dark ? '#94a3b8' : '#64748b',
    accumLabel: dark ? '#475569' : '#94a3b8',
    toggleBg: dark ? '#1e293b' : '#f1f5f9',
    toggleColor: dark ? '#f1f5f9' : '#334155',
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', minHeight: '100vh', boxSizing: 'border-box', backgroundColor: t.bg, transition: 'background-color 0.3s' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate('/')} style={{ border: 'none', background: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', padding: '10px 0' }}>
          <ArrowLeft size={18} /> Back to Map
        </button>
        <button onClick={toggle} style={{ border: 'none', borderRadius: '10px', backgroundColor: t.toggleBg, color: t.toggleColor, cursor: 'pointer', padding: '8px 10px', display: 'flex', alignItems: 'center', transition: 'background-color 0.3s' }}>
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div style={{ textAlign: 'center', marginTop: '10px' }}>
        <h1 style={{ fontSize: 'clamp(24px, 5vw, 32px)', color: t.titleColor, fontWeight: 800 }}>
          Optimized Route (TSP)
        </h1>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '10px 25px', backgroundColor: '#10b981', color: 'white', borderRadius: '30px', fontWeight: 'bold', margin: '20px 0', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>
          <Navigation size={20} />
          Total Road Distance: {totalDistanceKm.toFixed(2)} km
        </div>
      </div>

      <div style={{ backgroundColor: t.cardBg, borderRadius: '24px', padding: '10px 25px', boxShadow: t.cardShadow, marginBottom: '40px', transition: 'background-color 0.3s' }}>
        {pathWithDistances.map((loc, i) => (
          <div key={`${loc.id}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderBottom: i === pathWithDistances.length - 1 ? 'none' : `1px solid ${t.rowBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
              <div style={{ width: '32px', height: '32px', flexShrink: 0, backgroundColor: loc.isReturn ? '#f97316' : loc.isStart ? '#10b981' : '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px', fontWeight: 'bold' }}>
                {i + 1}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, color: t.nameColor, fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {loc.name}
                </div>
                {loc.isStart && <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>(START)</span>}
                {loc.isReturn && <span style={{ fontSize: '11px', color: '#f97316', fontWeight: 'bold' }}>(TOUR COMPLETE)</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right', marginLeft: '10px', flexShrink: 0 }}>
              <span style={{ fontSize: '14px', color: t.accumColor, fontWeight: 600 }}>{loc.accumulated} km</span>
              <div style={{ fontSize: '9px', color: t.accumLabel, textTransform: 'uppercase' }}>Accumulated</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Result;