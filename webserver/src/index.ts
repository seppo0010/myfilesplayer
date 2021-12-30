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

app.get('/videos.json', async (req, res) => {
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
app.get('/subtitle/:file_id', async (req, res) => {
  const data = await os.download({
    file_id: req.params.file_id,
  });
  const response = await fetch('https://www.opensubtitles.com/download/2E142134EE2AAAC1B52E2AFB17B04669452D4DD86144FC4C0D92EAB5198D32055B50267DB4530855225D56F7BB508A7027BB2790CACA0C61235D379A2B60E83233450529EDC53307669E78D0117DD9FD17D43B81608B5030ADC10A7FE9EE1F0ECB65ADCE23EEE39965F8953E0AD653BBB22672AD3868820371C81F10F7ED1DB46423AEA78E04A29D9163B1C446D34A27493A96195F2562E17CB43CE8FCECFAFEBC7FD7638FDFF32394F9B4796BB5B5FD4CD34F88E4317A1426FB9C5215083B0EB60357B092A1BDBADEFA0A69339D3581C65D4BF6F02EFA9B9622F40CF0D5BB22A1F9A886E5B13A31F39CB482B4697CEA4A3BC4484786E6163C51EDD34C0255C32C44B312CAFE8B085435397EE81F37A20DC6E38E67A8721751A938D41E199C1886B7246CF69BE0C7455353E52FF85B42/subfile/The%20West%20Wing%20-%2001x02%20-%20Post%20Hoc,%20Ergo%20Propter%20Hoc.srt');
  res.send(await response.text());
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
})

export {};
