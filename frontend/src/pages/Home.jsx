import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchBar from '../components/SearchBar';
import BucketList from '../components/BucketList';
import Map from '../components/Map';


const Home = () => {
  const [bucketList, setBucketList] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAddLocation = (place) => {
    if (bucketList.length >= 15) return;

    setBucketList((prev) => [
      ...prev,
      {
        ...place,
        id: crypto.randomUUID(),
      },
    ]);
  };

  const handleOptimize = async () => {
    if (bucketList.length < 2 || loading) return;

    setLoading(true);

    try {
      const cleanLocations = bucketList.map((loc, index) => ({
        lat: Number(loc.lat),
        lng: Number(loc.lng),
        name: loc.name || loc.display_name || 'Unknown',
        originalIdx: index, 
      }));

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/optimize`,
        { locations: cleanLocations }
      );

      navigate('/result', {
        state: {
          locations: res.data.path,
          distance: res.data.distance,
          matrix: res.data.matrix,
        },
      });
    } catch (err) {
      console.error('Optimization error:', err.response?.data || err.message);
      alert(err.response?.data?.error || 'Backend error: Could not optimize route');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#f8fafc',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          gap: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            padding: '12px 24px',
            borderRadius: '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>
            Loopless
          </h1>

          <div style={{ width: '400px' }}>
            <SearchBar
              onAdd={handleAddLocation}
              disabled={bucketList.length >= 15}
            />
          </div>
        </div>

        <div
          style={{
            flex: 1,
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Map locations={bucketList} />

          {loading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(255,255,255,0.7)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '18px',
                color: '#3b82f6'
              }}
            >
              Finding the best route…
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: BUCKET LIST */}
      <div
        style={{
          width: '380px',
          backgroundColor: '#ffffff',
          borderLeft: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
        }}
      >
        <p
          style={{
            color: '#3b82f6',
            fontWeight: 'bold',
            fontSize: '13px',
            margin: '0 0 10px 0',
          }}
        >
          First item is the Start Point
        </p>

        <BucketList
          list={bucketList}
          loading={loading}
          onRemove={(id) =>
            setBucketList((prev) => prev.filter((l) => l.id !== id))
          }
          onOptimize={handleOptimize}
        />
      </div>
    </div>
  );
};

export default Home;