import React, { useEffect, useState } from 'react';

interface Video {
  filename: string
  opensubtitles: {
    moviehash: string
    moviebytesize: string
  }
  episode: null | {
    show: string
    season: number
    episode: number
  }
}

function App() {
  const [loading, setLoading] = useState(false);
  const [loadedVideos, setLoadedVideos] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  useEffect(() => {
    if (loading || loadedVideos) return;
    (async () => {
        setLoading(true);
        const res = await fetch('/api/videos.json');
        setVideos(await res.json());
        setLoadedVideos(true);
        setLoading(false);
    })();
  });

  return (
    <div>
      {loading && 'Loading...'}
      {loadedVideos && (<div>
        <h1>Videos</h1>
        <ul>
          {videos.map((v) => (
            <li key={v.filename}>
              {v.filename}
            </li>
          ))}
        </ul>
      </div>)}
    </div>
  );
}

export default App;
