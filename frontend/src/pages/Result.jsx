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

  const { locations, totalDistanceKm, matrix } = useMemo(() => {
    return {
      locations: Array.isArray(state?.locations) ? state.locations : [],
      totalDistanceKm: Number(state?.distance ?? 0),
      matrix: Array.isArray(state?.matrix) ? state.matrix : [],
    };
  }, [state]);


  const pathWithDistances = useMemo(() => {
    if (locations.length === 0 || !matrix.length) return [];

    let running = 0;

    const list = locations.map((loc, i) => {
      if (i > 0) {
        const prevIdx = locations[i - 1].originalIdx;
        const currIdx = loc.originalIdx;
        const d = matrix[prevIdx]?.[currIdx] ?? 0;
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
          Total Road Distance: {totalDistanceKm.toFixed(2)} km
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          padding: '10px 30px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
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
                    : loc.isStart
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

                {loc.isStart && (
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