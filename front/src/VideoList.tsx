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
  const [selectedEpisode, setSelectedEpisode] = useState<{[key: string]: number}>({});
  const [positionY, setPositionY] = useState(0);
  const [selectedShowEpisodes, setSelectedShowEpisodes] = useState<Episode[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const listItemsRef = useRef<(HTMLLIElement | null)[]>([]);
  const [mouseEnabled, setMouseEnabled] = useState(true)

  useEffect(() => {
    if (loading || loadedVideos) return;
    (async () => {
        setLoading(true);
        const res = await fetch('/api/videos.json');
        const data = await res.json();
        setEpisodes(data.episodes);
        setVideos(data.videos);
        const movieOrShowIndex = (mOrS: MovieOrShow) => {
          let index;
          if (mOrS.movie) {
            index = data.watchHistory.findIndex((wh: any) => wh.movieid === mOrS.movie?.id)
          }
          if (mOrS.show) {
            index = data.watchHistory.findIndex((wh: any) => wh.showid === mOrS.show?.id)
          }
          return index === -1 ? Number.MAX_SAFE_INTEGER : index;
        }
        const mOrSs = data.movies
          .map((movie: Movie) => ({ movie }))
          .concat(data.shows
            .map((show: Show) => ({ show }))
          )
          .sort((f: MovieOrShow, l: MovieOrShow) => movieOrShowIndex(f) - movieOrShowIndex(l))
        setMoviesOrShow(mOrSs);
        setSelectedEpisode(Object.fromEntries(mOrSs.map(({ show }: { show: Show }, i: number) => {
          if (!show) return [[i], 0]
          const wh: any = data.watchHistory.find((wh: any) => wh.showid === show.id)
          if (!wh) return [[i], 0]
          const { videoid } = wh
          const episodes = data.episodes.filter((ep: Episode) => ep.show === wh.showid);
          if (!episodes) return [[i], 0]
          const index = episodes.findIndex((ep: Episode) => ep.video === videoid);
          return [[i], index === -1 ? 0 : index]
        })));
        setLoadedVideos(true);
        setLoading(false);
    })();
  });

  const updateSelectedEpisode = React.useCallback((diff: number) => {
    const s = Math.max(
      0,
      Math.min(
        selectedEpisode[selected] + diff,
        selectedShowEpisodes.length - 1
      )
    );
    setSelectedEpisode(Object.assign({}, selectedEpisode, {[selected]: s}));
  }, [selectedEpisode, selectedShowEpisodes, selected]);

  const updateSelected = React.useCallback((diff: number) => {
    const s = Math.max(
      0,
      Math.min(
        selected + diff,
        moviesOrShow.length - 1
      ),
    );
    setSelected(s);

    const movieOrShow = moviesOrShow[s];
    if (movieOrShow.movie) {
      setSelectedShowEpisodes([]);
    } else if (movieOrShow.show) {
      const show = movieOrShow.show;
      setSelectedShowEpisodes(episodes.filter((e) => e.show === show.id));
    }

    const cur = listItemsRef.current[s];
    const cont = containerRef.current;
    if (cur && cont) {
      setPositionY(- cur.offsetTop);
    }
    return s;
  }, [selected, moviesOrShow, episodes]);

  const [episodeInitialized, setEpisodeInitialized] = useState(false);
  useEffect(() => {
    if (!episodeInitialized && moviesOrShow.length > 0) {
      setEpisodeInitialized(true);
      updateSelected(0);
    }
  }, [setEpisodeInitialized, episodeInitialized, moviesOrShow.length, updateSelected]);

  useEffect(() => {
    if (!moviesOrShow.length) return
    const mousemove = (e: MouseEvent) => {
      if (!mouseEnabled) return
      if (moviesOrShow.length && e.movementY !== 0) {
        updateSelected(e.movementY > 0 ? 1 : -1);
      }
      if (selectedShowEpisodes.length && e.movementX !== 0) {
        updateSelectedEpisode(e.movementX > 0 ? 1 : -1);
      }
    };
    document.addEventListener('mousemove', mousemove);
    return () => document.removeEventListener('mousemove', mousemove)
  }, [moviesOrShow, updateSelected, updateSelectedEpisode, selectedShowEpisodes, mouseEnabled]);

  const openSelected = React.useCallback(() => {
    const movieOrShow = moviesOrShow[selected];
    let id = 0;
    if (movieOrShow.movie) {
      id = movieOrShow.movie.video;
    } else if (movieOrShow.show) {
      id = selectedShowEpisodes[selectedEpisode[selected]].video
    }
    const video = videos.find((v) => v.id === id)
    if (video) {
      navigate(`/play/${encodeURIComponent(video.filename)}`);
    }
  }, [moviesOrShow, navigate, selected, videos, selectedEpisode, selectedShowEpisodes]);

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
        case 32: // spacebar
        case 406: // blue
          setMouseEnabled(!mouseEnabled) 
          break
        case 13: // enter
          openSelected();
          break;
        case 38: // up arrow
        case 40: // down arrow
          updateSelected(e.keyCode - 39);
          break;
        case 37: // left arrow
        case 39: // right arrow
          updateSelectedEpisode(e.keyCode - 38);
          break;
        case 412: // seek backward
          updateSelectedEpisode(-1);
          break;
        case 417: // seek forward
          updateSelectedEpisode(1);
          break;
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [updateSelected, updateSelectedEpisode, openSelected, mouseEnabled]);

  useEffect(() => {
     listItemsRef.current = listItemsRef.current.slice(0, moviesOrShow.length);
  }, [moviesOrShow]);

  const ep = selectedEpisode[selected];
  return <div style={{height: '100%', overflow: 'hidden'}}>
      {loading && 'Loading...'}
      {loadedVideos && (<div ref={containerRef} style={{
          position: 'relative',
          top: positionY,
        }}>
        <ul>
          {moviesOrShow.map((mOrS, i) => (
            <li key={mOrS.movie?.id + ',' + mOrS.show?.id} style={i === selected ? {color: 'red'} : {}} ref={(el) => listItemsRef.current[i] = el}>
              {mOrS.movie && (<>
                {mOrS.movie.title}
                {mOrS.movie.backdroppath && <img src={`https://image.tmdb.org/t/p/w500${mOrS.movie.backdroppath}`} alt="" />}
              </>)}
              {mOrS.show && (<>
                {i === selected && selectedShowEpisodes.length > 0 && selectedShowEpisodes[ep] && (<>
                  {mOrS.show.name}{' '}
                  {selectedShowEpisodes[ep].season}x
                  {selectedShowEpisodes[ep].episode}{' '}
                  {selectedShowEpisodes[ep].name}
                  {selectedShowEpisodes[ep].stillpath && <img src={`https://image.tmdb.org/t/p/w500${selectedShowEpisodes[ep].stillpath}`} alt="" />}
                </>)}
                {(i !== selected || selectedShowEpisodes.length === 0) && (<>
                  {mOrS.show.name}
                  <img src={`https://image.tmdb.org/t/p/w500${mOrS.show.backdroppath}`} alt="" />
                </>)}
              </>)}
            </li>
          ))}
        </ul>
      </div>)}
  </div>
}

export default VideoList;
