import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function createLeaderboardTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        twitch_id VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        profile_image TEXT NOT NULL,
        high_score INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_twitch_id ON leaderboard(twitch_id);
    `);
  } finally {
    client.release();
  }
}

export async function updateHighScore(twitchId: string, username: string, profileImage: string, score: number) {
  const client = await pool.connect();
  try {
    // Check if user exists and get their current high score
    const existingUser = await client.query(
      'SELECT high_score FROM leaderboard WHERE twitch_id = $1',
      [twitchId]
    );

    if (existingUser.rows.length > 0) {
      // User exists, update only if new score is higher
      const currentHighScore = existingUser.rows[0].high_score;
      if (score > currentHighScore) {
        await client.query(
          `UPDATE leaderboard 
           SET high_score = $1, username = $2, profile_image = $3, updated_at = CURRENT_TIMESTAMP
           WHERE twitch_id = $4`,
          [score, username, profileImage, twitchId]
        );
      }
    } else {
      // User doesn't exist, insert new record
      await client.query(
        `INSERT INTO leaderboard (twitch_id, username, profile_image, high_score)
         VALUES ($1, $2, $3, $4)`,
        [twitchId, username, profileImage, score]
      );
    }
  } finally {
    client.release();
  }
}

export async function getLeaderboard(limit: number = 10) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT username, profile_image, high_score
      FROM leaderboard
      ORDER BY high_score DESC
      LIMIT $1;
    `, [limit]);
    return result.rows;
  } finally {
    client.release();
  }
} 