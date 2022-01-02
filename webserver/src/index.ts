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
  await query(`INSERT INTO user_progress
    (user_id, video_id, progress)
    VALUES
    ($1, $2, $3)
    ON CONFLICT (user_id, video_id) DO UPDATE SET progress = EXCLUDED.progress
  `, [
    userId,
    await getVideoId(req.body.video),
    parseFloat(req.body.progress),
  ])
  res.json({});
});

app.get('/api/videos.json', async (req: Request, res: Response) => {
  const files = Array.prototype.slice.call(await Promise.all(
    Array.prototype.slice.call(await fs.promises
                                           .readdir(videosPath))
    .filter((f) => f.endsWith('.json'))
    .map((f) => fs.promises.readFile(path.join(videosPath, f)))
  )).map((f) => JSON.parse(f));
  files.sort();
  res.type('application/json');
  res.json(files);
})
app.use('/videos', express.static(videosPath));
app.get('/api/subtitles/:video', async (req: Request, res: Response) => {
  const fileData = JSON.parse(await fs.promises.readFile(path.join(
    videosPath,
    `${req.params.video}.json`
  ), 'utf-8'));
  const data = await os.subtitles({
    moviehash: fileData.opensubtitles.moviehash,
    query: fileData.episode.show,
    season_number: fileData.episode.season,
    episode_number: fileData.episode.episode,
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
