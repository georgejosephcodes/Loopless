import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Locate, Sparkles, Map as MapIcon, Search, Zap, Wand2, ChevronUp, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import SearchBar from '../components/SearchBar';
import BucketList from '../components/BucketList';
import Map from '../components/Map';
import AppBar from '../components/AppBar';
import Logo from '../components/Logo';
import { AIChooserModal, NaturalPlanModal, AutofillModal } from '../components/modals/AIModals';
import { useTheme } from '../ThemeContext';
import './Planner.css';

const RADIUS_OPTIONS = [0, 5, 10, 25, 50, 100];

const Planner = ({ bucketList, setBucketList }) => {
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [radiusKm, setRadiusKm] = useState(0);
  const [showAIChooser, setShowAIChooser] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRadius, setAiRadius] = useState(25);
  const [aiMaxStops, setAiMaxStops] = useState(5);
  const [aiCategory, setAiCategory] = useState('Mixed');
  const [showNLModal, setShowNLModal] = useState(false);
  const [nlPrompt, setNlPrompt] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState('');
  const [panelOpen, setPanelOpen] = useState(true); // bottom sheet state on small screens
  const [routeMode, setRouteMode] = useState('roundtrip'); // 'roundtrip' | 'oneway'
  const navigate = useNavigate();
  const { dark } = useTheme();

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
      toast.error('Geolocation is not supported by your browser.');
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
        toast.error('Could not detect your location. Please allow location access.');
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
        {
          locations: cleanLocations,
          mode: routeMode,
          ...(routeMode === 'oneway' ? { startIdx: 0, endIdx: cleanLocations.length - 1 } : {}),
        }
      );
      navigate('/result', {
        state: {
          locations: res.data.path,
          distance: res.data.distance,
          mode: res.data.mode,
          matrix: res.data.matrix,
          durationMatrix: res.data.durationMatrix,
          estimatedMatrix: res.data.estimatedMatrix,
          routeGeometry: res.data.routeGeometry,
        },
      });
    } catch (err) {
      console.error('Optimization error:', err.response?.data || err.message);
      toast.error(err.response?.data?.error || 'Could not optimize the route. Please try again.');
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
      toast.success(`Added ${newPlacesToAdd.length} new places`);
      setShowAIModal(false);
    } catch (err) {
      console.error('AI Autofill failed:', err.response?.data || err.message);
      toast.error(err.response?.data?.error || 'AI Autofill failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateNLPlan = async () => {
    if (!nlPrompt.trim()) {
      setNlError('Please describe the trip you want to plan.');
      return;
    }
    if (bucketList.length >= 15) {
      setNlError('Bucket list is already full.');
      return;
    }
    setNlLoading(true);
    setNlError('');
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/ai-plan`,
        { prompt: nlPrompt.trim() }
      );
      const planPlaces = res.data.places || [];
      if (!planPlaces.length) {
        setNlError('No valid places found for that trip. Try rephrasing your prompt.');
        return;
      }
      const remainingSlots = 15 - bucketList.length;
      const existingLocations = [...bucketList];
      const newPlacesToAdd = [];
      for (const place of planPlaces) {
        if (newPlacesToAdd.length >= remainingSlots) break;
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
      }
      if (newPlacesToAdd.length === 0) {
        setNlError('All suggested places were already in your route.');
        return;
      }
      setBucketList((prev) => [...prev, ...newPlacesToAdd]);
      toast.success(`Added ${newPlacesToAdd.length} new places`);
      setShowNLModal(false);
      setNlPrompt('');
    } catch (err) {
      console.error('Natural language plan failed:', err.response?.data || err.message);
      setNlError(err.response?.data?.error || 'Failed to generate a plan. Please try again.');
    } finally {
      setNlLoading(false);
    }
  };

  const isEmpty = bucketList.length === 0;

  return (
    <div className="planner">
      <AppBar
        left={<Logo to="/plan" />}
        center={
          <div className="planner-search">
            <SearchBar onAdd={handleAddLocation} disabled={bucketList.length >= 15} dark={dark} />
          </div>
        }
        right={(
          <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/trips')}>
              <MapIcon size={15} /> <span className="hide-mobile">My trips</span>
            </button>
            <button type="button" className="btn btn-ai btn-sm" onClick={() => setShowAIChooser(true)}>
              <Sparkles size={15} /> <span className="hide-mobile">AI plan</span>
            </button>
          </>
        )}
      />

      <div className="planner-body">
        <div className="planner-map">
          <Map
            locations={bucketList}
            dark={dark}
            userLocation={userLocation}
            radiusKm={radiusKm}
            onAddPlace={handleAddLocation}
            isFull={bucketList.length >= 15}
          />
        </div>

        {/* Map controls */}
        <div className="map-controls">
          {userLocation && (
            <div className="radius-panel glass">
              <div className="radius-head">
                <span>Focus radius</span>
                <b className="num">{radiusKm === 0 ? 'Off' : `${radiusKm} km`}</b>
              </div>
              <div className="chip-row">
                {RADIUS_OPTIONS.map((r) => (
                  <button key={r} type="button" className={`chip${radiusKm === r ? ' is-active' : ''}`} onClick={() => setRadiusKm(r)}>
                    {r === 0 ? 'Off' : r}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            className={`map-fab glass${userLocation ? ' is-active' : ''}`}
            onClick={handleDetectLocation}
            disabled={locating}
            title="Detect my location"
            aria-label="Detect my location"
          >
            {locating ? <span className="spinner" /> : <Locate size={19} />}
          </button>
        </div>

        {/* Empty state */}
        {isEmpty && !userLocation && (
          <div className="planner-empty">
            <div className="planner-empty-card glass">
              <div className="empty-icon"><MapIcon size={26} /></div>
              <h2>Start your trip</h2>
              <p>Add the places you want to visit. Loopless finds the shortest loop through all of them.</p>
              <ul>
                <li><Search size={16} /> Search for a place in the bar above</li>
                <li><Zap size={16} /> Add at least 2 stops, then optimize</li>
                <li><Wand2 size={16} /> Or let AI suggest a plan for you</li>
              </ul>
              <button type="button" className="btn btn-ai" onClick={() => setShowAIChooser(true)}>
                <Sparkles size={16} /> Plan with AI
              </button>
            </div>
          </div>
        )}

        {/* Trip panel: floating card on desktop, bottom sheet on mobile */}
        <aside className={`planner-panel card${panelOpen ? '' : ' is-collapsed'}`}>
          <button type="button" className="sheet-toggle" onClick={() => setPanelOpen((o) => !o)} aria-label={panelOpen ? 'Collapse trip panel' : 'Expand trip panel'}>
            {panelOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <BucketList
            list={bucketList}
            loading={loading}
            onRemove={handleRemoveLocation}
            onClearAll={() => setBucketList([])}
            onOptimize={handleOptimize}
            onReorder={(newList) => setBucketList(newList)}
            mode={routeMode}
            setMode={setRouteMode}
          />
        </aside>

        {loading && (
          <div className="planner-loading" role="status">
            <div className="planner-loading-card glass">
              <span className="spinner spinner-lg" style={{ color: 'var(--accent)' }} />
              <strong>Finding the best route…</strong>
              <small>Running the TSP solver on real road distances</small>
            </div>
          </div>
        )}
      </div>

      {showAIChooser && (
        <AIChooserModal
          onClose={() => setShowAIChooser(false)}
          onAutofill={() => { setShowAIChooser(false); setShowAIModal(true); }}
          onNaturalPlan={() => { setShowAIChooser(false); setNlError(''); setShowNLModal(true); }}
        />
      )}

      {showNLModal && (
        <NaturalPlanModal
          prompt={nlPrompt}
          setPrompt={setNlPrompt}
          loading={nlLoading}
          error={nlError}
          onGenerate={handleGenerateNLPlan}
          onClose={() => setShowNLModal(false)}
          onBack={() => { setShowNLModal(false); setShowAIChooser(true); }}
        />
      )}

      {showAIModal && (
        <AutofillModal
          radius={aiRadius}
          setRadius={setAiRadius}
          maxStops={aiMaxStops}
          setMaxStops={setAiMaxStops}
          maxAvailable={15 - bucketList.length}
          category={aiCategory}
          setCategory={setAiCategory}
          loading={aiLoading}
          onGenerate={handleAIAutofill}
          onClose={() => setShowAIModal(false)}
          onBack={() => { setShowAIModal(false); setShowAIChooser(true); }}
        />
      )}
    </div>
  );
};

export default Planner;
