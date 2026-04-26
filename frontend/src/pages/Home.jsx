import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchBar from '../components/SearchBar';
import BucketList from '../components/BucketList';
import Map from '../components/Map';
import { useTheme } from '../ThemeContext';
import { Moon, Sun, MapPin, Locate, Sparkles, ChevronDown, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Mixed', 'Nature', 'Food', 'Tourist', 'Shopping', 'Hidden Gems',
  'Historical', 'Religious', 'Adventure', 'Nightlife', 'Family Friendly',
  'Romantic', 'Luxury', 'Budget', 'Photography Spots', 'Road Trip',
  'Local Favorites', 'Cafes', 'Museums', 'Beaches'
];

const CATEGORY_ICONS = {
  Mixed: '🌐', Nature: '🌿', Food: '🍽️', Tourist: '🗺️', Shopping: '🛍️',
  'Hidden Gems': '💎', Historical: '🏛️', Religious: '🕌', Adventure: '🧗',
  Nightlife: '🌙', 'Family Friendly': '👨‍👩‍👧', Romantic: '💕', Luxury: '✨',
  Budget: '💰', 'Photography Spots': '📸', 'Road Trip': '🚗',
  'Local Favorites': '❤️', Cafes: '☕', Museums: '🖼️', Beaches: '🏖️'
};

