import { Pool, PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export class Database {
  private pool: Pool;
  private isInitialized = false;

  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'visibilita360',
    });

    this.pool.on('error', (err) => {
      console.error('Pool error:', err);
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');

      const client = await this.pool.connect();
      try {
        await client.query(schema);
        console.log('Database schema initialized successfully');
      } finally {
        client.release();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  async query<T>(text: string, params?: unknown[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows as T[];
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query<{ now: string }>('SELECT NOW()');
      return result.length > 0;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}
