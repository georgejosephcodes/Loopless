import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import ItineraryView from '../components/ItineraryView';
import AppBar from '../components/AppBar';
import SaveShareButtons from '../components/SaveShareButtons';

const SmartItinerary = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { dark } = useTheme();

  // Set once the trip is saved, so further saves update the same trip.
  const [saved, setSaved] = useState({ id: state?.tripId ?? null, title: state?.title ?? null });

  // Make sure the state is intact before displaying
  useEffect(() => {
    if (!state || !Array.isArray(state.itinerary) || state.itinerary.length === 0) {
      navigate('/plan', { replace: true });
    }
  }, [state, navigate]);

  const {
    itinerary = [],
    locations = [],
    mode = 'roundtrip',
    durationMatrix = [],
    estimatedMatrix = null,
    matrix = [],
    routeGeometry = [],
    totalDistanceKm = 0,
    settings = {},
  } = state || {};

  const handleBackToRoute = () => {
    // Navigate back to Result page preserving optimized route context
    navigate('/result', {
      state: {
        locations,
        distance: totalDistanceKm,
        mode,
        matrix,
        durationMatrix,
        estimatedMatrix,
        routeGeometry,
        settings,
        tripId: saved.id,
        title: saved.title,
      }
    });
  };

  if (locations.length === 0 || itinerary.length === 0) return null;

  return (
    <div className="page-shell">
      <AppBar
        left={(
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleBackToRoute}>
            <ArrowLeft size={16} /> <span className="hide-mobile">Back to route</span>
          </button>
        )}
        center={<h1 className="appbar-title truncate">{saved.title || 'Smart itinerary'}</h1>}
        right={(
          <SaveShareButtons
            tripId={saved.id}
            defaultTitle={`${locations[0].name} trip`}
            onSaved={setSaved}
            getSnapshot={() => ({ locations, totalDistanceKm, mode, matrix, durationMatrix, estimatedMatrix, routeGeometry, itinerary, settings })}
          />
        )}
      />

      <ItineraryView
        itinerary={itinerary}
        locations={locations}
        mode={mode}
        durationMatrix={durationMatrix}
        routeGeometry={routeGeometry}
        totalDistanceKm={totalDistanceKm}
        dark={dark}
      />
    </div>
  );
};

export default SmartItinerary;
