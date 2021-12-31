import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";

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

function VideoList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadedVideos, setLoadedVideos] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selected, setSelected] = useState(0);

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

  useEffect(() => {
    if (!videos.length) return
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
  }, [videos, selected]);

  useEffect(() => {
    const click = () => {
      try {
        document.body.requestPointerLock();
      } catch (e) {}
      navigate(`/play/${encodeURIComponent(videos[selected].filename)}`);
    }
    document.body.addEventListener('click', click);
    return () =>  document.body.removeEventListener('click', click);
  }, [videos, selected, navigate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch(e.keyCode) {
        case 13: // enter
          navigate(`/play/${encodeURIComponent(videos[selected].filename)}`);
          break;
        case 38: // up arrow
        case 40: // down arrow
          setSelected(Math.min(
            Math.max(
              0,
              selected + e.keyCode - 39
            ),
            videos.length - 1
          ));
          break;
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [selected, videos, navigate]);

  return <div>
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
}

export default VideoList;
