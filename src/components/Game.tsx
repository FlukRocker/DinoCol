'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Leaderboard from '@/components/Leaderboard';

interface LeaderboardEntry {
  username: string;
  profile_image: string;
  high_score: number;
}

interface GameProps {
  onGameOver?: (score: number) => void;
}

const defaultOnGameOver = (score: number) => {};

const Game = ({ onGameOver = defaultOnGameOver }: GameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const gameLoopRef = useRef<number | undefined>(undefined);
  const dinoRef = useRef({
    x: 50,
    y: 150,
    width: 50,
    height: 50, 
    jumping: false,
    jumpForce: 0,
  });
  const obstaclesRef = useRef<Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>>([]);
  const speedRef = useRef(5);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update dino position
    if (dinoRef.current.jumping) {
      dinoRef.current.y -= dinoRef.current.jumpForce;
      dinoRef.current.jumpForce -= 1;

      if (dinoRef.current.y >= 150) {
        dinoRef.current.y = 150;
        dinoRef.current.jumping = false;
        dinoRef.current.jumpForce = 0;
      }
    }

    // Update obstacles
    obstaclesRef.current = obstaclesRef.current.map(obstacle => ({
      ...obstacle,
      x: obstacle.x - speedRef.current,
    }));

    // Remove obstacles that are off screen
    obstaclesRef.current = obstaclesRef.current.filter(
      obstacle => obstacle.x + obstacle.width > 0
    );

    // Add new obstacles
    if (obstaclesRef.current.length === 0 || 
        obstaclesRef.current[obstaclesRef.current.length - 1].x < 200) {
      obstaclesRef.current.push({
        x: 400,
        y: 150,
        width: 20,
        height: 40,
      });
    }

    // Check collisions
    const dino = dinoRef.current;
    for (const obstacle of obstaclesRef.current) {
      if (
        dino.x < obstacle.x + obstacle.width &&
        dino.x + dino.width > obstacle.x &&
        dino.y < obstacle.y + obstacle.height &&
        dino.y + dino.height > obstacle.y
      ) {
        setIsGameOver(true);
        handleGameOver();
        return;
      }
    }

    // Draw dino
    ctx.fillStyle = '#333';
    ctx.fillRect(dino.x, dino.y, dino.width, dino.height);

    // Draw obstacles
    ctx.fillStyle = '#666';
    obstaclesRef.current.forEach(obstacle => {
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });

    // Update score
    scoreRef.current += 1;
    if (scoreRef.current % 5 === 0) { // Update displayed score every 5 frames
      setScore(scoreRef.current);
    }
    speedRef.current = 5 + Math.floor(scoreRef.current / 100);

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !dinoRef.current.jumping) {
        dinoRef.current.jumping = true;
        dinoRef.current.jumpForce = 15;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameLoop]);

  useEffect(() => {
    const initGame = async () => {
      try {
        // Initialize database first
        await fetch('/api/init-db', { method: 'GET' });
        // Then fetch leaderboard
        await fetchLeaderboard();
      } catch (error) {
        console.error('Failed to initialize game:', error);
      }
    };

    initGame();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  const handleGameOver = () => {
    if (onGameOver) {
      onGameOver(score);
    }
  };

  if (isGameOver) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
        <p className="text-xl mb-4">Score: {score}</p>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={() => {
            setScore(0);
            scoreRef.current = 0;
            setIsGameOver(false);
            obstaclesRef.current = [];
            speedRef.current = 5;
          }}
        >
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="border border-gray-300"
      />
      <div className="absolute top-0 -right-80">
        <Leaderboard data={leaderboard} />
      </div>
    </div>
  );
};

export default Game; 