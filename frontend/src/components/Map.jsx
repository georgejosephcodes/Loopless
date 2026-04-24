import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, OverlayView, DirectionsRenderer } from '@react-google-maps/api';
import { Plus, X, MapPin, Star } from 'lucide-react';

const CONTAINER_STYLE = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const LIBRARIES = ['places'];
const PIN_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

function CustomPin({ index, isSelected }) {
  const color = PIN_COLORS[index % PIN_COLORS.length];
  const size = isSelected ? 46 : 32;

  return (
    <div style={{
      position: 'relative',
      transform: 'translate(-50%, -100%)',
      zIndex: isSelected ? 100 : 1,
    }}>
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: '30%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60px', height: '60px',
          borderRadius: '50%',
          backgroundColor: `${color}35`,
          animation: 'mapPulse 1.4s ease-out infinite',
          pointerEvents: 'none',
          zIndex: -1,
        }} />
      )}
      <svg
        width={size}
        height={Math.round(size * 50 / 38)}
        viewBox="0 0 38 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: isSelected
            ? `drop-shadow(0 6px 14px ${color}88)`
            : `drop-shadow(0 3px 6px ${color}44)`,
          transition: 'width 0.2s, height 0.2s, filter 0.2s',
          display: 'block',
        }}
      >
        <path
          d="M19 0C8.507 0 0 8.507 0 19c0 14.25 19 31 19 31S38 33.25 38 19C38 8.507 29.493 0 19 0z"
          fill={color}
        />
        <circle cx="19" cy="19" r="8" fill="white" fillOpacity="0.9" />
        <text
          x="19" y="23"
          textAnchor="middle"
          fontSize="10" fontWeight="800"
          fill={color}
          fontFamily="system-ui, sans-serif"
        >
          {index + 1}
        </text>
      </svg>
      <style>{`
        @keyframes mapPulse {
          0%   { transform: translate(-50%, -50%) scale(0.6); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function LocationDot() {
  return (
    <div style={{ transform: 'translate(-50%, -50%)', position: 'relative', zIndex: 200 }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '48px', height: '48px', borderRadius: '50%',
        backgroundColor: 'rgba(66,133,244,0.15)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '32px', height: '32px', borderRadius: '50%',
        backgroundColor: 'rgba(66,133,244,0.2)',
        animation: 'locPulse 2.2s ease-out infinite', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'relative', width: '16px', height: '16px',
        borderRadius: '50%', backgroundColor: '#4285F4',
        border: '2.5px solid white', boxShadow: '0 1px 6px rgba(66,133,244,0.8)',
      }} />
      <style>{`
        @keyframes locPulse {
          0%   { transform: translate(-50%,-50%) scale(0.4); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// Google Maps–style info card that pops up on POI click
function PlaceInfoCard({ place, dark, onAdd, onClose, alreadyAdded, isFull }) {
  const [adding, setAdding] = useState(false);

  const handleAdd = () => {
    if (alreadyAdded || isFull || adding) return;
    setAdding(true);
    onAdd(place);
    setTimeout(() => setAdding(false), 600);
  };

  const bg   = dark ? '#1e293b' : '#ffffff';
  const text = dark ? '#f1f5f9' : '#1e293b';
  const sub  = dark ? '#94a3b8' : '#6b7280';
  const border = dark ? '#334155' : '#e5e7eb';

  return (
    // Positioned so the card appears above the clicked point
    <div style={{
      transform: 'translate(-50%, calc(-100% - 14px))',
      position: 'relative',
      zIndex: 1000,
      minWidth: '220px',
      maxWidth: '280px',
      backgroundColor: bg,
      border: `1px solid ${border}`,
      borderRadius: '12px',
      boxShadow: dark
        ? '0 8px 30px rgba(0,0,0,0.5)'
        : '0 8px 30px rgba(0,0,0,0.15)',
      overflow: 'hidden',
      animation: 'cardPop 0.18s cubic-bezier(0.34,1.56,0.64,1)',
      pointerEvents: 'all',
    }}>

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '8px', right: '8px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: sub, padding: '2px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1,
        }}
      >
        <X size={14} />
      </button>

      {/* Photo strip if available */}
      {place.photo && (
        <img
          src={place.photo}
          alt={place.name}
          style={{
            width: '100%', height: '100px',
            objectFit: 'cover', display: 'block',
          }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      )}

      <div style={{ padding: '12px 14px 12px' }}>
        {/* Category pill */}
        {place.type && (
          <span style={{
            display: 'inline-block',
            fontSize: '10px', fontWeight: 700,
            color: '#4285F4',
            backgroundColor: 'rgba(66,133,244,0.1)',
            padding: '2px 7px', borderRadius: '20px',
            marginBottom: '5px', letterSpacing: '0.03em',
            textTransform: 'capitalize',
          }}>
            {place.type.replace(/_/g, ' ')}
          </span>
        )}

        {/* Name */}
        <div style={{
          fontWeight: 700, fontSize: '14px',
          color: text, lineHeight: 1.3,
          marginBottom: '4px',
          paddingRight: '18px',
        }}>
          {place.name}
        </div>

        {/* Rating */}
        {place.rating && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            marginBottom: '4px',
          }}>
            <Star size={12} fill="#f59e0b" color="#f59e0b" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#f59e0b' }}>
              {place.rating}
            </span>
            {place.userRatingsTotal && (
              <span style={{ fontSize: '11px', color: sub }}>
                ({place.userRatingsTotal.toLocaleString()})
              </span>
            )}
          </div>
        )}

        {/* Address */}
        {place.address && (
          <div style={{
            fontSize: '11px', color: sub,
            lineHeight: 1.4, marginBottom: '10px',
          }}>
            {place.address}
          </div>
        )}

        {/* Add button */}
        <button
          onClick={handleAdd}
          disabled={alreadyAdded || isFull}
          style={{
            width: '100%', padding: '8px 0',
            borderRadius: '8px', border: 'none',
            backgroundColor: alreadyAdded
              ? (dark ? '#1e3a2f' : '#dcfce7')
              : isFull
                ? (dark ? '#1e293b' : '#f1f5f9')
                : '#4285F4',
            color: alreadyAdded
              ? '#10b981'
              : isFull
                ? sub
                : 'white',
            fontWeight: 700, fontSize: '12.5px',
            cursor: alreadyAdded || isFull ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '6px',
            transition: 'background-color 0.2s, transform 0.1s',
          }}
          onMouseEnter={(e) => {
            if (!alreadyAdded && !isFull)
              e.currentTarget.style.backgroundColor = '#1a73e8';
          }}
          onMouseLeave={(e) => {
            if (!alreadyAdded && !isFull)
              e.currentTarget.style.backgroundColor = '#4285F4';
          }}
          onMouseDown={(e) => {
            if (!alreadyAdded && !isFull)
              e.currentTarget.style.transform = 'scale(0.97)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {alreadyAdded ? (
            '✓ Added to Route'
          ) : isFull ? (
            'Route Full (15/15)'
          ) : (
            <>
              <Plus size={14} strokeWidth={2.5} />
              Add to Route
            </>
          )}
        </button>
      </div>

      {/* Caret pointer */}
      <div style={{
        position: 'absolute',
        bottom: '-7px', left: '50%',
        transform: 'translateX(-50%)',
        width: '14px', height: '7px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: '10px', height: '10px',
          backgroundColor: bg,
          border: `1px solid ${border}`,
          transform: 'rotate(45deg)',
          margin: '-5px auto 0',
          boxShadow: dark
            ? '2px 2px 4px rgba(0,0,0,0.3)'
            : '2px 2px 4px rgba(0,0,0,0.1)',
        }} />
      </div>

      <style>{`
        @keyframes cardPop {
          from { opacity: 0; transform: translate(-50%, calc(-100% - 8px)) scale(0.92); }
          to   { opacity: 1; transform: translate(-50%, calc(-100% - 14px)) scale(1); }
        }
      `}</style>
    </div>
  );
}

