import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? '';

const sql = postgres(connectionString);

export default sql;
