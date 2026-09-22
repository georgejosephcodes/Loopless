import React, { useMemo, useState } from 'react';
import { Sparkles, Clock, ChevronDown, ChevronUp, Flag, Car, BedDouble, Info } from 'lucide-react';
import RouteMap from './Map';
import StatTile from './StatTile';
import { pinFor, RETURN_PIN } from '../constants/pins';
import './ItineraryView.css';

const formatDuration = (mins) => {
  const total = Math.max(0, Math.round(mins));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

/**
 * Map + day-by-day timeline. Purely presentational: shared by the live
 * SmartItinerary page and the public read-only SharedTrip page.
 */
const ItineraryView = ({ itinerary = [], locations = [], mode = 'roundtrip', durationMatrix = [], routeGeometry = [], totalDistanceKm = 0, dark }) => {
  // ── Interaction State ──
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [notesOpen, setNotesOpen] = useState(true);

  // ── Data Processing: Add Return Trip (round trip only — a one-way route
  // ends at its last stop, no synthetic return leg) ──
  const extendedItinerary = useMemo(() => {
    if (!Array.isArray(itinerary) || itinerary.length === 0 || !locations.length) return [];

    // 1. Shallow copy standard stops and apply global Index
    const result = itinerary.map((stop, idx) => ({ ...stop, globalIndex: idx }));

    if (mode === 'oneway') return result;

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
      travelMinutes: retMins,
      isReturn: true,
      globalIndex: 0,
    });

    return result;
  }, [itinerary, locations, durationMatrix, mode]);

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

  if (locations.length === 0 || itinerary.length === 0) return null;

  return (
    <div className="split split-wide">
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

      <div className="split-panel">
        <h2 className="it-title"><Sparkles size={20} /> Your smart itinerary</h2>

        <div className="card it-notes">
          <button
            type="button"
            className="it-notes-head"
            onClick={() => setNotesOpen((v) => !v)}
            aria-expanded={notesOpen}
          >
            <Info size={15} />
            <span>How to read this</span>
            {notesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {notesOpen && (
            <ul className="it-notes-list">
              <li><strong>En route</strong> — a full day spent only driving, with no sightseeing that day.</li>
              <li><strong>Staying at X</strong> — an extra day at that stop because the visit is longer than one day.</li>
              <li><strong>0m</strong> next to a stop — no extra drive time from the previous stop.</li>
              <li><strong>~ estimated</strong> — exact road distance wasn't available; this is a straight-line estimate.</li>
            </ul>
          )}
        </div>

        {itineraryTotals && (
          <div className="card it-stats">
            <StatTile label="Distance" value={`${Number(totalDistanceKm).toFixed(2)} km`} color="var(--success)" />
            <StatTile label="Days" value={itineraryTotals.totalDays} color="var(--ai)" />
            <StatTile label="Travel" value={formatDuration(itineraryTotals.totalTravelMinutes)} color="var(--info)" />
            <StatTile label="Visiting" value={formatDuration(itineraryTotals.totalVisitMinutes)} color="var(--accent)" />
            <StatTile label="Total" value={formatDuration(itineraryTotals.totalTripMinutes)} />
          </div>
        )}

        {groupedItinerary.map(({ day, stops }) => {
          const isExpanded = expandedDays[day] !== false;
          return (
            <section key={day} className="card day-card">
              <button type="button" className="day-head" onClick={() => toggleDay(day)} aria-expanded={isExpanded}>
                <span className="day-badge">Day {day}</span>
                <span className="day-count">{stops.length} {stops.length === 1 ? 'stop' : 'stops'}</span>
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {isExpanded && (
                <div className="day-body">
                  {stops.map((stop, i) => {
                    const isLast = i === stops.length - 1;
                    const globalIdx = stop.globalIndex;
                    const isSelected = !stop.isTravelDay && !stop.isStayDay && selectedIdx === globalIdx;
                    const pin = stop.isReturn ? RETURN_PIN : pinFor(globalIdx);

                    return (
                      <div key={`${day}-${i}`}>
                        <div
                          className={`it-row${isSelected ? ' is-selected' : ''}${stop.isTravelDay ? ' it-row-travel' : ''}${stop.isStayDay ? ' it-row-travel' : ''}`}
                          style={{ '--pin': pin.bg }}
                          onClick={stop.isTravelDay || stop.isStayDay ? undefined : () => setSelectedIdx(selectedIdx === globalIdx ? null : globalIdx)}
                        >
                          <span className="it-time num">{stop.arrival || '—'}</span>
                          <span className="tl-pin" style={{ background: pin.bg, color: pin.fg }}>
                            {stop.isTravelDay ? <Car size={13} strokeWidth={2.5} /> : stop.isStayDay ? <BedDouble size={13} strokeWidth={2.5} /> : stop.isReturn ? <Flag size={13} strokeWidth={2.5} /> : globalIdx + 1}
                          </span>
                          <div className="it-info">
                            <div className="it-place">{stop.place}</div>
                            <div
                              className="it-sub"
                              title={
                                stop.isTravelDay
                                  ? 'A full day spent only driving, with no sightseeing today.'
                                  : stop.isStayDay
                                  ? 'An extra day at this stop because the visit is longer than one day.'
                                  : undefined
                              }
                            >
                              {stop.isTravelDay
                                ? `En route · ${formatDuration(stop.travelMinutes)} driving today${stop.estimatedTravel ? ' (~ estimated)' : ''}`
                                : stop.isStayDay
                                ? 'Staying here'
                                : stop.isReturn ? 'Trip complete' : `Stay ${stop.stayMinutes} min · departs ${stop.departure}`}
                            </div>
                          </div>
                        </div>

                        {!isLast && (
                          <div className="drive-chip">
                            <span className="drive-line" />
                            <Clock size={12} />
                            {formatDuration(stops[i + 1].travelMinutes)} drive
                            {stops[i + 1].estimatedTravel && (
                              <span title="Real road distance wasn't available for this leg; using a straight-line estimate.">
                                {' '}(~ estimated)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default ItineraryView;
