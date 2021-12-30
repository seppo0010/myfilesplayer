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
  const [requestedLock, setRequestedLock] = useState(false);
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    if (requestedLock) return
    setRequestedLock(true)
    document.body.addEventListener('click', () => document.body.requestPointerLock());
  }, [requestedLock]);
  useEffect(() => {
    if (!videos.length) return
    let lastSelected = 0;
    // FIXME: videos cannot change after initial load
    document.addEventListener('mousemove', (e) => {
        if (!videos.length || e.movementY === 0) return;
        lastSelected = Math.min(
          Math.max(
            0,
            lastSelected + (e.movementY > 0 ? 1 : -1)
          ),
          videos.length - 1
        );
        setSelected(lastSelected);
    });
  }, [videos]);
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
          {videos.map((v, i) => (
            <li key={v.filename} style={i === selected ? {color: 'red'} : {}}>
              {v.filename}
            </li>
          ))}
        </ul>
      </div>)}
    </div>
  );
}

export default App;
