import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from "react-router-dom";

interface Video {
  id: number
  filename: string
  moviehash: string
}

interface Show {
  id: number
  tmdb_id: number
  name: string
  backdroppath: string
  overview: string
}

interface Episode {
  id: number
  video: number
  show: number
  name: string
  stillpath: string
  episode: number
  season: number
}

interface Movie {
  id: number
  video: number
  title: string
  backdroppath: string
}

interface MovieOrShow {
  movie?: Movie
  show?: Show
}

function VideoList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadedVideos, setLoadedVideos] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [moviesOrShow, setMoviesOrShow] = useState<MovieOrShow[]>([]);
  const [selected, setSelected] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listItemsRef = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (loading || loadedVideos) return;
    (async () => {
        setLoading(true);
        const res = await fetch('/api/videos.json');
        const data = await res.json();
        setEpisodes(data.episodes);
        setVideos(data.videos);
        setMoviesOrShow(data.movies
          .map((movie: Movie) => ({ movie }))
          .concat(data.shows
            .map((show: Show) => ({ show }))
          )
        );
        setLoadedVideos(true);
        setLoading(false);
    })();
  });

  const updateSelected = React.useCallback((diff: number) => {
    const s = Math.min(
      Math.max(
        0,
        selected + diff
      ),
      moviesOrShow.length - 1
    );
    setSelected(s);
    const cur = listItemsRef.current[s];
    const cont = containerRef.current;
    if (cur && cont) {
      setPositionY(- cur.offsetTop);
    }
    return s;
  }, [selected, moviesOrShow]);

  useEffect(() => {
    if (!moviesOrShow.length) return
    const mousemove = (e: MouseEvent) => {
        if (!moviesOrShow.length || e.movementY === 0) return;
        updateSelected(e.movementY > 0 ? 1 : -1);
    };
    document.addEventListener('mousemove', mousemove);
    return () => document.removeEventListener('mousemove', mousemove)
  }, [moviesOrShow, updateSelected]);

  const openSelected = React.useCallback(() => {
    const movieOrShow = moviesOrShow[selected];
    if (movieOrShow.movie) {
      const id = movieOrShow.movie.video;
      const video = videos.find((v) => v.id === id)
      if (video) {
        navigate(`/play/${encodeURIComponent(video.filename)}`);
      }
    }
  }, [moviesOrShow, navigate, selected, videos]);

  useEffect(() => {
    const click = () => {
      try {
        document.body.requestPointerLock();
      } catch (e) {}
      openSelected();
    }
    document.body.addEventListener('click', click);
    return () =>  document.body.removeEventListener('click', click);
  }, [openSelected]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      e.preventDefault();
      switch(e.keyCode) {
        case 13: // enter
          openSelected();
          break;
        case 38: // up arrow
        case 40: // down arrow
          updateSelected(e.keyCode - 39);
          break;
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [updateSelected, openSelected]);

  useEffect(() => {
     listItemsRef.current = listItemsRef.current.slice(0, moviesOrShow.length);
  }, [moviesOrShow]);

  return <div style={{height: '100%', overflow: 'hidden'}}>
      {loading && 'Loading...'}
      {loadedVideos && (<div ref={containerRef} style={{
          position: 'relative',
          top: positionY,
        }}>
        <ul>
          {moviesOrShow.map((mOrS, i) => (
            <li key={mOrS.movie?.id + ',' + mOrS.show?.id} style={i === selected ? {color: 'red'} : {}}>
              {mOrS.movie && (<>
                {mOrS.movie.title}
                <img src={`https://image.tmdb.org/t/p/w500${mOrS.movie.backdroppath}`} alt="" />
              </>)}
              {mOrS.show && (<>
                {mOrS.show.name}
                <img src={`https://image.tmdb.org/t/p/w500${mOrS.show.backdroppath}`} alt="" />
              </>)}
            </li>
          ))}
        </ul>
      </div>)}
  </div>
}

export default VideoList;
