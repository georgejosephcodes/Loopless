import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Result from './pages/Result';

function App() {
  const [bucketList, setBucketList] = useState([]);

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={<Home bucketList={bucketList} setBucketList={setBucketList} />} 
        />
        <Route path="/result" element={<Result />} />
      </Routes>
    </Router>
  );
}

export default App;