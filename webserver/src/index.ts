import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

import express from 'express';
import * as dotenv from 'dotenv';
import OS from 'opensubtitles.com';
import fetch from 'node-fetch';

dotenv.config()

const app = express();
const port = process.env.PORT || 3000;
const videosPath = process.argv[2];
const os = new OS({apikey: process.env.OS_API_KEY});
os.login({
  username: process.env.OS_USERNAME,
  password: process.env.OS_PASSWORD,
});

app.get('/api/videos.json', async (req, res) => {
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
app.get('/api/subtitles/:video', async (req, res) => {
  const fileData = JSON.parse(await fs.promises.readFile(path.join(
    videosPath,
    `${req.params.video}.json`
  ), 'utf-8'));
  const data = await os.subtitles({
    query: fileData.episode.show,
    season_number: fileData.episode.season,
    episode_number: fileData.episode.episode,
  })
  res.json(data);
});
app.get('/api/subtitle/:file_id', async (req, res) => {
  const data = await os.download({
    file_id: req.params.file_id,
  });
  const response = await fetch(data.link);
  res.send(await response.text());
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
})

export {};
