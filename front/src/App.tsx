import React, { useEffect } from 'react';

function App() {
  const loading = useState(false);
  const loadedVideos = useState(false);
  const videos = useState([]);
  useEffect(() => {
    if (loading || loadedVideos) return;
    setLoading(true);
    fetch('/api/videos.json')
  });

  return (
    <div>
    </div>
  );
}

export default App;
