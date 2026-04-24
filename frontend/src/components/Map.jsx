import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, OverlayView, DirectionsRenderer } from '@react-google-maps/api';

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

// Exact Google Maps–style blue dot
function LocationDot() {
  return (
    <div style={{ transform: 'translate(-50%, -50%)', position: 'relative', zIndex: 200 }}>
      {/* Accuracy halo */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '48px', height: '48px',
        borderRadius: '50%',
        backgroundColor: 'rgba(66,133,244,0.15)',
        pointerEvents: 'none',
      }} />
      {/* Animate pulse */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '32px', height: '32px',
        borderRadius: '50%',
        backgroundColor: 'rgba(66,133,244,0.2)',
        animation: 'locPulse 2.2s ease-out infinite',
        pointerEvents: 'none',
      }} />
      {/* Main blue dot */}
      <div style={{
        position: 'relative',
        width: '16px', height: '16px',
        borderRadius: '50%',
        backgroundColor: '#4285F4',
        border: '2.5px solid white',
        boxShadow: '0 1px 6px rgba(66,133,244,0.8)',
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

// Builds a canvas-based donut overlay using Google Maps OverlayView API
// Dark outside the radius circle, fully clear inside — redraws on every map move
function createRadiusOverlayClass() {
  class RadiusDonutOverlay extends window.google.maps.OverlayView {
    constructor(map, center, radiusMeters) {
      super();
      this._center = center;       // google.maps.LatLng
      this._radius = radiusMeters; // number
      this._canvas = null;
      this._container = null;
      this.setMap(map);
    }

    onAdd() {
      const container = document.createElement('div');
      container.style.cssText = [
        'position:absolute',
        'top:0', 'left:0',
        'width:100%', 'height:100%',
        'pointer-events:none',
        'z-index:5',
      ].join(';');

      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
      container.appendChild(canvas);

      this._container = container;
      this._canvas = canvas;

      // Attach to the overlayLayer pane (sits above tiles, below markers)
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

      // Size the canvas to the current map viewport
      this._canvas.width  = W;
      this._canvas.height = H;
      this._canvas.style.width  = W + 'px';
      this._canvas.style.height = H + 'px';
      this._canvas.style.left   = sw.x + 'px';
      this._canvas.style.top    = ne.y + 'px';

      const ctx = this._canvas.getContext('2d');
      ctx.clearRect(0, 0, W, H);

      // Center pixel (relative to the overlay div origin)
      const cp = proj.fromLatLngToDivPixel(this._center);
      if (!cp) return;
      const cx = cp.x - sw.x;
      const cy = cp.y - ne.y;

      // Convert radius from metres → pixels using a north offset
      const R_earth = 6371000;
      const latDelta = (this._radius / R_earth) * (180 / Math.PI);
      const edgePt   = proj.fromLatLngToDivPixel(
        new window.google.maps.LatLng(
          this._center.lat() + latDelta,
          this._center.lng()
        )
      );
      if (!edgePt) return;
      const pxRadius = Math.abs(edgePt.y - cp.y);

      // 1) Fill everything dark
      ctx.fillStyle = 'rgba(10, 18, 35, 0.55)';
      ctx.fillRect(0, 0, W, H);

      // 2) Punch a transparent hole for the "inside radius" area
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(cx, cy, pxRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.fill();

      // 3) Switch back and draw a crisp blue dashed ring at the border
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.arc(cx, cy, pxRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#4285F4';
      ctx.lineWidth   = 2.5;
      ctx.setLineDash([10, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    onRemove() {
      if (this._container?.parentNode) {
        this._container.parentNode.removeChild(this._container);
      }
      this._container = null;
      this._canvas    = null;
    }

    update(center, radius) {
      this._center = center;
      this._radius = radius;
      this.draw();
    }
  }

  return RadiusDonutOverlay;
}

const Map = ({
  locations,
  dark,
  routePath   = null,
  selectedIndex = null,
  userLocation  = null,
  radiusKm      = 0,
}) => {
  const [mapInstance, setMapInstance]   = useState(null);
  const [directions,  setDirections]    = useState(null);
  const overlayRef   = useRef(null);
  const listenerRef  = useRef(null);
  const OverlayClass = useRef(null); // store class after google loads

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const onLoad = useCallback((map) => {
    // Build the class now that window.google exists
    if (!OverlayClass.current) {
      OverlayClass.current = createRadiusOverlayClass();
    }
    setMapInstance(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMapInstance(null);
    if (overlayRef.current) { overlayRef.current.setMap(null); overlayRef.current = null; }
    if (listenerRef.current) { window.google?.maps.event.removeListener(listenerRef.current); listenerRef.current = null; }
  }, []);

  // ── Fit bounds ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstance || !window.google) return;
    const allPoints = routePath ?? locations;
    if (allPoints.length === 0) {
      if (userLocation) {
        mapInstance.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
        mapInstance.setZoom(13);
      } else {
        mapInstance.setCenter(DEFAULT_CENTER);
        mapInstance.setZoom(5);
      }
      return;
    }
    if (allPoints.length === 1) {
      mapInstance.setCenter({ lat: allPoints[0].lat, lng: allPoints[0].lng });
      mapInstance.setZoom(14);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    allPoints.forEach((loc) => bounds.extend({ lat: loc.lat, lng: loc.lng }));
    mapInstance.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
  }, [locations, routePath, mapInstance, userLocation]);

  // ── Pan to selected ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstance || !window.google || selectedIndex === null) return;
    const displayLocations = routePath ?? locations;
    const loc = displayLocations[selectedIndex];
    if (!loc) return;
    mapInstance.panTo({ lat: loc.lat, lng: loc.lng });
    if (mapInstance.getZoom() < 14) mapInstance.setZoom(10);
  }, [selectedIndex, locations, routePath, mapInstance]);

  // ── Directions ───────────────────────────────────────────────────────────
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

  // ── Radius donut overlay ─────────────────────────────────────────────────
  useEffect(() => {
    // Tear down previous overlay + listener
    if (overlayRef.current)  { overlayRef.current.setMap(null); overlayRef.current = null; }
    if (listenerRef.current) { window.google?.maps.event.removeListener(listenerRef.current); listenerRef.current = null; }

    if (!mapInstance || !window.google || !userLocation || radiusKm <= 0 || !OverlayClass.current) return;

    const center = new window.google.maps.LatLng(userLocation.lat, userLocation.lng);
    const overlay = new OverlayClass.current(mapInstance, center, radiusKm * 1000);
    overlayRef.current = overlay;

    // Redraw whenever the map viewport changes (pan / zoom)
    listenerRef.current = window.google.maps.event.addListener(mapInstance, 'bounds_changed', () => {
      overlay.draw();
    });

    return () => {
      if (overlayRef.current)  { overlayRef.current.setMap(null); overlayRef.current = null; }
      if (listenerRef.current) { window.google.maps.event.removeListener(listenerRef.current); listenerRef.current = null; }
    };
  }, [mapInstance, userLocation, radiusKm]);

  // ── Render guards ────────────────────────────────────────────────────────
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
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            border: '3px solid #3b82f6', borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ fontSize: '13px', color: dark ? '#64748b' : '#94a3b8', fontWeight: 500 }}>
            Loading map…
          </span>
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
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        clickableIcons: true,
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

      {/* Google Maps–style location dot */}
      {userLocation && (
        <OverlayView
          position={{ lat: userLocation.lat, lng: userLocation.lng }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <LocationDot />
        </OverlayView>
      )}

      {displayLocations.map((loc, index) => (
        <OverlayView
          key={loc.id ?? `${loc.lat}-${loc.lng}-${index}`}
          position={{ lat: loc.lat, lng: loc.lng }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <CustomPin index={index} isSelected={selectedIndex === index} />
        </OverlayView>
      ))}
    </GoogleMap>
  );
};

export default Map;