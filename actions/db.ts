import { Pool } from 'pg';

let pool: Pool | null = null;

export const connectToDatabase = (connectionString: string) => {
  pool = new Pool({
    connectionString,
  });
  return pool;
};

export const getPool = () => {
  if (!pool) throw new Error('Database not connected');
  return pool;
};

export const disconnectDatabase = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
