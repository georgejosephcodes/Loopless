import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Result from './pages/Result';
import { ThemeProvider } from './ThemeContext';

function App() {
  const [bucketList, setBucketList] = useState([]);

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home bucketList={bucketList} setBucketList={setBucketList} />} />
          <Route path="/result" element={<Result />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;