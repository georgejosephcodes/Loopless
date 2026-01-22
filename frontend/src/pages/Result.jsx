import React, { useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Navigation } from 'lucide-react';

const Result = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!state || !Array.isArray(state.locations) || state.locations.length === 0) {
      navigate('/', { replace: true });
    }
  }, [state, navigate]);

  const { locations, distance, matrix } = useMemo(() => {
    return {
      locations: Array.isArray(state?.locations) ? state.locations : [],
      distance: state?.distance ?? '0',
      matrix: Array.isArray(state?.matrix) ? state.matrix : [],
    };
  }, [state]);

  const pathWithDistances = useMemo(() => {
    if (locations.length === 0) return [];

    const closedPath = [...locations, locations[0]];

    return closedPath.reduce((acc, loc, i) => {
      const prevRunning = acc.length > 0 ? acc[acc.length - 1].running : 0;
      let running = prevRunning;

      if (
        i > 0 &&
        Number.isInteger(closedPath[i - 1]?.originalIdx) &&
        Number.isInteger(loc?.originalIdx) &&
        matrix[closedPath[i - 1].originalIdx]?.[loc.originalIdx] != null
      ) {
        running += matrix[closedPath[i - 1].originalIdx][loc.originalIdx];
      }

      acc.push({
        ...loc,
        running,
        accumulated: (running / 1000).toFixed(2),
        isReturn: i === closedPath.length - 1,
      });

      return acc;
    }, []);
  }, [locations, matrix]);

  if (locations.length === 0) return null;

  return (
    <div
      style={{
        padding: '40px',
        maxWidth: '800px',
        margin: '0 auto',
        fontFamily: 'sans-serif',
        minHeight: '100vh', 
      }}
    >
      {/* BACK */}
      <button
        onClick={() => navigate('/')}
        style={{
          border: 'none',
          background: 'none',
          color: '#3b82f6',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: 'bold',
        }}
      >
        <ArrowLeft size={18} /> Back to Map
      </button>

      {/* HEADER */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <h1 style={{ fontSize: '32px', color: '#1e293b', fontWeight: 800 }}>
          Optimized Route (TSP)
        </h1>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 25px',
            backgroundColor: '#10b981',
            color: 'white',
            borderRadius: '30px',
            fontWeight: 'bold',
            margin: '20px 0',
          }}
        >
          <Navigation size={20} />
          Total Road Distance: {distance} km
        </div>
      </div>

      {/* SCROLLABLE LIST */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          padding: '10px 30px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
          maxHeight: '70vh',     
          overflowY: 'auto',    
        }}
      >
        {pathWithDistances.map((loc, i) => (
          <div
            key={`${loc.id}-${i}`}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 0',
              borderBottom:
                i === pathWithDistances.length - 1
                  ? 'none'
                  : '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: loc.isReturn
                    ? '#f97316'
                    : i === 0
                    ? '#10b981'
                    : '#3b82f6',
                  color: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '20px',
                  fontWeight: 'bold',
                }}
              >
                {i + 1}
              </div>

              <div>
                <span
                  style={{
                    fontWeight: 700,
                    color: '#334155',
                    fontSize: '18px',
                  }}
                >
                  {loc.name}
                </span>

                {i === 0 && (
                  <span
                    style={{
                      marginLeft: '10px',
                      fontSize: '12px',
                      color: '#10b981',
                      fontWeight: 'bold',
                    }}
                  >
                    (START)
                  </span>
                )}

                {loc.isReturn && (
                  <span
                    style={{
                      marginLeft: '10px',
                      fontSize: '12px',
                      color: '#f97316',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                    }}
                  >
                    (TOUR COMPLETE – RETURN TO START)
                  </span>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontSize: '14px',
                  color: '#64748b',
                  fontWeight: 600,
                }}
              >
                {loc.accumulated} km
              </span>
              <div
                style={{
                  fontSize: '10px',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                }}
              >
                Accumulated
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Result;
