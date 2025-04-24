import { compactDecrypt } from "jose";
import { NextResponse } from 'next/server';
import { getLeaderboard, updateHighScore, pool } from '@/lib/db';

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT username, profile_image, high_score
      FROM leaderboard
      ORDER BY high_score DESC
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
    
    if (!token) {
      console.error('No token provided');
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_JWE_SECRET) {
      console.error('NEXT_PUBLIC_JWE_SECRET is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create a 256-bit key using the first 32 bytes of the secret
    const secretBuffer = new TextEncoder().encode(process.env.NEXT_PUBLIC_JWE_SECRET);
    const key = secretBuffer.slice(0, 32);
    
    try {
      const { plaintext } = await compactDecrypt(token, key);
      const payload = JSON.parse(new TextDecoder().decode(plaintext));
      console.log('Decrypted payload:', payload);

      const { twitchId, username, profileImage, score } = payload;

      if (!twitchId || !username || !profileImage || typeof score !== 'number') {
        console.error('Invalid payload data:', payload);
        return NextResponse.json(
          { error: 'Invalid payload data' },
          { status: 400 }
        );
      }

      // Update the leaderboard
      await updateHighScore(twitchId, username, profileImage, score);
      console.log('Score updated successfully');

      // Get and return updated leaderboard
      const updatedLeaderboard = await getLeaderboard();
      return NextResponse.json(updatedLeaderboard);
    } catch (decryptError) {
      console.error('Failed to decrypt token:', decryptError);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Failed to update leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to update leaderboard' },
      { status: 500 }
    );
  }
}