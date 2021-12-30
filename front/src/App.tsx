import React, { useEffect, useState } from 'react';
import ReactPlayer from 'react-player'

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
  const [selected, setSelected] = useState(0);
  const [videoURL, setVideoURL] = useState('');

  useEffect(() => {
    if (videoURL !== '') return;
    const click = () => {
      if (!document.pointerLockElement) {
        document.body.requestPointerLock();
      } else {
        setVideoURL(`/videos/${videos[selected].filename}.webm`);
        document.exitPointerLock();
      }
    }
    document.body.addEventListener('click', click);
    return () =>  document.body.removeEventListener('click', click);
  }, [videos, selected, videoURL]);

  useEffect(() => {
    if (!videos.length || videoURL !== '') return
    let lastSelected = selected;
    const mousemove = (e: MouseEvent) => {
        if (!videos.length || e.movementY === 0) return;
        lastSelected = Math.min(
          Math.max(
            0,
            lastSelected + (e.movementY > 0 ? 1 : -1)
          ),
          videos.length - 1
        );
        setSelected(lastSelected);
    };
    document.addEventListener('mousemove', mousemove);
    return () => document.removeEventListener('mousemove', mousemove)
  }, [videos, videoURL, selected]);

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

  const videoEnded = () => {
    setTimeout(() => {
      setVideoURL('');
    }, 200);
  }

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
      {videoURL && <ReactPlayer url={videoURL} controls={true} onEnded={videoEnded} playing={true} />}
    </div>
  );
}

export default App;
