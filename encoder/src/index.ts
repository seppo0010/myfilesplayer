#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';

import { execa } from 'execa';
import find from 'find';
import OS from 'opensubtitles-api';
import * as dotenv from 'dotenv';
import episodeParser from 'episode-parser';
import tnp from 'torrent-name-parser';
import { Tmdb } from 'tmdb';

dotenv.config()

const regex = /\.(avi|mp4|mkv)$/;
const source = process.argv[2];
const target = process.argv[3];
const OpenSubtitles = new OS({
    useragent: 'myfilesplayer',
    username:  process.env.OSDB_LOGIN,
    password:  process.env.OSDB_PASSWORD,
    ssl: true,
});
const tmdbApiKey = process.env.TMDB_API_KEY || fs.readFileSync('/var/run/secrets/tmdb_api_key', 'utf-8').trim();
const tmdb = new Tmdb(tmdbApiKey);

find.file(regex, source, async (files: string[]) => {
  for (let f of files) {
    console.log('Processing', f);

    /*
    const mp4Path = path.join(target, path.basename(f.replace(regex, '.mp4')));
    if (fs.existsSync(mp4Path)) {
      console.log('Skipping mp4', f);
    } else {
      const params = [];
      if (process.env.DURATION) {
        params.push('-t');
        params.push(process.env.DURATION);
      }
      const sh = execa('ffmpeg', ['-y', '-vsync', '0', '-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda', '-i', f, '-c:a', 'copy', '-c:v', 'h264_nvenc', '-b:v', '5M'].concat(params).concat([mp4Path]));
      sh.stdout?.pipe(process.stdout)
      sh.stderr?.pipe(process.stderr);
      await sh
    }

    const thumbnailPath = path.join(target, path.basename(f.replace(regex, '.jpg')));
    if (fs.existsSync(thumbnailPath)) {
      console.log('Skipping thumbnail', f);
    } else {
      await execa('ffmpeg', ['-ss', '200', '-i', f, '-vframes', '1', '-q:v', '2', '-s', '400x200', thumbnailPath]);
    }
    */

    const jsonPath = path.join(target, path.basename(f.replace(regex, '.json')));
    if (fs.existsSync(jsonPath)) {
      console.log('Skipping json', f);
    } else {
      const episode = episodeParser(path.basename(f));
      const movie = tnp(path.basename(f));
      let showData;
      let episodeData;
      let movieData;
      if (episode) {
        try {
          const tmdbSearch = await tmdb.get('search/tv', {
            query: episode.show,
          });
          showData = tmdbSearch.results[0];
          episodeData = await tmdb.get(
              `tv/${encodeURIComponent(showData.id)}/season/${encodeURIComponent(episode.season)}/episode/${encodeURIComponent(episode.episode || '')}`, {
          });
        } catch (e) {}
      } else {
          const tmdbSearch = await tmdb.get('search/movie', {
            query: movie.title,
            year: movie.year,
          });
          movieData = tmdbSearch.results[0];
      }
      const opensubtitles = await OpenSubtitles.hash(f);
      const basename = path.basename(f);
      fs.writeFileSync(jsonPath, JSON.stringify({
        filename: basename.substr(0, basename.length - 4),
        opensubtitles,
        episode,
        showData,
        episodeData,
        movie,
        movieData,
      }));
    }
  }
});
export default {};
