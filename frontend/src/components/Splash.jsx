import React from 'react';

const Splash = () => (
  <div style={{ height: '100dvh', display: 'grid', placeItems: 'center', color: 'var(--accent)' }} role="status" aria-label="Loading">
    <div className="spinner spinner-lg" />
  </div>
);

export default Splash;
