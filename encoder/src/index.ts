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
import pg from 'pg';
const { Pool } = pg;

dotenv.config()

const getFileContents = (path: string): string => {
  try {
    return fs.readFileSync(path, 'utf-8').trim()
  } catch (e) {
    return '';
  }
}
const pool = new Pool({
  host: process.env.PG_HOSTNAME || getFileContents('/var/run/secrets/pg_hostname'),
  user: process.env.PG_USERNAME || getFileContents('/var/run/secrets/pg_username'),
  database: process.env.PG_DATABASE || getFileContents('/var/run/secrets/pg_database'),
  password: process.env.PG_PASSWORD || getFileContents('/var/run/secrets/pg_password'),
  port: parseInt(process.env.PG_PORT || getFileContents('/var/run/secrets/pg_port'), 10),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const query = (text: string, params: any[]) => pool.query(text, params);

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

    const mp4Path = path.join(target, path.basename(f.replace(regex, '.mp4')));
    if (fs.existsSync(mp4Path)) {
      console.log('Skipping mp4', f);
    } else {
      const params = [];
      if (process.env.DURATION) {
        params.push('-t');
        params.push(process.env.DURATION);
      }
      try {
        const sh = execa('ffmpeg', ['-y', '-vsync', '0', '-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda', '-i', f, '-c:a', 'copy', '-c:v', 'h264_nvenc', '-b:v', '5M'].concat(params).concat([mp4Path]));
        sh.stdout?.pipe(process.stdout)
        sh.stderr?.pipe(process.stderr);
        await sh
      } catch (e) {
        continue
      }
    }

    const videoId = path.basename(f.replace(regex, ''));
    const sql = `SELECT episode.id FROM episode INNER JOIN videos ON episode.video = videos.id WHERE videos.filename = $1`;
    const res = await query(sql, [videoId]);
    if (res.rows.length > 0) {
      console.log('Skipping data', f);
    } else {
      let episode;
      const episodeJSON = path.join(target, videoId + '.episode.json')
      if (fs.existsSync(episodeJSON)) {
        episode = JSON.parse(getFileContents(episodeJSON));
      } else {
        episode = episodeParser(path.basename(f));
        fs.writeFileSync(episodeJSON, JSON.stringify(episode));
      }
      let movie;
      const movieJSON = path.join(target, videoId + '.movie.json')
      if (fs.existsSync(movieJSON)) {
        movie = JSON.parse(getFileContents(movieJSON));
      } else {
        movie = tnp(path.basename(f));
        fs.writeFileSync(movieJSON, JSON.stringify(movie));
      }
      const opensubtitles = await OpenSubtitles.hash(f);

      const id = (await query(`
        INSERT INTO videos (filename, moviehash) VALUES ($1, $2) ON CONFLICT (filename) DO UPDATE SET filename = EXCLUDED.filename, moviehash = EXCLUDED.moviehash RETURNING id
      `, [videoId, opensubtitles.moviehash])).rows[0].id;

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
      }
      if (episode && episodeData) {
        const showId = (await query(`
          INSERT INTO show (tmdb_id, name, backdropPath, overview) VALUES ($1, $2, $3, $4) ON CONFLICT (tmdb_id) DO UPDATE SET name = EXCLUDED.name, backdropPath = EXCLUDED.backdropPath, overview = EXCLUDED.overview RETURNING id
        `, [showData.id, showData.name, showData.backdropPath, showData.overview])).rows[0].id;
        await query(`
          INSERT INTO episode (video, show, name, episode, season, stillPath) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (video) DO NOTHING
        `, [id, showId, episode.name, episode.episode, episode.season, episodeData.stillPath]);
      } else if (movie) {
        const tmdbSearch = await tmdb.get('search/movie', {
          query: movie.title,
          year: movie.year ? movie.year : '',
        });
        movieData = tmdbSearch.results[0];
        if (movieData) {
            await query(`
              INSERT INTO movie (video, title, backdropPath) VALUES ($1, $2, $3) ON CONFLICT (video) DO NOTHING
            `, [id, movieData.title, movieData.backdropPath]);
        } else {
            await query(`
              INSERT INTO movie (video, title, backdropPath) VALUES ($1, $2, $3) ON CONFLICT (video) DO NOTHING
            `, [id, movie.title, ""]);
        }
      }
    }
  }
});
export default {};
