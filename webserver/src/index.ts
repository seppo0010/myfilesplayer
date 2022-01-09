import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

import express, { Request, Response } from 'express';
import * as dotenv from 'dotenv';
import OS from 'opensubtitles.com';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';

import { query } from './db'

dotenv.config()

const app = express();
app.use(bodyParser.json())
const port = process.env.PORT || 3000;
const videosPath = process.env.VIDEOS_PATH || process.argv[2];
const os = new OS({apikey: process.env.OS_API_KEY || fs.readFileSync('/var/run/secrets/osdb_api_key', 'utf-8').trim()});
os.login({
  username: process.env.OS_USERNAME || fs.readFileSync('/var/run/secrets/osdb_login', 'utf-8').trim(),
  password: process.env.OS_PASSWORD || fs.readFileSync('/var/run/secrets/osdb_password', 'utf-8').trim(),
});

const getVideoId = async (videoName: string): Promise<number> => {
  const text = `INSERT INTO videos (filename) VALUES ($1) ON CONFLICT (filename) DO UPDATE SET filename = EXCLUDED.filename RETURNING id;`;
  const res = await query(text, [videoName]);
  return res.rows[0].id;
}

app.get('/api/progress/:videoId', async (req: Request, res: Response) => {
  const userId = 1; // single user for now
  const q = await query(`SELECT progress FROM user_progress
    WHERE user_id = $1 AND video_id = $2
  `, [
    userId,
    await getVideoId(req.params.videoId),
  ])
  res.json({progress: q.rows.length > 0 ? q.rows[0].progress : 0.0});
});

app.post('/api/progress', async (req: Request, res: Response) => {
  const userId = 1; // single user for now
  const videoId = await getVideoId(req.body.video);
  await query(`INSERT INTO user_progress
    (user_id, video_id, progress)
    VALUES
    ($1, $2, $3)
    ON CONFLICT (user_id, video_id) DO UPDATE SET progress = EXCLUDED.progress
  `, [
    userId,
    videoId,
    parseFloat(req.body.progress),
  ]);
  await query(`DELETE FROM watch_history
              WHERE user_id = $1 AND video_id = $2 AND date > NOW() - INTERVAL '2' HOUR
  `, [
    userId,
    videoId,
  ]);
  await query(`INSERT INTO watch_history (user_id, video_id, date) VALUES ($1, $2, NOW())
  `, [
    userId,
    videoId,
  ]);
  res.json({});
});

app.get('/api/videos.json', async (req: Request, res: Response) => {
  const [episodes, movies, shows, videos, watchHistory]  = await Promise.all([
    query(`SELECT * FROM episode WHERE hidden = 0 ORDER BY episode.season ASC, episode.episode ASC`, []),
    query(`SELECT * FROM movie WHERE hidden = 0`, []),
    query(`SELECT * FROM show WHERE hidden = 0`, []),
    query(`SELECT * FROM videos`, []),
    query(`
          SELECT video_id as videoId, show.id AS showId, movie.id AS movieId
          FROM watch_history
          LEFT JOIN episode ON episode.video = watch_history.video_id
          LEFT JOIN show ON episode.show = show.id
          LEFT JOIN movie ON movie.video = watch_history.video_id
          ORDER BY date DESC`, []),
  ]);
  res.type('application/json');
  res.json({
    episodes: episodes.rows,
    movies: movies.rows,
    shows: shows.rows,
    videos: videos.rows,
    watchHistory: watchHistory.rows,
  });
});

app.use('/videos', express.static(videosPath));
app.get('/api/subtitles/:video', async (req: Request, res: Response) => {
  const queryData = await query(`
    SELECT moviehash, name, episode, season FROM videos
    LEFT JOIN episode ON videos.id = episode.video
    WHERE videos.filename = $1`,
    [req.params.video]
  );
  const data = await os.subtitles({
    moviehash: queryData.rows[0].moviehash,
    query: queryData.rows[0].name,
    season_number: queryData.rows[0].season,
    episode_number: queryData.rows[0].episode,
  })
  res.json(data);
});
app.get('/api/subtitle/:file_id', async (req: Request, res: Response) => {
  const data = await os.download({
    file_id: req.params.file_id,
  });
  const response = await fetch(data.link);
  res.setHeader('content-type', 'text/plain');
  res.send(await response.text());
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
})

export {};
