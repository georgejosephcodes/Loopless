import React from 'react';

const EmptyState = ({ icon: Icon, title, children, action }) => (
  <div className="empty-state">
    {Icon && (
      <div className="empty-icon">
        <Icon size={26} />
      </div>
    )}
    <h3>{title}</h3>
    {children && <p>{children}</p>}
    {action}
  </div>
);

export default EmptyState;
