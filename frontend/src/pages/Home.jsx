import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchBar from '../components/SearchBar';
import BucketList from '../components/BucketList';
import Map from '../components/Map';
import { useTheme } from '../ThemeContext';
import { Moon, Sun } from 'lucide-react';

const Home = ({ bucketList, setBucketList }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();

  const t = {
    bg: dark ? '#0f172a' : '#f8fafc',
    navBg: dark ? '#1e293b' : '#ffffff',
    navBorder: dark ? '#334155' : '#e2e8f0',
    navShadow: dark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.05)',
    titleColor: dark ? '#f1f5f9' : '#1e293b',
    sidebarBg: dark ? '#1e293b' : '#ffffff',
    sidebarBorder: dark ? '#334155' : '#e2e8f0',
    mapBorder: dark ? '#334155' : '#e2e8f0',
    loadingBg: dark ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.7)',
    toggleBg: dark ? '#334155' : '#f1f5f9',
    toggleColor: dark ? '#f1f5f9' : '#334155',
  };

  const handleAddLocation = (place) => {
    if (bucketList.length >= 15) return;
    setBucketList((prev) => [...prev, { ...place, id: crypto.randomUUID() }]);
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
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: t.bg, transition: 'background-color 0.3s' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', gap: '20px' }}>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: t.navBg, padding: '12px 24px', borderRadius: '16px',
          boxShadow: t.navShadow, border: `1px solid ${t.navBorder}`,
          transition: 'background-color 0.3s', gap: '16px',
        }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: t.titleColor, whiteSpace: 'nowrap' }}>Loopless</h1>
          <div style={{ flex: 1, maxWidth: '460px' }}>
            <SearchBar onAdd={handleAddLocation} disabled={bucketList.length >= 15} dark={dark} />
          </div>
          <button
            onClick={toggle}
            title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{
              border: 'none', borderRadius: '10px', backgroundColor: t.toggleBg,
              color: t.toggleColor, cursor: 'pointer', padding: '8px 10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background-color 0.3s', flexShrink: 0,
            }}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div style={{
          flex: 1, borderRadius: '24px', border: `1px solid ${t.mapBorder}`,
          position: 'relative', overflow: 'hidden',
        }}>
          <Map locations={bucketList} dark={dark} />
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, backgroundColor: t.loadingBg,
              zIndex: 1000, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', color: '#3b82f6',
            }}>
              Finding the best route…
            </div>
          )}
        </div>
      </div>

      <div style={{
        width: '380px', backgroundColor: t.sidebarBg,
        borderLeft: `1px solid ${t.sidebarBorder}`,
        display: 'flex', flexDirection: 'column', transition: 'background-color 0.3s',
      }}>
        <BucketList
          list={bucketList}
          loading={loading}
          dark={dark}
          onRemove={(id) => setBucketList((prev) => prev.filter((l) => l.id !== id))}
          onOptimize={handleOptimize}
        />
      </div>
    </div>
  );
};

export default Home;