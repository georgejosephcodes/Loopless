import React, { useMemo, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Navigation, Sparkles } from 'lucide-react';
import RouteMap from '../components/Map';
import AppBar from '../components/AppBar';
import Modal from '../components/Modal';
import RouteStops from '../components/RouteStops';
import StatTile from '../components/StatTile';
import SaveShareButtons from '../components/SaveShareButtons';
import { useTheme } from '../ThemeContext';
import { buildPathWithDistances } from '../utils/route';
import { TIME_OPTIONS } from '../utils/timeOptions';

const VISIT_STYLES = {
  quick: { label: 'Quick Visit', sublabel: '30 min', minutes: 30 },
  normal: { label: 'Normal Visit', sublabel: '60 min', minutes: 60 },
  leisurely: { label: 'Leisurely Visit', sublabel: '90 min', minutes: 90 },
  custom: { label: 'Custom', sublabel: '15 min – 24 hr', minutes: null },
};

const MAX_STOP_MINUTES = 1440;

const Result = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { dark } = useTheme();

  const [selectedIdx, setSelectedIdx] = useState(null);

  // ── Smart Itinerary state ──────────────────────────────────────────────
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [itineraryError, setItineraryError] = useState('');
  const [startTime, setStartTime] = useState(state?.settings?.startTime || '09:00');
  const [endTime, setEndTime] = useState(state?.settings?.endTime || '18:00');
  const [visitStyle, setVisitStyle] = useState(
    state?.settings?.visitStyle in VISIT_STYLES ? state.settings.visitStyle : 'normal'
  );
  const [customMinutesByStop, setCustomMinutesByStop] = useState(
    state?.settings?.customMinutesByStop && typeof state.settings.customMinutesByStop === 'object'
      ? state.settings.customMinutesByStop
      : {}
  );

  // Set once the trip is saved, so further saves update the same trip.
  const [saved, setSaved] = useState({ id: state?.tripId ?? null, title: state?.title ?? null });

  useEffect(() => {
    if (!state || !Array.isArray(state.locations) || state.locations.length === 0) {
      navigate('/plan', { replace: true });
    }
  }, [state, navigate]);

  const { locations, totalDistanceKm, mode, matrix, durationMatrix, estimatedMatrix, routeGeometry } = useMemo(() => ({
    locations: Array.isArray(state?.locations) ? state.locations : [],
    totalDistanceKm: Number(state?.distance ?? 0),
    mode: state?.mode === 'oneway' ? 'oneway' : 'roundtrip',
    matrix: Array.isArray(state?.matrix) ? state.matrix : [],
    durationMatrix: Array.isArray(state?.durationMatrix) ? state.durationMatrix : [],
    estimatedMatrix: Array.isArray(state?.estimatedMatrix) ? state.estimatedMatrix : null,
    routeGeometry: Array.isArray(state?.routeGeometry) ? state.routeGeometry : [],
  }), [state]);

  const pathWithDistances = useMemo(
    () => buildPathWithDistances(locations, matrix, totalDistanceKm, { mode, estimatedMatrix }),
    [locations, matrix, totalDistanceKm, mode, estimatedMatrix]
  );

  // Backfill a default duration for any stop that doesn't have one yet
  // (newly added stop, or first time switching to Custom).
  useEffect(() => {
    if (visitStyle !== 'custom' || locations.length === 0) return;
    setCustomMinutesByStop((prev) => {
      let changed = false;
      const next = { ...prev };
      locations.forEach((loc) => {
        if (next[loc.originalIdx] == null) {
          next[loc.originalIdx] = 60;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [visitStyle, locations]);

  if (locations.length === 0) return null;

  const handleRowClick = (i) => {
    const mapIndex = pathWithDistances[i].isReturn ? 0 : i;
    setSelectedIdx((prev) => (prev === mapIndex ? null : mapIndex));
  };

  const handleGenerateItinerary = async () => {
    let stayMinutes = VISIT_STYLES[visitStyle].minutes;
    let stayMinutesByStop;

    if (visitStyle === 'custom') {
      stayMinutesByStop = {};
      locations.forEach((loc) => {
        stayMinutesByStop[loc.originalIdx] = Number(customMinutesByStop[loc.originalIdx] ?? 60);
      });
      const values = Object.values(stayMinutesByStop);
      if (values.some((v) => !Number.isFinite(v) || v < 15 || v > MAX_STOP_MINUTES)) {
        setItineraryError('Custom stay duration must be between 15 minutes and 24 hours for each stop.');
        return;
      }
      stayMinutes = values[0] ?? 60; // flat fallback, kept for API/back-compat consumers
    }

    if (!durationMatrix.length) {
      setItineraryError('Travel time data is missing. Please re-run Optimize Route first.');
      return;
    }

    setItineraryLoading(true);
    setItineraryError('');
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/itinerary`,
        {
          optimizedRoute: locations,
          durationMatrix,
          estimatedMatrix,
          startTime,
          endTime,
          stayMinutes,
          mode,
          ...(stayMinutesByStop ? { stayMinutesByStop } : {}),
        }
      );

      const generated = res.data.itinerary || [];
      if (!generated.length) {
        setItineraryError('Could not generate an itinerary. Please try again.');
        return;
      }

      setShowItineraryModal(false);

      // Navigate to SmartItinerary page with all required state
      navigate('/itinerary', {
        state: {
          itinerary: generated,
          locations,
          mode,
          durationMatrix,
          matrix,
          routeGeometry,
          totalDistanceKm,
          dark,
          settings: { startTime, endTime, visitStyle, customMinutesByStop, stayMinutes },
          tripId: saved.id,
          title: saved.title,
        }
      });
    } catch (err) {
      console.error('Itinerary generation failed:', err.response?.data || err.message);
      if (err.response?.status === 503 || err.response?.data?.error === 'busy') {
        setItineraryError('All servers are busy right now. Try again later — or try Premium for priority access.');
      } else {
        setItineraryError(err.response?.data?.error || 'Failed to generate itinerary. Please try again.');
      }
    } finally {
      setItineraryLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <AppBar
        left={(
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/plan')}>
            <ArrowLeft size={16} /> <span className="hide-mobile">Back to map</span>
          </button>
        )}
        center={(
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <h1 className="appbar-title truncate">{saved.title || 'Optimized route'}</h1>
            <span className="badge badge-success hide-mobile" style={{ padding: '5px 12px', fontSize: 12.5 }}>
              <Navigation size={13} /> <span className="num">{totalDistanceKm.toFixed(2)} km</span> total
            </span>
          </div>
        )}
        right={(
          <SaveShareButtons
            tripId={saved.id}
            defaultTitle={`${locations[0].name} trip`}
            onSaved={setSaved}
            getSnapshot={() => ({
              locations, totalDistanceKm, mode, matrix, durationMatrix, estimatedMatrix, routeGeometry,
              settings: { startTime, endTime, visitStyle, customMinutesByStop },
            })}
          />
        )}
      />

      <div className="split">
        <div className="split-map">
          <RouteMap
            locations={locations}
            dark={dark}
            routePath={locations}
            roadPath={routeGeometry}
            selectedIndex={selectedIdx}
          />
          {selectedIdx !== null && (
            <div className="map-hint glass">Click the same stop again to deselect</div>
          )}
        </div>

        <aside className="split-panel">
          <div className="card summary">
            <StatTile label="Stops" value={locations.length} />
            <span className="summary-divider" />
            <StatTile label="Distance" value={`${totalDistanceKm.toFixed(2)} km`} color="var(--success)" />
            <span className="summary-divider" />
            <StatTile label="Algorithm" value="TSP" color="var(--accent)" />
          </div>

          <button
            type="button"
            className="btn btn-ai btn-lg btn-block"
            style={{ flexShrink: 0 }}
            onClick={() => { setItineraryError(''); setShowItineraryModal(true); }}
          >
            <Sparkles size={18} /> Generate smart itinerary
          </button>

          <div className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px 4px', fontSize: 11.5, fontWeight: 600, color: 'var(--faint)' }}>
              Click a stop to highlight it on the map
            </div>
            <RouteStops stops={pathWithDistances} selectedIdx={selectedIdx} onSelect={handleRowClick} />
          </div>
        </aside>
      </div>

      {showItineraryModal && (
        <Modal
          title="Generate smart itinerary"
          description="We schedule your optimized route stop by stop using real travel times, and split it into extra days if needed."
          onClose={() => setShowItineraryModal(false)}
          busy={itineraryLoading}
          actions={(
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setShowItineraryModal(false)} disabled={itineraryLoading}>Cancel</button>
              <button type="button" className="btn btn-ai" onClick={handleGenerateItinerary} disabled={itineraryLoading}>
                {itineraryLoading && <span className="spinner" />}
                {itineraryLoading ? 'Generating…' : 'Generate'}
              </button>
            </>
          )}
        >
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <label className="field" style={{ flex: 1 }}>
              <span className="field-label">Trip start time</span>
              <select className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={itineraryLoading}>
                {TIME_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span className="field-label">Trip end time</span>
              <select className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={itineraryLoading}>
                {TIME_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>
          </div>

          <div className="field">
            <span className="field-label">Visit style</span>
            <div className="option-list">
              {Object.entries(VISIT_STYLES).map(([key, cfg]) => {
                const isSelected = visitStyle === key;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`option-card${isSelected ? ' is-selected' : ''}`}
                    onClick={() => setVisitStyle(key)}
                    disabled={itineraryLoading}
                    aria-pressed={isSelected}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="option-radio" />
                      <span style={{ fontWeight: 700, fontSize: 13.5 }}>{cfg.label}</span>
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{cfg.sublabel}</span>
                  </button>
                );
              })}
            </div>

            {visitStyle === 'custom' && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 240, overflowY: 'auto' }}>
                {locations.map((loc) => {
                  const value = customMinutesByStop[loc.originalIdx] ?? 60;
                  const hours = Math.floor(value / 60);
                  const mins = value % 60;
                  const setClamped = (h, m) => {
                    const total = Math.min(MAX_STOP_MINUTES, Math.max(15, h * 60 + m));
                    setCustomMinutesByStop((prev) => ({ ...prev, [loc.originalIdx]: total }));
                  };
                  return (
                    <div key={loc.originalIdx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                        <span className="truncate">{loc.name}</span>
                        <span className="num" style={{ color: 'var(--ai)' }}>{hours}h {mins}m</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <label className="field" style={{ flex: 1 }}>
                          <span className="field-label">Hours</span>
                          <input
                            type="number" min="0" max="24" className="input"
                            value={hours}
                            onChange={(e) => setClamped(Number(e.target.value) || 0, mins)}
                            disabled={itineraryLoading}
                          />
                        </label>
                        <label className="field" style={{ flex: 1 }}>
                          <span className="field-label">Minutes</span>
                          <input
                            type="number" min="0" max="59" className="input"
                            value={mins}
                            onChange={(e) => setClamped(hours, Number(e.target.value) || 0)}
                            disabled={itineraryLoading}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {itineraryError && <div role="alert" className="alert alert-danger" style={{ marginTop: 14 }}>{itineraryError}</div>}
        </Modal>
      )}
    </div>
  );
};

export default Result;
