#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';

import { execa } from 'execa';
import find from 'find';
import OS from 'opensubtitles-api';
import * as dotenv from 'dotenv';
import episodeParser from 'episode-parser';

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

find.file(regex, source, async (files: string[]) => {
  for (let f of files) {
    console.log('Processing', f);

    const webmPath = path.join(target, path.basename(f.replace(regex, '.webm')));
    if (fs.existsSync(webmPath)) {
      console.log('Skipping webm', f);
    } else {
      const params = [];
      if (process.env.DURATION) {
        params.push('-t');
        params.push(process.env.DURATION);
      }
      const sh = execa('ffmpeg', ['-i', f].concat(params).concat(['-crf', '0', webmPath]));
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

    const jsonPath = path.join(target, path.basename(f.replace(regex, '.json')));
    if (fs.existsSync(jsonPath)) {
      console.log('Skipping json', f);
    } else {
      const episode = episodeParser(path.basename(f));
      const opensubtitles = await OpenSubtitles.hash(f);
      const basename = path.basename(f);
      fs.writeFileSync(jsonPath, JSON.stringify({
        filename: basename.substr(0, basename.length - 4),
        opensubtitles,
        episode,
      }));
    }
  }
});
export default {};
