import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

import express from 'express';
import * as dotenv from 'dotenv';
import OS from 'opensubtitles.com';

dotenv.config()

const app = express();
const port = process.env.PORT || 3000;
const videosPath = process.argv[2];
const os_api_key = process.env.OS_API_KEY;
const os = new OS({apikey: os_api_key});

app.get('/videos.json', async (req, res) => {
  const files = Array.prototype.slice.call(await fs.promises
                                           .readdir(videosPath))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.substr(0, f.length-5));
  files.sort();
  res.type('application/json');
  res.json(files);
})
app.use('/videos', express.static(videosPath));
app.get('/subtitles/:video', async (req, res) => {
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

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
})

export {};
