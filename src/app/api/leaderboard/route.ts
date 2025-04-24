import { CompactDecrypt } from "jose";
import { NextResponse } from 'next/server';
import { getLeaderboard, updateHighScore, pool } from '@/lib/db';

export async function GET() {
  const client = await pool.connect();
  try {
    // Ensure table exists first
    await client.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        twitch_id VARCHAR(255) NOT NULL UNIQUE,
        username VARCHAR(255) NOT NULL,
        profile_image VARCHAR(255) NOT NULL,
        high_score INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const result = await client.query(`
      SELECT username, profile_image, high_score
      FROM leaderboard
      ORDER BY high_score DESC
      LIMIT 10
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    // Use the same shared secret for decryption
    const secret = new TextEncoder().encode(process.env.JWE_SECRET);

    // Decrypt the JWE token
    const { plaintext } = await new CompactDecrypt(new TextEncoder().encode(token)).decrypt(secret);
    const payload = JSON.parse(new TextDecoder().decode(plaintext));

    const { twitchId, username, profileImage, score } = payload;

    // Update the leaderboard
    await updateHighScore(twitchId, username, profileImage, score);

    // Return the updated leaderboard
    const updatedLeaderboard = await getLeaderboard(5);
    return NextResponse.json(updatedLeaderboard);
  } catch (error) {
    console.error("Failed to update score:", error);
    return NextResponse.json({ error: "Failed to update score" }, { status: 500 });
  }
}