import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import Result from './pages/Result';
import { ThemeProvider } from './ThemeContext';

function App() {
  const [bucketList, setBucketList] = useState([]);

  return (
    <ThemeProvider>
      <Router>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 2200,
            style: {
              background: '#1e293b',
              color: '#fff',
              borderRadius: '12px',
              padding: '12px 16px',
              fontWeight: 600,
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />

        <Routes>
          <Route
            path="/"
            element={
              <Home
                bucketList={bucketList}
                setBucketList={setBucketList}
              />
            }
          />
          <Route path="/result" element={<Result />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;