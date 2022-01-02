import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import ReactPlayer from 'react-player';
import formatDuration from 'format-duration';
import parseSRT from 'parse-srt'

import SubtitleMenu from './SubtitleMenu';

function VideoPlayer() {
  const params = useParams();
  const videoRef = useRef<null | ReactPlayer>(null);
  const navigate = useNavigate();
  const [selectingSubtitles, setSelectingSubtitles] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0.0);
  const [subtitles, setSubtitles] = useState<{
    // FIXME: move to parse-srt.d.ts
    start: number,
    end: number,
    text: string,
  }[]>([]);

  const [initialProgress, setInitialProgress] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      if (initialProgress !== null) return;
      try {
        const res = await fetch(`/api/progress/${encodeURIComponent(params.videoId || '')}`);
        const data = await res.json();
        setInitialProgress(data.progress || 0.0);
        videoRef.current?.seekTo(data.progress, 'seconds');
      } catch (e) {
        setInitialProgress(0.0);
      }
    })();
  }, [initialProgress, params.videoId])

  const onSubtitlesSelected = (subs: string) => {
    setSubtitles(parseSRT(subs));
    setSelectingSubtitles(false);
  }

  useEffect(() => {
    const timeInterval = setInterval(() => {
      if (videoRef.current === null) return;
      const progress = videoRef.current.getCurrentTime()
      fetch('/api/progress', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          video: params.videoId,
          progress,
        })
      })
    }, 5000);
    return () => clearInterval(timeInterval);
  }, [params.videoId, videoRef]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch(e.keyCode) {
        case 406: // blue
        case 460: // "subtitle"
        case 67: // "c"
          setSelectingSubtitles(!selectingSubtitles);
          break;
        case 27: // esc
          if (selectingSubtitles) {
            setSelectingSubtitles(false);
          } else {
            navigate('/');
          }
          break;
        case 19: // pause
        case 32: // space bar
        case 415: // play
          setPlaying(!playing);
          break;
        case 412: // seek backward
        case 37: // left arrow
          videoRef.current?.seekTo(videoRef.current?.getCurrentTime() - 15, 'seconds');
          break;
        case 417: // seek forward
        case 39: // right arrow
          videoRef.current?.seekTo(videoRef.current?.getCurrentTime() + 15, 'seconds');
          break;
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [playing, videoRef, navigate, selectingSubtitles]);

  const onVideoEnded = () => {
    setTimeout(() => {
      navigate('/');
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

  const playPauseOnClick = () => {
    setPlaying(!playing);
  }

  if (initialProgress === null) {
    return <div />
  }
  const currentTime = videoRef.current?.getCurrentTime() || 0;
  return (
    <div style={{
      position: 'relative',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'black',
    }}>
      {(<div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}>
        <ReactPlayer url={`/videos/${params.videoId}.mp4`} controls={false} onEnded={onVideoEnded} onProgress={onProgress} playing={playing} style={{ background: 'black', opacity: playing ? 1 : 0.4 }} width="100%" height="100%" ref={videoRef} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
        {selectingSubtitles && params.videoId && <SubtitleMenu video={params.videoId} onSelected={onSubtitlesSelected} />}
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: '2%',
          width: '96%',
          color: 'yellow',
          fontSize: '10vh',
          textAlign: 'center',
        }} dangerouslySetInnerHTML={{__html: (subtitles.find((s) => s.start < currentTime && currentTime < s.end) || {}).text || ''}}>
        </div>
        {!playing && <div style={{
          position: 'fixed',
          bottom: 10,
          color: 'white',
          fontWeight: 'bold',
          textAlign: 'left',
        }}>
          <div style={{
            position: 'fixed',
            bottom: 10,
            left: '2%',
            color: 'white',
            fontWeight: 'bold',
            textAlign: 'left',
          }}>
            <button style={{
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: '0',
              margin: '0',
              fontSize: 20,
            }} onClick={playPauseOnClick}>{!playing ? '▶️' : '⏸'}</button>
          </div>
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
        </div>}
      </div>)}
    </div>
  )
}

export default VideoPlayer;
