import React from 'react';

const StatTile = ({ label, value, color }) => (
  <div className="stat">
    <span className="stat-label">{label}</span>
    <span className="stat-value" style={color ? { color } : undefined}>{value}</span>
  </div>
);

export default StatTile;
