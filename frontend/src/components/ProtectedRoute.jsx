import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Splash from './Splash';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Splash />;
  if (!user) return <Navigate to="/" replace state={{ from: location.pathname, resumeState: location.state }} />;
  return children;
};

export default ProtectedRoute;