const Home = ({ bucketList, setBucketList }) => {
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [radiusKm, setRadiusKm] = useState(0);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRadius, setAiRadius] = useState(25);
  const [aiMaxStops, setAiMaxStops] = useState(5);
  const [aiCategory, setAiCategory] = useState('Mixed');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef(null);
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const t = {
    bg: dark ? '#0f172a' : '#f8fafc',
    navBg: dark ? '#1e293b' : '#ffffff',
    navBorder: dark ? '#334155' : '#e2e8f0',
    navShadow: dark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.05)',
    titleColor: dark ? '#f1f5f9' : '#1e293b',
    sidebarBg: dark ? '#1e293b' : '#ffffff',
    sidebarBorder: dark ? '#334155' : '#e2e8f0',
    mapBorder: dark ? '#334155' : '#e2e8f0',
    loadingBg: dark ? 'rgba(15,23,42,0.8)' : 'rgba(248,250,252,0.8)',
    loadingColor: '#3b82f6',
    toggleBg: dark ? '#334155' : '#f1f5f9',
    toggleColor: dark ? '#f1f5f9' : '#334151',
    emptyMapColor: dark ? '#334155' : '#cbd5e1',
    emptyMapTextColor: dark ? '#475569' : '#94a3b8',
    locateBg: dark ? '#1e293b' : '#ffffff',
    locateBorder: dark ? '#334155' : '#dadce0',
    locateColor: dark ? '#94a3b8' : '#444746',
    radiusBg: dark ? '#1e293b' : '#ffffff',
    radiusBorder: dark ? '#334155' : '#e2e8f0',
    radiusText: dark ? '#e2e8f0' : '#1e293b',
    radiusSubText: dark ? '#64748b' : '#94a3b8',
    dropdownBg: dark ? '#1e293b' : '#ffffff',
    dropdownBorder: dark ? '#334155' : '#e2e8f0',
    dropdownHover: dark ? '#2d3f57' : '#f5f3ff',
    dropdownText: dark ? '#e2e8f0' : '#1e293b',
    dropdownSubText: dark ? '#64748b' : '#94a3b8',
  };

  const handleAddLocation = (place) => {
    if (bucketList.length >= 15) return;
    const isDuplicate = bucketList.some(
      (loc) =>
        Math.abs(Number(loc.lat) - Number(place.lat)) < 0.0001 &&
        Math.abs(Number(loc.lng) - Number(place.lng)) < 0.0001
    );
    if (isDuplicate) {
      toast.error('This stop is already in your route.');
      return;
    }
    setBucketList((prev) => [...prev, { ...place, id: crypto.randomUUID() }]);
  };

  const handleRemoveLocation = (id) => {
    setBucketList((prev) => prev.filter((l) => l.id !== id));
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        console.error(err);
        alert('Could not detect your location. Please allow location access.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleOptimize = async () => {
    if (bucketList.length < 2 || loading) return;
    setLoading(true);
    try {
      const cleanLocations = bucketList.map((loc, index) => ({
        lat: Number(loc.lat),
        lng: Number(loc.lng),
        name: loc.name || 'Unknown',
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
          routeGeometry: res.data.routeGeometry,
        },
      });
    } catch (err) {
      console.error('Optimization error:', err.response?.data || err.message);
      alert(err.response?.data?.error || 'Backend error: Could not optimize route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAIAutofill = async () => {
    if (bucketList.length === 0) {
      toast.error('Add your first place before using AI Autofill.');
      return;
    }
    const firstPlace = bucketList[0];
    setAiLoading(true);
    try {
      const remainingSlots = Math.min(aiMaxStops, 15 - bucketList.length);
      if (remainingSlots <= 0) {
        toast.error('Bucket list is already full.');
        setAiLoading(false);
        return;
      }
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/ai-autofill`,
        {
          startPlace: firstPlace.name,
          lat: firstPlace.lat,
          lng: firstPlace.lng,
          radiusKm: aiRadius,
          maxStops: remainingSlots,
          category: aiCategory,
        }
      );
      const aiPlaces = res.data.places || [];
      if (!aiPlaces.length) {
        toast.error('No valid places found.');
        return;
      }
      const existingLocations = [...bucketList];
      const newPlacesToAdd = [];
      aiPlaces.forEach((place) => {
        const isDuplicate =
          existingLocations.some(
            (loc) =>
              Math.abs(Number(loc.lat) - Number(place.lat)) < 0.0001 &&
              Math.abs(Number(loc.lng) - Number(place.lng)) < 0.0001
          ) ||
          newPlacesToAdd.some(
            (loc) =>
              Math.abs(Number(loc.lat) - Number(place.lat)) < 0.0001 &&
              Math.abs(Number(loc.lng) - Number(place.lng)) < 0.0001
          );
        if (!isDuplicate) {
          newPlacesToAdd.push({ ...place, id: crypto.randomUUID() });
        }
      });
      if (newPlacesToAdd.length === 0) {
        toast.error('All suggested places were duplicates.');
        return;
      }
      setBucketList((prev) => [...prev, ...newPlacesToAdd]);
      toast.success(`✨ Added ${newPlacesToAdd.length} new places`);
      setShowAIModal(false);
    } catch (err) {
      console.error('AI Autofill failed:', err.response?.data || err.message);
      toast.error(err.response?.data?.error || 'AI Autofill failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const RADIUS_OPTIONS = [0, 5, 10, 25, 50, 100];

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      backgroundColor: t.bg,
      transition: 'background-color 0.3s',
      overflow: 'hidden',
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        gap: '14px',
        minWidth: 0,
      }}>

        {/* ── Navbar ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          backgroundColor: t.navBg,
          padding: '11px 20px',
          borderRadius: '16px',
          boxShadow: t.navShadow,
          border: `1px solid ${t.navBorder}`,
          transition: 'background-color 0.3s',
          gap: '10px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <img src="/pic.svg" alt="logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              <span style={{ color: '#f49e0a' }}>Loop</span>
              <span style={{ color: t.titleColor }}>less</span>
            </h1>
          </div>

          <div style={{ flex: 1, maxWidth: '500px', marginRight: '24px' }}>
            <SearchBar onAdd={handleAddLocation} disabled={bucketList.length >= 15} dark={dark} />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => {
                if (bucketList.length === 0) {
                  toast.error('Add your first place before using AI Autofill.');
                  return;
                }
                setAiMaxStops(Math.max(1, Math.min(5, 15 - bucketList.length)));
                setShowAIModal(true);
              }}
              title="AI Trip Planner"
              style={{
                border: 'none',
                borderRadius: '10px',
                backgroundColor: t.toggleBg,
                color: '#8b5cf6',
                cursor: 'pointer',
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.3s',
                flexShrink: 0,
              }}
            >
              <Sparkles size={18} />
            </button>

            <button
              onClick={toggle}
              title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              style={{
                border: 'none',
                borderRadius: '10px',
                backgroundColor: t.toggleBg,
                color: t.toggleColor,
                cursor: 'pointer',
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.3s',
                flexShrink: 0,
              }}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        {/* ── Map Area ── */}
        <div style={{
          flex: 1,
          borderRadius: '20px',
          border: `1px solid ${t.mapBorder}`,
          position: 'relative',
          overflow: 'hidden',
          transition: 'border-color 0.3s',
        }}>
          <Map
            locations={bucketList}
            dark={dark}
            userLocation={userLocation}
            radiusKm={radiusKm}
            onAddPlace={handleAddLocation}
            isFull={bucketList.length >= 15}
          />

          {/* ── Detect Location Button ── */}
          <button
            onClick={handleDetectLocation}
            disabled={locating}
            title="Detect my location"
            style={{
              position: 'absolute',
              bottom: '102px',
              right: '10px',
              width: '40px', height: '40px',
              borderRadius: '2px',
              backgroundColor: userLocation ? '#4285F4' : t.locateBg,
              border: 'none',
              boxShadow: '0 1px 4px -1px rgba(0,0,0,0.3)',
              cursor: locating ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 500,
              transition: 'box-shadow 0.15s',
              color: userLocation ? '#ffffff' : t.locateColor,
              outline: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px -1px rgba(0,0,0,0.3)'; }}
          >
            {locating ? (
              <div style={{
                width: '16px', height: '16px', borderRadius: '50%',
                border: '2px solid #4285F4', borderTopColor: 'transparent',
                animation: 'spin 0.75s linear infinite',
              }} />
            ) : (
              <Locate size={18} strokeWidth={userLocation ? 2.5 : 1.8} />
            )}
          </button>

          {/* ── Radius Selector ── */}
          {userLocation && (
            <div style={{
              position: 'absolute',
              bottom: '40px',
              left: '12px',
              zIndex: 500,
              backgroundColor: t.radiusBg,
              border: `1px solid ${t.radiusBorder}`,
              borderRadius: '10px',
              padding: '10px 14px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              minWidth: '210px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: t.radiusText, letterSpacing: '-0.01em' }}>
                  Focus Radius
                </span>
                <span style={{
                  fontSize: '11px', fontWeight: 600,
                  color: radiusKm > 0 ? '#4285F4' : t.radiusSubText,
                  backgroundColor: radiusKm > 0 ? 'rgba(66,133,244,0.12)' : (dark ? '#0f172a' : '#f1f5f9'),
                  padding: '2px 8px', borderRadius: '20px',
                }}>
                  {radiusKm === 0 ? 'Off' : `${radiusKm} km`}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRadiusKm(r)}
                    style={{
                      padding: '4px 10px', borderRadius: '20px',
                      border: `1.5px solid ${radiusKm === r ? '#4285F4' : (dark ? '#334155' : '#e2e8f0')}`,
                      backgroundColor: radiusKm === r ? '#4285F4' : 'transparent',
                      color: radiusKm === r ? 'white' : t.radiusSubText,
                      fontSize: '11px', fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                    }}
                  >
                    {r === 0 ? 'Off' : `${r}km`}
                  </button>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: '10px', color: t.radiusSubText, lineHeight: 1.4 }}>
                Dims the map outside the selected radius from your location.
              </p>
            </div>
          )}

          {/* ── Empty state overlay ── */}
          {bucketList.length === 0 && !userLocation && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none', zIndex: 10,
            }}>
              <div style={{
                backgroundColor: dark ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(6px)', borderRadius: '16px',
                padding: '20px 28px', textAlign: 'center',
                border: `1px solid ${t.mapBorder}`,
                boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.08)',
              }}>
                <MapPin size={28} color={t.emptyMapColor} style={{ marginBottom: '10px' }} />
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: t.emptyMapTextColor }}>
                  Search for a place to get started
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: t.emptyMapTextColor, opacity: 0.7 }}>
                  Add at least 2 locations to optimize a route
                </p>
              </div>
            </div>
          )}

          {/* ── Loading overlay ── */}
          {loading && (
            <div style={{
              position: 'absolute', inset: 0,
              backgroundColor: t.loadingBg, backdropFilter: 'blur(4px)',
              zIndex: 1000, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '14px',
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6',
                animation: 'spin 0.75s linear infinite',
              }} />
              <span style={{ fontWeight: 700, fontSize: '15px', color: t.loadingColor, letterSpacing: '-0.01em' }}>
                Finding the best route…
              </span>
              <span style={{ fontSize: '12px', color: dark ? '#475569' : '#94a3b8' }}>
                Running TSP solver
              </span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
        </div>
      </div>

      {/* ── AI Modal ── */}
      {showAIModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5000,
          }}
          onClick={() => !aiLoading && setShowAIModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '420px',
              maxWidth: '92vw',
              backgroundColor: t.navBg,
              border: `1px solid ${t.navBorder}`,
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: t.titleColor }}>
              ✨ AI Trip Planner
            </h2>

            {/* Radius */}
            <div>
              <p style={{ margin: '0 0 10px', fontWeight: 700, color: t.titleColor }}>
                Search Radius
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[5, 10, 25, 50, 100].map((r) => (
                  <button
                    key={r}
                    onClick={() => setAiRadius(r)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '20px',
                      border: `1.5px solid ${aiRadius === r ? '#8b5cf6' : t.navBorder}`,
                      backgroundColor: aiRadius === r ? '#8b5cf6' : 'transparent',
                      color: aiRadius === r ? '#fff' : t.titleColor,
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>

            {/* Stops */}
            <div>
              <p style={{ margin: '0 0 10px', fontWeight: 700, color: t.titleColor }}>
                Total Route Stops
              </p>
              <input
                type="range"
                min="1"
                max={Math.max(1, 15 - bucketList.length)}
                value={aiMaxStops}
                onChange={(e) => setAiMaxStops(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <p style={{ margin: '8px 0 0', color: '#8b5cf6', fontWeight: 700 }}>
                {aiMaxStops} places
              </p>
            </div>

            {/* ── Custom Category Dropdown ── */}
            <div>
              <p style={{ margin: '0 0 10px', fontWeight: 700, color: t.titleColor }}>
                Category
              </p>
              <div ref={categoryRef} style={{ position: 'relative' }}>
                {/* Trigger button */}
                <button
                  onClick={() => setCategoryOpen((o) => !o)}
                  style={{
                    width: '100%',
                    padding: '11px 16px',
                    borderRadius: '12px',
                    border: `1.5px solid ${categoryOpen ? '#8b5cf6' : t.navBorder}`,
                    backgroundColor: t.bg,
                    color: t.titleColor,
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    boxShadow: categoryOpen ? '0 0 0 3px rgba(139,92,246,0.15)' : 'none',
                    outline: 'none',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{CATEGORY_ICONS[aiCategory]}</span>
                    <span>{aiCategory}</span>
                  </span>
                  <ChevronDown
                    size={16}
                    color={t.dropdownSubText}
                    style={{
                      transition: 'transform 0.2s',
                      transform: categoryOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      flexShrink: 0,
                    }}
                  />
                </button>

                {/* Dropdown list */}
                {categoryOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      backgroundColor: t.dropdownBg,
                      border: `1.5px solid ${t.dropdownBorder}`,
                      borderRadius: '12px',
                      boxShadow: dark
                        ? '0 8px 32px rgba(0,0,0,0.5)'
                        : '0 8px 32px rgba(0,0,0,0.12)',
                      zIndex: 9999,
                      maxHeight: '220px',
                      overflowY: 'auto',
                      padding: '6px',
                    }}
                  >
                    {CATEGORIES.map((cat) => {
                      const isSelected = aiCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            setAiCategory(cat);
                            setCategoryOpen(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: isSelected
                              ? (dark ? 'rgba(139,92,246,0.18)' : '#f5f3ff')
                              : 'transparent',
                            color: isSelected ? '#8b5cf6' : t.dropdownText,
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: '13.5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            textAlign: 'left',
                            transition: 'background-color 0.1s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = t.dropdownHover;
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <span style={{ fontSize: '15px', width: '20px', textAlign: 'center', flexShrink: 0 }}>
                            {CATEGORY_ICONS[cat]}
                          </span>
                          <span style={{ flex: 1 }}>{cat}</span>
                          {isSelected && (
                            <Check size={14} color="#8b5cf6" style={{ flexShrink: 0 }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowAIModal(false)}
                disabled={aiLoading}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: `1px solid ${t.navBorder}`,
                  background: 'transparent',
                  color: t.titleColor,
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleAIAutofill}
                disabled={aiLoading}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#8b5cf6',
                  color: '#fff',
                  cursor: aiLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 800,
                }}
              >
                {aiLoading ? 'Generating...' : 'Generate Route'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <div style={{
        width: '360px', flexShrink: 0,
        backgroundColor: t.sidebarBg,
        borderLeft: `1px solid ${t.sidebarBorder}`,
        display: 'flex', flexDirection: 'column',
        transition: 'background-color 0.3s',
      }}>
        <BucketList
          list={bucketList}
          loading={loading}
          dark={dark}
          onRemove={handleRemoveLocation}
          onOptimize={handleOptimize}
          onReorder={(newList) => setBucketList(newList)}
        />
      </div>
    </div>
  );
};

export default Home;