import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Planner from './pages/Planner';
import Result from './pages/Result';
import SmartItinerary from './pages/SmartItinerary';
import AuthPage from './pages/AuthPage';
import MyTrips from './pages/MyTrips';
import SharedTrip from './pages/SharedTrip';
import ProtectedRoute from './components/ProtectedRoute';
import Splash from './components/Splash';
import { ThemeProvider } from './ThemeContext';
import { AuthProvider, useAuth } from './AuthContext';

// "/" is the login page for signed-out visitors and the planner for everyone else.
function RootEntry() {
  const { user, loading } = useAuth();
  const { state } = useLocation();
  if (loading) return <Splash />;
  if (user) return <Navigate to={state?.from || '/plan'} replace state={state?.resumeState} />;
  return <AuthPage mode="login" />;
}

function App() {
  const [bucketList, setBucketList] = useState([]);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 2400,
              style: {
                background: 'var(--surface)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '12px 16px',
                fontWeight: 600,
                fontSize: '13.5px',
                boxShadow: 'var(--shadow-lg)',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />

          <Routes>
            <Route path="/" element={<RootEntry />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route
              path="/plan"
              element={
                <ProtectedRoute>
                  <Planner bucketList={bucketList} setBucketList={setBucketList} />
                </ProtectedRoute>
              }
            />
            <Route path="/result" element={<ProtectedRoute><Result /></ProtectedRoute>} />
            <Route path="/itinerary" element={<ProtectedRoute><SmartItinerary /></ProtectedRoute>} />
            <Route path="/trips" element={<ProtectedRoute><MyTrips /></ProtectedRoute>} />
            <Route path="/shared/:token" element={<SharedTrip />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
