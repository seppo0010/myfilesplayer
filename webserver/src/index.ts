import * as fs from 'fs';

import express from 'express';

const app = express();
const port = process.env.PORT || 3000;
const videosPath = process.argv[2];

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

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
})

export {};
