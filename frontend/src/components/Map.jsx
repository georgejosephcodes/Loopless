import React from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

function RecenterMap({ center }) {
  const map = useMap();
  map.setView(center, 14);
  return null;
}

const Map = ({ locations, dark }) => {
  const center = locations.length > 0
    ? [locations[locations.length - 1].lat, locations[locations.length - 1].lng]
    : [12.9716, 77.5946];

  const tileUrl = dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer key={tileUrl} url={tileUrl} />
      {locations.map((loc) => (
        <Marker key={loc.id} position={[loc.lat, loc.lng]} />
      ))}
      {locations.length > 0 && <RecenterMap center={center} />}
    </MapContainer>
  );
};

export default Map;