import knex from 'knex';
import * as dotenv from 'dotenv';
dotenv.config();

async function dumpSchema() {
  const db = knex({
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
  });

  try {
    console.log('--- USER_AVATARS TABLE COLUMNS ---');
    const columns = await db('user_avatars').columnInfo();
    console.log(JSON.stringify(columns, null, 2));
  } catch (err: any) {
    console.error('Error dumping schema:', err.message);
  } finally {
    await db.destroy();
  }
}

dumpSchema();
