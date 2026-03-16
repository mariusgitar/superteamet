import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error(
    'Missing database connection URL. Set either DATABASE_URL (preferred) or POSTGRES_URL.'
  );
}

const sql = postgres(databaseUrl, { ssl: 'require' });

export default sql;
