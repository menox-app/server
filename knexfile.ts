import 'dotenv/config';
import type { Knex } from 'knex';

const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  pool: { min: 2, max: 10 },
  migrations: {
    directory: './src/infrastructure/knex/migrations',
    extension: 'ts',
  },
  seeds: {
    directory: './src/infrastructure/knex/seeds',
    extension: 'ts',
  },
};

export default config;
