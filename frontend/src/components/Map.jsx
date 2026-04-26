import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, CircleMarker, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CONTAINER_STYLE = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };

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


function RecenterMap({ center, zoom }) {
  const map = useMap();

  React.useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);

  return null;
}

function RadiusMask({ userLocation, radiusKm }) {
  if (!userLocation || radiusKm <= 0) return null;

  return (
    <>
      {/* Dark global overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(15,23,42,0.42)',
          pointerEvents: 'none',
          zIndex: 399,
        }}
      />

      {/* Transparent circular cutout */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: `${radiusKm * 55}px`,
          height: `${radiusKm * 55}px`,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          boxShadow: '0 0 0 9999px rgba(15,23,42,0.01)',
          background: 'transparent',
          pointerEvents: 'none',
          zIndex: 400,
          mixBlendMode: 'destination-out',
        }}
      />
    </>
  );
}

const Map = ({
  locations,
  dark,
  routePath     = null,
  roadPath = [],
  selectedIndex = null,
  userLocation  = null,
  radiusKm      = 0,
}) => {
  const isLoaded = true;
  const loadError = false;






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

  function createCustomPinIcon(index, isSelected) {
  const color = PIN_COLORS[index % PIN_COLORS.length];
  const size = isSelected ? 46 : 32;

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;transform:translate(-50%,-100%);">
        <svg
          width="${size}"
          height="${Math.round(size * 50 / 38)}"
          viewBox="0 0 38 50"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style="filter:${
            isSelected
              ? `drop-shadow(0 6px 14px ${color}88)`
              : `drop-shadow(0 3px 6px ${color}44)`
          };display:block;"
        >
          <path
            d="M19 0C8.507 0 0 8.507 0 19c0 14.25 19 31 19 31S38 33.25 38 19C38 8.507 29.493 0 19 0z"
            fill="${color}"
          />
          <circle cx="19" cy="19" r="8" fill="white" fill-opacity="0.9" />
          <text
            x="19"
            y="23"
            text-anchor="middle"
            font-size="10"
            font-weight="800"
            fill="${color}"
            font-family="system-ui, sans-serif"
          >
            ${index + 1}
          </text>
        </svg>
      </div>
    `,
    iconSize: [38, 50],
    iconAnchor: [19, 50],
  });
}
const routeCoordinates =
  roadPath.length > 1
    ? roadPath.map(point => [point.lat, point.lng])
    : [];

return (
  <>
    <MapContainer
      style={CONTAINER_STYLE}
      center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
      zoom={5}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <RecenterMap
center={
  radiusKm > 0 && userLocation
    ? [userLocation.lat, userLocation.lng]
    : displayLocations.length > 0
      ? [displayLocations[displayLocations.length - 1].lat, displayLocations[displayLocations.length - 1].lng]
      : userLocation
        ? [userLocation.lat, userLocation.lng]
        : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]
}
        zoom={userLocation || displayLocations.length > 0 ? 13 : 5}
      />

      {/* Location blue dot */}
      {userLocation && (
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={10}
          pathOptions={{
            color: '#ffffff',
            weight: 3,
            fillColor: '#4285F4',
            fillOpacity: 1,
          }}
        />
      )}

      {/* Radius circle */}
      {userLocation && radiusKm > 0 && (
        <Circle
          center={[userLocation.lat, userLocation.lng]}
          radius={radiusKm * 1000}
          pathOptions={{
            color: '#3b82f6',
            weight: 2,
            fillColor: '#3b82f6',
            fillOpacity: 0.08,
          }}
        />
      )}
      {/* Route path */}
      {routeCoordinates.length > 1 && (
        <Polyline
          positions={routeCoordinates}
          pathOptions={{
            color: '#3b82f6',
            weight: 4,
            opacity: 0.85,
          }}
        />
      )}
      {/* Route stop pins */}
      {displayLocations.map((loc, index) => (
        <Marker
          key={loc.id ?? `${loc.lat}-${loc.lng}-${index}`}
          position={[loc.lat, loc.lng]}
          icon={createCustomPinIcon(index, selectedIndex === index)}
        />
      ))}
    </MapContainer>

    {/* Outside radius dim mask */}
    <RadiusMask
      userLocation={userLocation}
      radiusKm={radiusKm}
    />
  </>
);
};

export default Map;