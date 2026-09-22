import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, CircleMarker, Circle, AttributionControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { pinFor } from '../constants/pins';
import './Map.css';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CONTAINER_STYLE = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };

// Geoapify raster tiles: a light and a dark style.
const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;
const RETINA = L.Browser.retina ? '@2x' : '';
const tileUrl = (style) =>
  `https://maps.geoapify.com/v1/tile/${style}/{z}/{x}/{y}${RETINA}.png?apiKey=${GEOAPIFY_KEY}`;
const TILES = {
  light: tileUrl('osm-bright'),
  dark: tileUrl('dark-matter'),
};
const ATTRIBUTION = 'Powered by <a href="https://www.geoapify.com/">Geoapify</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const ROUTE_COLOR = { light: '#f59e0b', dark: '#fbbf24' };
const USER_COLOR = '#0ea5e9';

function createPinIcon(index, isSelected) {
  const { bg, fg } = pinFor(index);
  const size = isSelected ? 46 : 34;
  const height = Math.round((size * 50) / 38);

  return L.divIcon({
    className: 'map-pin',
    html: `
      <div class="map-pin-inner">
        ${isSelected ? `<span class="map-pin-halo" style="background:${bg}40"></span>` : ''}
        <svg width="${size}" height="${height}" viewBox="0 0 38 50" fill="none" xmlns="http://www.w3.org/2000/svg"
          style="filter:drop-shadow(0 ${isSelected ? 6 : 3}px ${isSelected ? 12 : 6}px ${bg}${isSelected ? '99' : '55'});display:block;">
          <path d="M19 0C8.507 0 0 8.507 0 19c0 14.25 19 31 19 31S38 33.25 38 19C38 8.507 29.493 0 19 0z" fill="${bg}" stroke="rgba(255,255,255,0.9)" stroke-width="1.5"/>
          <circle cx="19" cy="19" r="10" fill="${fg === '#ffffff' ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.35)'}"/>
          <text x="19" y="23" text-anchor="middle" font-size="12" font-weight="800" fill="${fg}" font-family="'Plus Jakarta Sans', system-ui, sans-serif">${index + 1}</text>
        </svg>
      </div>
    `,
    iconSize: [38, 50],
    iconAnchor: [19, 50],
  });
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
      {/* Dim overlay */}
      <div className="map-radius-dim" />

      {/* Transparent circular cutout */}
      <div
        className="map-radius-cut"
        style={{ width: `${radiusKm * 55}px`, height: `${radiusKm * 55}px` }}
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
  const theme = dark ? 'dark' : 'light';
  const displayLocations = routePath ?? locations;

  const routeCoordinates =
    roadPath.length > 1
      ? roadPath.map(point => [point.lat, point.lng])
      : [];

  const lastLocation = displayLocations[displayLocations.length - 1];
  // Memoized on primitive lat/lng values, not on lastLocation/userLocation
  // object identity, so a re-render that doesn't move the trip (e.g. a
  // dark-mode toggle) keeps the same array reference and does not re-fire
  // RecenterMap's effect, which would otherwise snap the view back.
  const center = React.useMemo(
    () =>
      radiusKm > 0 && userLocation
        ? [userLocation.lat, userLocation.lng]
        : lastLocation
          ? [lastLocation.lat, lastLocation.lng]
          : userLocation
            ? [userLocation.lat, userLocation.lng]
            : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
    [radiusKm, userLocation?.lat, userLocation?.lng, lastLocation?.lat, lastLocation?.lng]
  );

  return (
    <>
      <MapContainer
        style={CONTAINER_STYLE}
        center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
        zoom={5}
        attributionControl={false}
      >
        {/* Bottom-left so the floating trip panel never covers the credit */}
        <AttributionControl position="bottomleft" />
        <TileLayer key={theme} url={TILES[theme]} attribution={ATTRIBUTION} maxZoom={20} />

        <RecenterMap
          center={center}
          zoom={userLocation || displayLocations.length > 0 ? 13 : 5}
        />

        {/* Location dot */}
        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={10}
            pathOptions={{ color: '#ffffff', weight: 3, fillColor: USER_COLOR, fillOpacity: 1 }}
          />
        )}

        {/* Radius circle */}
        {userLocation && radiusKm > 0 && (
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={radiusKm * 1000}
            pathOptions={{ color: USER_COLOR, weight: 2, fillColor: USER_COLOR, fillOpacity: 0.08 }}
          />
        )}

        {/* Route path: soft under-stroke + crisp line */}
        {routeCoordinates.length > 1 && (
          <>
            <Polyline
              positions={routeCoordinates}
              pathOptions={{ color: ROUTE_COLOR[theme], weight: 10, opacity: 0.22, lineCap: 'round', lineJoin: 'round' }}
            />
            <Polyline
              positions={routeCoordinates}
              pathOptions={{ color: ROUTE_COLOR[theme], weight: 4, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
            />
          </>
        )}

        {/* Route stop pins */}
        {displayLocations.map((loc, index) => (
          <Marker
            key={loc.id ?? `${loc.lat}-${loc.lng}-${index}`}
            position={[loc.lat, loc.lng]}
            icon={createPinIcon(index, selectedIndex === index)}
            zIndexOffset={selectedIndex === index ? 1000 : 0}
          />
        ))}
      </MapContainer>

      {/* Outside radius dim mask */}
      <RadiusMask userLocation={userLocation} radiusKm={radiusKm} />
    </>
  );
};

export default Map;
