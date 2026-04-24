import React, { useMemo, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Navigation, Sun, Moon, Flag } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import Map from '../components/Map';

const PIN_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

const Result = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();

  // Index of the stop the user has clicked in the list (-1 = none)
  const [selectedIdx, setSelectedIdx] = useState(null);

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
      return {
        ...loc,
        accumulated: (running / 1000).toFixed(2),
        isStart: i === 0,
        isReturn: false,
      };
    });
    list.push({
      ...locations[0],
      id: `${locations[0].id}-return`,
      accumulated: totalDistanceKm.toFixed(2),
      isStart: false,
      isReturn: true,
    });
    return list;
  }, [locations, matrix, totalDistanceKm]);

  if (locations.length === 0) return null;

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const t = {
    bg: dark ? '#0f172a' : '#f8fafc',
    navBg: dark ? '#1e293b' : '#ffffff',
    navBorder: dark ? '#334155' : '#e2e8f0',
    navShadow: dark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.06)',
    titleColor: dark ? '#f1f5f9' : '#1e293b',
    cardBg: dark ? '#1e293b' : '#ffffff',
    cardBorder: dark ? '#334155' : '#e2e8f0',
    cardShadow: dark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
    rowBorder: dark ? '#1e293b' : '#f1f5f9',
    nameColor: dark ? '#e2e8f0' : '#1e293b',
    accumColor: dark ? '#94a3b8' : '#64748b',
    accumLabel: dark ? '#475569' : '#94a3b8',
    segDistColor: dark ? '#64748b' : '#94a3b8',
    toggleBg: dark ? '#334155' : '#f1f5f9',
    toggleColor: dark ? '#f1f5f9' : '#334155',
    mapBorder: dark ? '#334155' : '#e2e8f0',
    badgeBg: dark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
    badgeBorder: dark ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.25)',
    rowHoverBg: dark ? '#0f172a' : '#f8fafc',
    rowSelectedBg: dark ? '#162032' : '#eff6ff',
    rowSelectedBorder: dark ? '#1d4ed8' : '#bfdbfe',
  };

  const handleRowClick = (i) => {
    // The "return" row (last item) maps back to index 0 on the map
    const mapIndex = pathWithDistances[i].isReturn ? 0 : i;
    setSelectedIdx((prev) => (prev === mapIndex ? null : mapIndex));
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100vw',
      backgroundColor: t.bg, transition: 'background-color 0.3s',
      overflow: 'hidden',
    }}>

      {/* ── Nav bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', flexShrink: 0,
        backgroundColor: t.navBg,
        borderBottom: `1px solid ${t.navBorder}`,
        boxShadow: t.navShadow,
        transition: 'background-color 0.3s',
        gap: '16px',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            border: 'none', background: 'none', color: '#3b82f6',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            gap: '6px', fontWeight: 700, fontSize: '14px', padding: '6px 0',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={17} /> Back to Map
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', overflow: 'hidden' }}>
          <h1 style={{
            margin: 0, fontSize: 'clamp(15px, 2vw, 20px)',
            fontWeight: 800, color: t.titleColor, whiteSpace: 'nowrap',
          }}>
            Optimized Route
          </h1>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            padding: '6px 16px',
            backgroundColor: t.badgeBg,
            border: `1px solid ${t.badgeBorder}`,
            borderRadius: '20px',
            color: '#10b981', fontWeight: 700, fontSize: '13px',
            whiteSpace: 'nowrap',
          }}>
            <Navigation size={14} />
            {totalDistanceKm.toFixed(2)} km total
          </div>
        </div>

        <button
          onClick={toggle}
          title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            border: 'none', borderRadius: '10px',
            backgroundColor: t.toggleBg, color: t.toggleColor,
            cursor: 'pointer', padding: '8px 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background-color 0.3s', flexShrink: 0,
          }}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Map */}
        <div style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          margin: '16px 8px 16px 16px', borderRadius: '20px',
          border: `1px solid ${t.mapBorder}`,
        }}>
          <Map
            locations={locations}
            dark={dark}
            routePath={locations}
            selectedIndex={selectedIdx}
          />

          {/* Deselect hint */}
          {selectedIdx !== null && (
            <div style={{
              position: 'absolute', bottom: '16px', left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: dark ? 'rgba(30,41,59,0.92)' : 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(6px)',
              border: `1px solid ${t.cardBorder}`,
              borderRadius: '20px',
              padding: '7px 16px',
              fontSize: '12px', fontWeight: 600,
              color: dark ? '#94a3b8' : '#64748b',
              pointerEvents: 'none',
              boxShadow: dark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.1)',
              whiteSpace: 'nowrap',
            }}>
              Click the same stop again to deselect
            </div>
          )}
        </div>

        {/* Stop list sidebar */}
        <div style={{
          width: '360px', flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          margin: '16px 16px 16px 8px',
          overflow: 'hidden',
        }}>
          {/* Summary strip */}
          <div style={{
            backgroundColor: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: '16px',
            padding: '14px 18px',
            marginBottom: '10px',
            boxShadow: t.cardShadow,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: t.accumLabel, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Stops</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: t.titleColor }}>{locations.length}</div>
            </div>
            <div style={{ width: '1px', height: '36px', backgroundColor: t.cardBorder }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: t.accumLabel, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Total Distance</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981' }}>{totalDistanceKm.toFixed(2)} km</div>
            </div>
            <div style={{ width: '1px', height: '36px', backgroundColor: t.cardBorder }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: t.accumLabel, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Algorithm</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6' }}>TSP</div>
            </div>
          </div>

          {/* Click hint */}
          <div style={{
            fontSize: '11px', fontWeight: 500,
            color: dark ? '#475569' : '#94a3b8',
            textAlign: 'center', marginBottom: '8px', flexShrink: 0,
          }}>
            Click a stop to highlight it on the map
          </div>

          {/* Route steps */}
          <div style={{
            flex: 1, overflowY: 'auto',
            backgroundColor: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: '16px',
            boxShadow: t.cardShadow,
            padding: '6px 0',
          }}>
            {pathWithDistances.map((loc, i) => {
              const isLast = i === pathWithDistances.length - 1;
              // The "return" row visually highlights pin 0 on the map
              const mapIndex = loc.isReturn ? 0 : i;
              const isSelected = selectedIdx === mapIndex;

              const pinColor = loc.isReturn
                ? '#f97316'
                : loc.isStart
                  ? '#10b981'
                  : PIN_COLORS[i % PIN_COLORS.length];

              const segDist = i > 0
                ? (() => {
                    const d = parseFloat(loc.accumulated) - parseFloat(pathWithDistances[i - 1].accumulated);
                    return d > 0 ? `+${d.toFixed(2)} km` : null;
                  })()
                : null;

              return (
                <div
                  key={`${loc.id}-${i}`}
                  onClick={() => handleRowClick(i)}
                  style={{
                    display: 'flex', alignItems: 'flex-start',
                    padding: '12px 16px',
                    borderBottom: isLast ? 'none' : `1px solid ${t.rowBorder}`,
                    cursor: 'pointer',
                    // Highlight selected row
                    backgroundColor: isSelected ? t.rowSelectedBg : 'transparent',
                    borderLeft: isSelected
                      ? `3px solid ${pinColor}`
                      : '3px solid transparent',
                    transition: 'background-color 0.15s, border-left-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = t.rowHoverBg;
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Pin + connector */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '13px', flexShrink: 0 }}>
                    <div style={{
                      width: '28px', height: '28px',
                      backgroundColor: pinColor,
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 800, fontSize: '11px',
                      boxShadow: isSelected
                        ? `0 0 0 3px ${pinColor}44, 0 2px 8px ${pinColor}55`
                        : `0 2px 8px ${pinColor}44`,
                      transition: 'box-shadow 0.2s',
                      flexShrink: 0,
                    }}>
                      {loc.isReturn ? <Flag size={12} /> : i + 1}
                    </div>
                    {!isLast && (
                      <div style={{
                        width: '2px', flex: 1, minHeight: '18px',
                        backgroundColor: t.rowBorder, marginTop: '3px',
                      }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, overflow: 'hidden', paddingTop: '2px' }}>
                    <div style={{
                      fontWeight: isSelected ? 700 : 600,
                      fontSize: '13.5px',
                      color: isSelected
                        ? (dark ? '#f1f5f9' : '#1e293b')
                        : t.nameColor,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      transition: 'color 0.15s, font-weight 0.15s',
                    }}>
                      {loc.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                      {loc.isStart && (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', padding: '1px 7px', borderRadius: '10px' }}>
                          START
                        </span>
                      )}
                      {loc.isReturn && (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)', padding: '1px 7px', borderRadius: '10px' }}>
                          COMPLETE
                        </span>
                      )}
                      {segDist && (
                        <span style={{ fontSize: '11px', color: t.segDistColor }}>{segDist}</span>
                      )}
                    </div>
                  </div>

                  {/* Accumulated distance */}
                  <div style={{ textAlign: 'right', flexShrink: 0, paddingTop: '2px', marginLeft: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: t.accumColor }}>
                      {loc.accumulated} km
                    </div>
                    <div style={{ fontSize: '9px', color: t.accumLabel, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      accum.
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Result;