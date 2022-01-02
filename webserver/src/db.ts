import { Pool } from 'pg'

const getFileContents = (path: string): string => {
  try {
    return fs.readFileSync('/var/run/secrets/pg_hostname', 'utf-8').trim()
  } catch (e) {
    return '';
  }
}
const pool = new Pool({
  host: process.env.PG_HOSTNAME || getFileContents('/var/run/secrets/pg_hostname', 'utf-8'),
  user: process.env.PG_USERNAME || getFileContents('/var/run/secrets/pg_username', 'utf-8'),
  database: process.env.PG_DATABASE || getFileContents('/var/run/secrets/pg_database', 'utf-8'),
  password: process.env.PG_PASSWORD || getFileContents('/var/run/secrets/pg_password', 'utf-8'),
  port: parseInt(process.env.PG_PORT || getFileContents('/var/run/secrets/pg_port', 'utf-8'), 10),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
}
