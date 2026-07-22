import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun, Moon, Sparkles, Clock, ChevronDown, ChevronUp, Flag } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import RouteMap from '../components/Map';

const PIN_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

const formatDuration = (mins) => {
  const total = Math.max(0, Math.round(mins));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const SmartItinerary = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();

  // Make sure the state is intact before displaying
  useEffect(() => {
    if (!state || !Array.isArray(state.itinerary) || state.itinerary.length === 0) {
      navigate('/', { replace: true });
    }
  }, [state, navigate]);

  const {
    itinerary = [],
    locations = [],
    durationMatrix = [],
    matrix = [],
    routeGeometry = [],
    totalDistanceKm = 0
  } = state || {};

  // ── Interaction State ──
  const [selectedIdx, setSelectedIdx] = useState(null);

  // ── Data Processing: Add Return Trip ──
  const extendedItinerary = useMemo(() => {
    if (!Array.isArray(itinerary) || itinerary.length === 0 || !locations.length) return [];
    
    // 1. Shallow copy standard stops and apply global Index
    const result = itinerary.map((stop, idx) => ({ ...stop, globalIndex: idx }));
    
    const lastStop = result[result.length - 1];
    const startLoc = locations[0];

    // 2. Calculate return drive time using durationMatrix
    let retMins = 0;
    if (durationMatrix.length > 0) {
      const lastLoc = locations[locations.length - 1];
      const rawVal = durationMatrix[lastLoc.originalIdx]?.[startLoc.originalIdx] || 0;
      retMins = Math.round(rawVal / 60); // assuming seconds
    }

    // 3. Compute arrival time at the start location
    let returnArrival = "";
    let returnDay = lastStop.day;
    if (lastStop.departure) {
      const [h, m] = lastStop.departure.split(':').map(Number);
      const totalMins = h * 60 + m + retMins;
      const newH = Math.floor(totalMins / 60) % 24;
      const newM = totalMins % 60;
      
      // Roll over to the next day if midnight is crossed
      if (totalMins >= 24 * 60) returnDay += 1;
      
      returnArrival = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    }

    // 4. Append the Return Stop
    result.push({
      day: returnDay,
      arrival: returnArrival,
      place: startLoc.name,
      stayMinutes: 0,
      departure: null,
      travelMinutes: retMins, // <-- FIXED: Attached the return time here instead of 0
      isReturn: true, 
      globalIndex: 0, 
    });

    return result;
  }, [itinerary, locations, durationMatrix]);

  // Group the extended itinerary by days
  const groupedItinerary = useMemo(() => {
    const byDay = new Map();
    extendedItinerary.forEach((stop) => {
      if (!byDay.has(stop.day)) byDay.set(stop.day, []);
      byDay.get(stop.day).push(stop);
    });

    return Array.from(byDay.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, stops]) => ({ day, stops }));
  }, [extendedItinerary]);

  // Initialize all days to expanded directly during the first render
  const [expandedDays, setExpandedDays] = useState(() => {
    if (!extendedItinerary || extendedItinerary.length === 0) return {};
    const days = [...new Set(extendedItinerary.map((s) => s.day))];
    return Object.fromEntries(days.map((d) => [d, true]));
  });

  // Calculate totals based on the complete looped route
  const itineraryTotals = useMemo(() => {
    if (!extendedItinerary.length) return null;
    const totalTravelMinutes = extendedItinerary.reduce((sum, s) => sum + (s.travelMinutes || 0), 0);
    const totalVisitMinutes = extendedItinerary.reduce((sum, s) => sum + (s.stayMinutes || 0), 0);
    return {
      totalDays: groupedItinerary.length,
      totalTravelMinutes,
      totalVisitMinutes,
      totalTripMinutes: totalTravelMinutes + totalVisitMinutes,
    };
  }, [extendedItinerary, groupedItinerary]);

  const toggleDay = (day) => {
    setExpandedDays((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  const handleBackToRoute = () => {
    // Navigate back to Result page preserving optimized route context
    navigate('/result', {
      state: {
        locations,
        distance: totalDistanceKm,
        matrix,
        durationMatrix,
        routeGeometry
      }
    });
  };

  if (locations.length === 0 || itinerary.length === 0) return null;

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
    nameColor: dark ? '#e2e8f0' : '#1e293b',
    accumLabel: dark ? '#475569' : '#94a3b8',
    toggleBg: dark ? '#334155' : '#f1f5f9',
    toggleColor: dark ? '#f1f5f9' : '#334155',
    mapBorder: dark ? '#334155' : '#e2e8f0',
    dropdownSubText: dark ? '#64748b' : '#94a3b8',
    connectorColor: dark ? '#334155' : '#e2e8f0',
    dayHeaderBg: dark ? '#0f172a' : '#f8fafc',
    rowHoverBg: dark ? '#0f172a' : '#f8fafc',
    rowSelectedBg: dark ? '#162032' : '#eff6ff',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', backgroundColor: t.bg, transition: 'background-color 0.3s', overflow: 'hidden' }}>
      
      {/* ── Nav bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', flexShrink: 0,
        backgroundColor: t.navBg, borderBottom: `1px solid ${t.navBorder}`, boxShadow: t.navShadow, gap: '16px', position: 'sticky', top: 0, zIndex: 40,
      }}>
        <button
          onClick={handleBackToRoute}
          style={{
            border: 'none', background: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center',
            gap: '6px', fontWeight: 700, fontSize: '14px', padding: '6px 0', flexShrink: 0,
          }}
        >
          <ArrowLeft size={17} /> Back to Route
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', overflow: 'hidden' }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(15px, 2vw, 20px)', fontWeight: 800, color: t.titleColor, whiteSpace: 'nowrap' }}>
            Smart Itinerary
          </h1>
        </div>

        <button
          onClick={toggle} title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            border: 'none', borderRadius: '10px', backgroundColor: t.toggleBg, color: t.toggleColor, cursor: 'pointer',
            padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.3s', flexShrink: 0,
          }}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* ── Split Layout: Map on left, Timeline on right ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Map Side */}
        <div style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          margin: '16px 8px 16px 16px', borderRadius: '20px',
          border: `1px solid ${t.mapBorder}`,
        }}>
          <RouteMap
            locations={locations}
            dark={dark}
            routePath={locations}
            roadPath={routeGeometry}
            selectedIndex={selectedIdx} 
          />
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
              zIndex: 1000,
            }}>
              Click the same stop again to deselect
            </div>
          )}
        </div>

        {/* Timeline Side */}
        <div style={{
          flex: 1.1, overflowY: 'auto',
          padding: '16px 24px 40px 12px', 
        }}>
          <div style={{ maxWidth: '820px', margin: '0 auto' }}>
            <h2 style={{
              display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px', fontSize: '20px', fontWeight: 800, color: t.titleColor,
            }}>
              <Sparkles size={20} color="#8b5cf6" /> Your Smart Itinerary
            </h2>

            {/* Totals bar */}
            {itineraryTotals && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '10px', backgroundColor: t.cardBg, border: `1px solid ${t.cardBorder}`,
                borderRadius: '16px', padding: '16px 20px', boxShadow: t.cardShadow, marginBottom: '18px',
              }}>
                {[
                  { label: 'Total Distance', value: `${Number(totalDistanceKm).toFixed(2)} km`, color: '#10b981' },
                  { label: 'Total Days', value: itineraryTotals.totalDays, color: '#8b5cf6' },
                  { label: 'Total Travel', value: formatDuration(itineraryTotals.totalTravelMinutes), color: '#3b82f6' },
                  { label: 'Total Visit', value: formatDuration(itineraryTotals.totalVisitMinutes), color: '#f59e0b' },
                  { label: 'Total Trip', value: formatDuration(itineraryTotals.totalTripMinutes), color: '#ef4444' },
                ].map((stat) => (
                  <div key={stat.label} style={{ flex: '1 1 110px', minWidth: '110px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: t.accumLabel, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                      {stat.label}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Day-by-day timeline */}
            {groupedItinerary.map(({ day, stops }) => {
              const isExpanded = expandedDays[day] !== false;
              return (
                <div key={day} style={{
                  backgroundColor: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: '16px', boxShadow: t.cardShadow, marginBottom: '14px', overflow: 'hidden',
                }}>
                  <button
                    onClick={() => toggleDay(day)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px',
                      border: 'none', backgroundColor: t.dayHeaderBg, cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: '15px', color: t.titleColor }}>DAY {day}</span>
                    {isExpanded ? <ChevronUp size={18} color={t.dropdownSubText} /> : <ChevronDown size={18} color={t.dropdownSubText} />}
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '18px' }}>
                      {stops.map((stop, i) => {
                        const isLast = i === stops.length - 1;
                        const globalIdx = stop.globalIndex;
                        const isSelected = selectedIdx === globalIdx;
                        
                        // Orange for return stop, otherwise normal color cycle
                        const pinColor = stop.isReturn ? '#f97316' : PIN_COLORS[globalIdx % PIN_COLORS.length];

                        return (
                          <div key={`${day}-${i}`}>
                            <div 
                              onClick={() => setSelectedIdx(selectedIdx === globalIdx ? null : globalIdx)}
                              style={{ 
                                display: 'flex', alignItems: 'flex-start', gap: '14px',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                backgroundColor: isSelected ? t.rowSelectedBg : 'transparent',
                                borderLeft: isSelected ? `3px solid ${pinColor}` : '3px solid transparent',
                                transition: 'all 0.15s',
                                marginLeft: '-14px',
                                marginRight: '-14px',
                              }}
                              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = t.rowHoverBg; }}
                              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              <div style={{ textAlign: 'right', width: '52px', flexShrink: 0, paddingTop: '4px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: t.titleColor }}>{stop.arrival}</div>
                              </div>
                              
                              <div style={{
                                width: '30px', height: '30px', borderRadius: '50%',
                                backgroundColor: pinColor,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0,
                                boxShadow: isSelected ? `0 0 0 3px ${pinColor}44, 0 2px 8px ${pinColor}55` : `0 2px 8px ${pinColor}44`,
                                fontWeight: 800, fontSize: '12px'
                              }}>
                                {stop.isReturn ? <Flag size={14} strokeWidth={2.5} /> : globalIdx + 1}
                              </div>
                              
                              <div style={{ flex: 1, paddingTop: '4px' }}>
                                <div style={{ fontWeight: 700, fontSize: '14px', color: isSelected ? (dark ? '#f1f5f9' : '#1e293b') : t.nameColor }}>
                                  {stop.place}
                                </div>
                                <div style={{ fontSize: '12px', color: t.dropdownSubText, marginTop: '2px' }}>
                                  {stop.isReturn ? 'Trip Complete' : `Stay ${stop.stayMinutes} min · departs ${stop.departure}`}
                                </div>
                              </div>
                            </div>

                            {!isLast && (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px', margin: '6px 0 6px 78px', fontSize: '11.5px', fontWeight: 600, color: t.dropdownSubText,
                              }}>
                                <div style={{ width: '2px', height: '18px', backgroundColor: t.connectorColor }} />
                                <Clock size={12} />
                                {formatDuration(stops[i + 1].travelMinutes)} drive
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartItinerary;