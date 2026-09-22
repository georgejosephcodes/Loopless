import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { refreshSession, setAccessToken, setAuthLostHandler } from './lib/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from the refresh cookie on first load.
  useEffect(() => {
    setAuthLostHandler(() => setUser(null));
    refreshSession()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const startSession = useCallback((data) => {
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(
    async (email, password) => startSession((await api.post('/api/auth/login', { email, password })).data),
    [startSession]
  );

  const register = useCallback(
    async (name, email, password) =>
      startSession((await api.post('/api/auth/register', { name, email, password })).data),
    [startSession]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
