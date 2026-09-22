import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Eye, Link2, Compass } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import RouteMap from '../components/Map';
import ItineraryView from '../components/ItineraryView';
import AppBar from '../components/AppBar';
import Logo from '../components/Logo';
import EmptyState from '../components/EmptyState';
import RouteStops from '../components/RouteStops';
import StatTile from '../components/StatTile';
import api from '../lib/api';
import { buildPathWithDistances } from '../utils/route';

// Read-only public view of a saved trip. No auth required.
const SharedTrip = () => {
  const { token } = useParams();
  const { dark } = useTheme();
  const [trip, setTrip] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error
  const [selectedIdx, setSelectedIdx] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get(`/api/shared/${encodeURIComponent(token)}`)
      .then(({ data }) => { if (!cancelled) { setTrip(data); setStatus('ready'); } })
      .catch((err) => { if (!cancelled) setStatus(err.response?.status === 404 ? 'notfound' : 'error'); });
    return () => { cancelled = true; };
  }, [token]);

  const snapshot = trip?.snapshot;
  const locations = useMemo(() => snapshot?.locations ?? [], [snapshot]);
  const totalDistanceKm = Number(snapshot?.totalDistanceKm ?? 0);
  const hasItinerary = Array.isArray(snapshot?.itinerary) && snapshot.itinerary.length > 0;

  const mode = snapshot?.mode === 'oneway' ? 'oneway' : 'roundtrip';

  // Route-only trips: cumulative distance per stop, same math as the Result page.
  const stops = useMemo(
    () => buildPathWithDistances(locations, snapshot?.matrix ?? [], totalDistanceKm, { mode, estimatedMatrix: snapshot?.estimatedMatrix }),
    [locations, snapshot, totalDistanceKm, mode]
  );

  const handleRowClick = (i) => {
    const mapIndex = stops[i].isReturn ? 0 : i;
    setSelectedIdx((prev) => (prev === mapIndex ? null : mapIndex));
  };

  return (
    <div className="page-shell">
      <AppBar
        left={<Logo />}
        center={(
          <div style={{ minWidth: 0, textAlign: 'center' }}>
            <h1 className="appbar-title truncate">{trip?.title || 'Shared trip'}</h1>
            {trip?.ownerName && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Shared by {trip.ownerName}</div>}
          </div>
        )}
        right={(
          <Link to="/" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
            <Compass size={15} /> <span className="hide-mobile">Plan your own</span>
          </Link>
        )}
      />

      {status === 'loading' && (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--accent)' }} role="status" aria-label="Loading trip">
          <div className="spinner spinner-lg" />
        </div>
      )}

      {(status === 'notfound' || status === 'error') && (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 16 }}>
          <div className="card" style={{ maxWidth: 420 }}>
            <EmptyState
              icon={Link2}
              title={status === 'notfound' ? 'Trip not available' : 'Could not load this trip'}
              action={<Link to="/" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Go to Loopless</Link>}
            >
              {status === 'notfound'
                ? 'This link is invalid, or the owner turned sharing off.'
                : 'Something went wrong on our side. Try again in a moment.'}
            </EmptyState>
          </div>
        </div>
      )}

      {status === 'ready' && hasItinerary && (
        <ItineraryView
          itinerary={snapshot.itinerary}
          locations={locations}
          mode={mode}
          durationMatrix={snapshot.durationMatrix}
          routeGeometry={snapshot.routeGeometry}
          totalDistanceKm={totalDistanceKm}
          dark={dark}
        />
      )}

      {status === 'ready' && !hasItinerary && (
        <div className="split">
          <div className="split-map">
            <RouteMap
              locations={locations}
              dark={dark}
              routePath={locations}
              roadPath={snapshot.routeGeometry}
              selectedIndex={selectedIdx}
            />
          </div>
          <aside className="split-panel">
            <div className="card summary">
              <StatTile label="Stops" value={locations.length} />
              <span className="summary-divider" />
              <StatTile label="Distance" value={`${totalDistanceKm.toFixed(2)} km`} color="var(--success)" />
              <span className="summary-divider" />
              <span className="badge badge-accent"><Eye size={12} /> Read only</span>
            </div>
            <div className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <RouteStops stops={stops} selectedIdx={selectedIdx} onSelect={handleRowClick} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default SharedTrip;