function createRadiusOverlayClass() {
  class RadiusDonutOverlay extends window.google.maps.OverlayView {
    constructor(map, center, radiusMeters) {
      super();
      this._center = center;
      this._radius = radiusMeters;
      this._canvas = null;
      this._container = null;
      this.setMap(map);
    }

    onAdd() {
      const container = document.createElement('div');
      container.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;';
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
      container.appendChild(canvas);
      this._container = container;
      this._canvas = canvas;
      this.getPanes().overlayLayer.appendChild(container);
    }

    draw() {
      if (!this._canvas) return;
      const proj = this.getProjection();
      if (!proj) return;
      const map = this.getMap();
      const bounds = map.getBounds();
      if (!bounds) return;
      const sw = proj.fromLatLngToDivPixel(bounds.getSouthWest());
      const ne = proj.fromLatLngToDivPixel(bounds.getNorthEast());
      if (!sw || !ne) return;
      const W = Math.abs(ne.x - sw.x);
      const H = Math.abs(sw.y - ne.y);
      this._canvas.width  = W;
      this._canvas.height = H;
      this._canvas.style.width  = W + 'px';
      this._canvas.style.height = H + 'px';
      this._canvas.style.left   = sw.x + 'px';
      this._canvas.style.top    = ne.y + 'px';
      const ctx = this._canvas.getContext('2d');
      ctx.clearRect(0, 0, W, H);
      const cp = proj.fromLatLngToDivPixel(this._center);
      if (!cp) return;
      const cx = cp.x - sw.x;
      const cy = cp.y - ne.y;
      const R_earth = 6371000;
      const latDelta = (this._radius / R_earth) * (180 / Math.PI);
      const edgePt = proj.fromLatLngToDivPixel(
        new window.google.maps.LatLng(this._center.lat() + latDelta, this._center.lng())
      );
      if (!edgePt) return;
      const pxRadius = Math.abs(edgePt.y - cp.y);
      ctx.fillStyle = 'rgba(10, 18, 35, 0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(cx, cy, pxRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.arc(cx, cy, pxRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#4285F4';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([10, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    onRemove() {
      if (this._container?.parentNode) this._container.parentNode.removeChild(this._container);
      this._container = null;
      this._canvas = null;
    }
  }
  return RadiusDonutOverlay;
}

const Map = ({
  locations,
  dark,
  routePath     = null,
  selectedIndex = null,
  userLocation  = null,
  radiusKm      = 0,
  onAddPlace,        // callback: (place) => void
  isFull = false,    // bucket list full?
}) => {
  const [mapInstance, setMapInstance] = useState(null);
  const [directions,  setDirections]  = useState(null);
  const [clickedPlace, setClickedPlace] = useState(null); // { name, lat, lng, type, address, rating, photo, placeId }
  const overlayRef   = useRef(null);
  const listenerRef  = useRef(null);
  const OverlayClass = useRef(null);
  const placesServiceRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const onLoad = useCallback((map) => {
    if (!OverlayClass.current) OverlayClass.current = createRadiusOverlayClass();
    // PlacesService for fetching POI details
    placesServiceRef.current = new window.google.maps.places.PlacesService(map);
    setMapInstance(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMapInstance(null);
    if (overlayRef.current)  { overlayRef.current.setMap(null); overlayRef.current = null; }
    if (listenerRef.current) { window.google?.maps.event.removeListener(listenerRef.current); listenerRef.current = null; }
  }, []);

  // Handle map click — both POI icon clicks and regular clicks
  const handleMapClick = useCallback((e) => {
    // Google fires placeId on the event when user clicks a POI icon
    if (e.placeId) {
      e.stop(); // prevent default info window

      placesServiceRef.current?.getDetails(
        {
          placeId: e.placeId,
          fields: ['name', 'geometry', 'formatted_address', 'types',
                   'rating', 'user_ratings_total', 'photos'],
        },
        (place, status) => {
          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place) return;
          setClickedPlace({
            placeId: e.placeId,
            name:    place.name,
            lat:     place.geometry.location.lat(),
            lng:     place.geometry.location.lng(),
            type:    place.types?.[0] ?? null,
            address: place.formatted_address ?? null,
            rating:  place.rating ?? null,
            userRatingsTotal: place.user_ratings_total ?? null,
            photo:   place.photos?.[0]?.getUrl({ maxWidth: 400 }) ?? null,
          });
        }
      );
    } else {
      // Click on blank map area → close any open card
      setClickedPlace(null);
    }
  }, []);

  // Fit bounds
  useEffect(() => {
    if (!mapInstance || !window.google) return;
    const allPoints = routePath ?? locations;
    if (allPoints.length === 0) {
      if (userLocation) { mapInstance.setCenter({ lat: userLocation.lat, lng: userLocation.lng }); mapInstance.setZoom(13); }
      else { mapInstance.setCenter(DEFAULT_CENTER); mapInstance.setZoom(5); }
      return;
    }
    if (allPoints.length === 1) { mapInstance.setCenter({ lat: allPoints[0].lat, lng: allPoints[0].lng }); mapInstance.setZoom(14); return; }
    const bounds = new window.google.maps.LatLngBounds();
    allPoints.forEach((loc) => bounds.extend({ lat: loc.lat, lng: loc.lng }));
    mapInstance.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
  }, [locations, routePath, mapInstance, userLocation]);

  // Pan to selected
  useEffect(() => {
    if (!mapInstance || !window.google || selectedIndex === null) return;
    const displayLocations = routePath ?? locations;
    const loc = displayLocations[selectedIndex];
    if (!loc) return;
    mapInstance.panTo({ lat: loc.lat, lng: loc.lng });
    if (mapInstance.getZoom() < 14) mapInstance.setZoom(10);
  }, [selectedIndex, locations, routePath, mapInstance]);

  // Directions
  useEffect(() => {
    if (!mapInstance || !window.google || !routePath || routePath.length < 2) return;
    const svc = new window.google.maps.DirectionsService();
    svc.route(
      {
        origin:      { lat: routePath[0].lat, lng: routePath[0].lng },
        destination: { lat: routePath[0].lat, lng: routePath[0].lng },
        waypoints:   routePath.slice(1).map(l => ({ location: { lat: l.lat, lng: l.lng }, stopover: true })),
        travelMode:  window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) setDirections(result);
        else console.error('Directions error', status);
      }
    );
  }, [routePath, mapInstance]);

  // Radius donut overlay
  useEffect(() => {
    if (overlayRef.current)  { overlayRef.current.setMap(null); overlayRef.current = null; }
    if (listenerRef.current) { window.google?.maps.event.removeListener(listenerRef.current); listenerRef.current = null; }
    if (!mapInstance || !window.google || !userLocation || radiusKm <= 0 || !OverlayClass.current) return;
    const center = new window.google.maps.LatLng(userLocation.lat, userLocation.lng);
    const overlay = new OverlayClass.current(mapInstance, center, radiusKm * 1000);
    overlayRef.current = overlay;
    listenerRef.current = window.google.maps.event.addListener(mapInstance, 'bounds_changed', () => overlay.draw());
    return () => {
      if (overlayRef.current)  { overlayRef.current.setMap(null); overlayRef.current = null; }
      if (listenerRef.current) { window.google.maps.event.removeListener(listenerRef.current); listenerRef.current = null; }
    };
  }, [mapInstance, userLocation, radiusKm]);

  const handleAddPlace = useCallback((place) => {
    onAddPlace?.({ name: place.name, lat: place.lat, lng: place.lng });
  }, [onAddPlace]);

  // Check if clicked place is already in list
  const alreadyAdded = clickedPlace
    ? locations.some(l => l.name === clickedPlace.name && Math.abs(l.lat - clickedPlace.lat) < 0.0001)
    : false;

  if (loadError) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#ef4444', fontSize: '14px',
        fontWeight: 600, backgroundColor: dark ? '#0f172a' : '#f8fafc',
      }}>
        ⚠️ Failed to load Google Maps. Check your API key.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', backgroundColor: dark ? '#0f172a' : '#f8fafc',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #3b82f6', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '13px', color: dark ? '#64748b' : '#94a3b8', fontWeight: 500 }}>Loading map…</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const displayLocations = routePath ?? locations;

  return (
    <GoogleMap
      mapContainerStyle={CONTAINER_STYLE}
      center={DEFAULT_CENTER}
      zoom={5}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={handleMapClick}
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        clickableIcons: true,   // keep POI icons clickable
        gestureHandling: 'greedy',
      }}
    >
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            suppressMarkers: true,
            polylineOptions: { strokeColor: '#3b82f6', strokeOpacity: 0.8, strokeWeight: 5 },
          }}
        />
      )}

      {/* Location blue dot */}
      {userLocation && (
        <OverlayView
          position={{ lat: userLocation.lat, lng: userLocation.lng }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <LocationDot />
        </OverlayView>
      )}

      {/* Route stop pins */}
      {displayLocations.map((loc, index) => (
        <OverlayView
          key={loc.id ?? `${loc.lat}-${loc.lng}-${index}`}
          position={{ lat: loc.lat, lng: loc.lng }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <CustomPin index={index} isSelected={selectedIndex === index} />
        </OverlayView>
      ))}

      {/* POI click info card */}
      {clickedPlace && (
        <OverlayView
          position={{ lat: clickedPlace.lat, lng: clickedPlace.lng }}
          mapPaneName={OverlayView.FLOAT_PANE}
        >
          <PlaceInfoCard
            place={clickedPlace}
            dark={dark}
            onAdd={handleAddPlace}
            onClose={() => setClickedPlace(null)}
            alreadyAdded={alreadyAdded}
            isFull={isFull}
          />
        </OverlayView>
      )}
    </GoogleMap>
  );
};

export default Map;