import * as fs from 'fs';

import { Pool } from 'pg';

const getFileContents = (path: string): string => {
  try {
    return fs.readFileSync('/var/run/secrets/pg_hostname', 'utf-8').trim()
  } catch (e) {
    return '';
  }
}
const pool = new Pool({
  host: process.env.PG_HOSTNAME || getFileContents('/var/run/secrets/pg_hostname'),
  user: process.env.PG_USERNAME || getFileContents('/var/run/secrets/pg_username'),
  database: process.env.PG_DATABASE || getFileContents('/var/run/secrets/pg_database'),
  password: process.env.PG_PASSWORD || getFileContents('/var/run/secrets/pg_password'),
  port: parseInt(process.env.PG_PORT || getFileContents('/var/run/secrets/pg_port'), 10),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const query = (text: string, params: any[]) => pool.query(text, params);

export { query };
