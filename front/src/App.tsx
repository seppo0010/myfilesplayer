import React, { useEffect, useState, useRef } from 'react';
import ReactPlayer from 'react-player';
import formatDuration from 'format-duration';

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
  const videoRef = useRef<null | ReactPlayer>(null);
  const [loading, setLoading] = useState(false);
  const [loadedVideos, setLoadedVideos] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selected, setSelected] = useState(0);
  const [videoURL, setVideoURL] = useState('');
  const [videoProgress, setVideoProgress] = useState(0.0);

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

  const onVideoEnded = () => {
    setTimeout(() => {
      // setVideoURL('');
    }, 200);
  }

  const onProgress = (v: { played: number }) => {
    setVideoProgress(v.played);
  }

  const onChangeProgress = (e: any) => {
    if (videoRef) {
      videoRef.current?.seekTo(e.target.value / 10000, 'fraction');
    }
  }

  return (
    <div style={{
      position: 'relative',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    }}>
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
      {videoURL && (<div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}>
        <ReactPlayer url={videoURL} controls={false} onEnded={onVideoEnded} onProgress={onProgress} playing={true} style={{ background: 'black' }} width="100%" height="100%" ref={videoRef} />
        <input type="range" max="10000" value={videoProgress * 10000} style={{
          position: 'fixed',
          bottom: 10,
          width: '80%',
          left: '10%',
        }} onChange={onChangeProgress} />
        <div style={{
          position: 'fixed',
          bottom: 14,
          right: '2%',
          color: 'white',
          fontWeight: 'bold',
          textAlign: 'right',
        }}>{formatDuration(videoProgress * (videoRef.current?.getDuration() || 0) * 1000)}</div>
      </div>)}
    </div>
  );
}

export default App;
