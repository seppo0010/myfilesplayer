import * as fs from 'fs';

import { Pool } from 'pg';

const getFileContents = (path: string): string => {
  try {
    return fs.readFileSync(path, 'utf-8').trim()
  } catch (e) {
    return '';
  }
}


const pool = new Pool({
  host: process.env.POSTGRES_HOST || getFileContents('/run/secrets/postgres-hostname') || 'localhost',
  user: process.env.POSTGRES_USER || getFileContents('/run/secrets/postgres-username'),
  database: process.env.POSTGRES_DB || getFileContents('/run/secrets/postgres-database'),
  password: process.env.POSTGRES_PASSWORD || getFileContents('/run/secrets/postgres-password'),
  port: parseInt(process.env.POSTGRES_PORT || getFileContents('/run/secrets/postgres-port') || '5432', 10),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const query = (text: string, params: any[]) => pool.query(text, params);

export { query };
