#!/usr/bin/env ts-node
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

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
(async function () {
  find.file(regex, source, (files) => {
    files.forEach(async (f) => {
      console.log('Processing', f);
      const episode = episodeParser(path.basename(f));
      const opensubtitles = await OpenSubtitles.hash(f);
      child_process.spawnSync(
        'ffmpeg',
        [
          '-i',
          f,
          '-crf',
          '0',
          path.join(
            target,
            path.basename(f.replace(regex, '.webm')),
          ),
        ],
        { stdio: 'pipe' },
      )
      fs.writeFileSync(
          path.join(
            target,
            path.basename(f.replace(regex, '.json')),
          ),
          JSON.stringify({ opensubtitles, episode }),
      );
    })
  });
})();
export {};
