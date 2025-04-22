"use client";
import React, { useEffect, useRef, useState } from "react";

interface Obstacle {
  id: number;
  type: "cactus" | "bird" | "snack";
  left: number;
}

export default function DinoGame() {
  const [positionY, setPositionY] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [ducking, setDucking] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);

  const gravity = 0.6;
  const jumpStrength = -100;

  const dinoRef = useRef<HTMLImageElement>(null);
  const jumpSound = useRef<HTMLAudioElement | null>(null);

  const GAME_WIDTH = 800;
  const GAME_HEIGHT = 200;

  const handleJump = () => {
    if (!isJumping && !ducking && !gameOver) {
      jumpSound.current?.play();
      setVelocity(jumpStrength);
      setIsJumping(true);
    }
  };

  const handleDuck = (isDucking: boolean) => {
    if (!gameOver && !isJumping) {
      setDucking(isDucking);
    }
  };

  const restart = () => {
    setGameOver(false);
    setScore(0);
    setLives(1);
    setSpeed(1);
    setObstacles([]);
    setVelocity(0);
    setPositionY(0);
    setIsJumping(false);
    setDucking(false);
    setFrameIndex(0);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % 3);
    }, 120);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") handleJump();
      if (e.code === "ArrowDown") handleDuck(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown") handleDuck(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isJumping, gameOver]);

  //Load assets
  const assetCache = useRef<{ [key: string]: HTMLImageElement }>({});

  useEffect(() => {
    // Preload images and store them in the cache
    const imageAssets = [
      "/girl_run1.png",
      "/girl_run2.png",
      "/girl_run3.png",
      "/girl_duck1.png",
      "/girl_duck2.png",
      "/cactus.png",
      "/bird.webp",
      "/heart.png",
      "/snack.png",
      "/col.gif"
    ];

    imageAssets.forEach((src) => {
      const img = new Image();
      img.src = src;
      assetCache.current[src] = img; // Cache the preloaded image
    });

    // Preload audio
    const audioAssets = ["/jump.mp3", "/milestone.mp3"];
    audioAssets.forEach((src) => {
      const audio = new Audio(src);
      audio.load();
    });
  }, []);

  useEffect(() => {
    jumpSound.current = new Audio("/jump.mp3");
  }, []);

  useEffect(() => {
    if (score > 0 && score % 100 === 0) {
      const milestoneSound = new Audio("/milestone.mp3");
      milestoneSound.play();
    }
  }, [score]);

  useEffect(() => {
    if (gameOver) {
      const gameOverSound = new Audio("/gameover.mp3");
      gameOverSound.play();
    }
  }, [gameOver]);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = 0;
  
    const gameLoop = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;
  
      // Update dino's position (jumping logic)
      setVelocity((v) => {
        const newVelocity = v + gravity;
        let newY = 0;
        setPositionY((y) => {
          newY = y + newVelocity;
          if (newY > 0) {
            setIsJumping(false);
            return 0;
          }
          return newY;
        });
        return newY === 0 ? 0 : newVelocity;
      });
  
      // Move obstacles
      setObstacles((prev) =>
        prev
          .map((o) => ({ ...o, left: o.left - speed }))
          .filter((o) => o.left > -50)
      );
  
      // Collision detection
      const dinoBox = {
        x: 100,
        y: GAME_HEIGHT - (ducking ? 40 : 48) + positionY,
        width: ducking ? 64 : 48,
        height: ducking ? 24 : 48,
      };
  
      obstacles.forEach((obs) => {
        const obsBox = {
          x: obs.left,
          y: obs.type === "bird" ? 100 : 160,
          width: 40,
          height: 40,
        };
  
        const isCollide =
          dinoBox.x < obsBox.x + obsBox.width &&
          dinoBox.x + dinoBox.width > obsBox.x &&
          dinoBox.y < obsBox.y + obsBox.height &&
          dinoBox.y + dinoBox.height > obsBox.y;
  
        if (isCollide) {
          if (obs.type === "snack") {
            const eatSound = new Audio("/eat.mp3"); // Replace with your sound file path
            eatSound.play();
            setScore((s) => s + 20);
            setObstacles((prev) => prev.filter((o) => o.id !== obs.id));
          } else if (!(ducking && obs.type === "bird")) {
            setLives((l) => {
              const next = l - 1;
              if (next <= 0) setGameOver(true);
              return next;
            });
            setObstacles((prev) => prev.filter((o) => o.id !== obs.id));
          }
        }
      });
  
      // Update score and speed
  
      if (!gameOver) {
        animationFrameId = requestAnimationFrame(gameLoop);
      }
    };
  
    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameOver, ducking, positionY, obstacles]);

  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setScore((s) => s + 1);
      setSpeed((s) => Math.min(6 + Math.floor(score / 100) * 0.5, 10)); // Increment speed slower and cap at 10
    }, 100);
    return () => clearInterval(interval);
  }, [gameOver]);

  useEffect(() => {
    if (gameOver) return;
    const spawn = setInterval(() => {
      const rand = Math.random();
      let type: Obstacle["type"];
      if (rand < 0.7) {
        type = "cactus"; // 70% chance to spawn a cactus
      } else if (rand < 0.85) {
        type = "bird"; // 15% chance to spawn a bird
      } else {
        type = "snack"; // 5% chance to spawn a snack
      }
  
      const newObs: Obstacle = {
        id: Date.now(),
        type,
        left: GAME_WIDTH,
      };
      setObstacles((prev) => [...prev, newObs]);
    }, 1000); // Reduced interval from 1800ms to 1200ms for higher density
    return () => clearInterval(spawn);
  }, [gameOver]);

  const isColliding = (
    box1: { x: number; y: number; width: number; height: number },
    box2: { x: number; y: number; width: number; height: number }
  ): boolean => {
    return (
      box1.x < box2.x + box2.width &&
      box1.x + box1.width > box2.x &&
      box1.y < box2.y + box2.height &&
      box1.y + box1.height > box2.y
    );
  };

  // ✅ ปรับ collision detection ให้แม่นยำ
  useEffect(() => {
    if (gameOver) return;
    const move = setInterval(() => {
      setObstacles((prev) =>
        prev
          .map((o) => ({ ...o, left: o.left - speed }))
          .filter((o) => o.left > -50)
      );
  
      const dinoBox = {
        x: 100,
        y: GAME_HEIGHT - (ducking ? 40 : 48) + positionY,
        width: ducking ? 50 : 40, // Adjust width for ducking and running
        height: ducking ? 20 : 40, // Adjust height for ducking and running
      };
  
      obstacles.forEach((obs) => {
        const obsBox = {
          x: obs.left + 5, // Add padding to better align with the visual object
          y: obs.type === "bird" ? 100 : 160, // Adjust Y position for birds and ground obstacles
          width: obs.type === "bird" ? 30 : 40, // Adjust width for birds and other obstacles
          height: obs.type === "bird" ? 20 : 40, // Adjust height for birds and other obstacles
        };
  
        if (isColliding(dinoBox, obsBox)) {
          if (obs.type === "snack") {
            const eatSound = new Audio("/eat.mp3"); // Replace with your sound file path
            eatSound.play();
            setScore((s) => s + 20);
            setObstacles((prev) => prev.filter((o) => o.id !== obs.id));
          } else if (!(ducking && obs.type === "bird")) {
            setLives((l) => {
              const next = l - 1;
              if (next <= 0) setGameOver(true);
              return next;
            });
            setObstacles((prev) => prev.filter((o) => o.id !== obs.id));
          }
        }
      });
    }, 50);
    return () => clearInterval(move);
  }, [obstacles, speed, gameOver, ducking, positionY]);

  const dinoImg = ducking
    ? `/girl_duck${frameIndex + 1}.png`
    : `/girl_run${frameIndex + 1}.png`;

  return (
    <div className="w-full h-screen bg-[#f1f1f1] flex items-center justify-center font-mono">
      <div className="absolute top-10 flex items-center justify-center text-black font-bold text-5xl">
        <span>DinoCol</span>
        <img
          src={assetCache.current["/col.gif"]?.src}
          alt="col"
          className="w-10 h-10 ml-2" // Adjust size and spacing as needed
        />
      </div>
      <div
        className="relative bg-white border border-gray-400 overflow-hidden"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
      >
        {/* คะแนน & ชีวิต */}
        <div className="absolute top-2 left-4 text-sm font-bold text-gray-800 z-10">
          คะแนน: {score}
        </div>
        <div className="absolute top-2 right-4 text-sm font-bold text-red-500 z-10">
          ♥ {lives}
        </div>

        {/* ตัวละคร */}
        <img
          ref={dinoRef}
          src={dinoImg}
          alt="girl"
          className={`absolute left-12 bottom-0 z-10 ${ducking ? "w-16 h-10" : "w-12 h-12"}`}
          style={{ transform: `translateY(${positionY}px)` }}
        />

        {/* Obstacle ทั้งหลาย */}
        {obstacles.map((obs) => (
          <img
            key={obs.id}
            src={
              obs.type === "cactus"
                ? assetCache.current["/cactus.png"]?.src
                : obs.type === "bird"
                ? assetCache.current["/bird.webp"]?.src
                : obs.type === "snack"
                ? assetCache.current["/snack.png"]?.src
                : "" // Fallback value if none of the conditions are met
            }
            alt={obs.type}
            className={`absolute ${
              obs.type === "bird" ? "w-10 h-10 bottom-[100px]" : "w-10 h-10 bottom-0"
            }`}
            style={{ left: obs.left }}
          />
        ))}

        {/* Game Over */}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-20">
            <div className="text-center">
              <h1 className="text-xl font-bold text-red-600 mb-4">Game Over</h1>
              <button
                onClick={restart}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                เล่นใหม่
              </button>
            </div>
          </div>
        )}
      </div>
        <div className="absolute bottom-10 text-black font-bold text-center">
          Design and idea by riii_to & Optimize and Hosting with ❤️ by FlukRocker
        </div>
    </div>
  );
}
