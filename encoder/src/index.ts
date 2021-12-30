#!/usr/bin/env ts-node
import find from 'find';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const regex = /\.(avi|mp4|mkv)$/;
const source = process.argv[2];
const target = process.argv[3];
find.file(regex, source, (files) => {
  files.forEach((f) => {
    child_process.spawnSync(
      'ffmpeg',
      [
        '-i',
        f,
        path.join(
          target,
          path.basename(f.replace(regex, '.webm')),
        ),
      ],
      { stdio: 'pipe' },
    )
    console.log(f, targetPath)
  })
});
export {};
