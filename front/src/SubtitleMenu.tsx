import React, { useState, useEffect, useCallback } from 'react';

interface Subtitle {
  id: string
  attributes: {
    language: string
    files: {
      file_id: string
      file_name: string
    }[]
  }
}

function SubtitleMenu({ video, onSelected }: { video: string, onSelected: (subs: string) => any }) {
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [subtitlesLoaded, setSubtitlesLoaded] = useState(false);

  // FIXME: copy paste, extract list logic to a component
  useEffect(() => {
    if (!subtitles.length) return
    let lastSelected = selected;
    const mousemove = (e: MouseEvent) => {
        if (!subtitles.length || e.movementY === 0) return;
        lastSelected = Math.min(
          Math.max(
            0,
            lastSelected + (e.movementY > 0 ? 1 : -1)
          ),
          subtitles.length - 1
        );
        setSelected(lastSelected);
    };
    document.addEventListener('mousemove', mousemove);
    return () => document.removeEventListener('mousemove', mousemove)
  }, [subtitles, selected]);

  useEffect(() => {
    (async () => {
      if (loading || subtitlesLoaded) return
      setLoading(true);
      const res = await fetch(`/api/subtitles/${encodeURIComponent(video)}`)
      const subs = await res.json();
      setSubtitlesLoaded(true);
      setLoading(false);
      setSubtitles(subs.data);
    })()
  }, [loading, subtitlesLoaded, video])

  const downloadSubtitle = useCallback(async () => {
    const res = await fetch(`/api/subtitle/${encodeURIComponent(subtitles[selected].attributes.files[0].file_id)}`)
    const subs = await res.text();
    onSelected(subs)
  }, [subtitles, selected, onSelected])

  useEffect(() => {
    const click = () => {
      downloadSubtitle();
    }
    document.body.addEventListener('click', click);
    return () =>  document.body.removeEventListener('click', click);
  }, [downloadSubtitle]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch(e.keyCode) {
        case 13: // enter
          downloadSubtitle();
          break;
        case 38: // up arrow
        case 40: // down arrow
          setSelected(Math.min(
            Math.max(
              0,
              selected + e.keyCode - 39
            ),
            subtitles.length - 1
          ));
          break;
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [selected, subtitles, downloadSubtitle]);

  return (<div style={{
    position: 'fixed',
    top: '40%',
    height: '20%',
    background: 'white',
    zIndex: '1',
    width: '60%',
    left: '20%',
    overflow: 'hidden',
  }}>
    {subtitles.length > 0 && <ul>
      {subtitles.map((s, i) => (<li key={s.id} style={i === selected ? {color: 'red'} : {}}>
        {s.attributes.language}
        {' '}
        {s.attributes.files[0].file_name}
      </li>))}
    </ul>}
    {subtitlesLoaded && subtitles.length === 0 && <p>No subtitles found</p>}
  </div>)
}

export default SubtitleMenu;
