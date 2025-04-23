import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  const client = await pool.connect();
  try {
    // Check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'leaderboard'
      );
    `);

    if (!tableExists.rows[0].exists) {
      // Create table if it doesn't exist
      await client.query(`
        CREATE TABLE leaderboard (
          id SERIAL PRIMARY KEY,
          twitch_id VARCHAR(255) NOT NULL UNIQUE,
          username VARCHAR(255) NOT NULL,
          profile_image VARCHAR(255) NOT NULL,
          high_score INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      return NextResponse.json({ message: 'Database initialized successfully' });
    }

    return NextResponse.json({ message: 'Database already exists' });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 