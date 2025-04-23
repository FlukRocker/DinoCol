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
  const [jumpTicks, setJumpTicks] = useState(0);
  const [ducking, setDucking] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);

  const highestScore = useRef(0);
  const [lastScore, setLastScore] = useState(0);
   const collidedRef = useRef<Set<number>>(new Set());

  const DINO_LEFT = 48;
  const GAME_WIDTH = 800;

  const jumpSound = useRef<HTMLAudioElement | null>(null);
  const assetCache = useRef<{ [key: string]: HTMLImageElement }>({});

  const handleJump = () => {
    if (!isJumping && !ducking && !gameOver) {
      jumpSound.current?.play();
      setIsJumping(true);
      setJumpTicks(11); // กระโดดไม่สูงเกินไป
    }
  };

  const handleDuck = (isDucking: boolean) => {
    if (!gameOver && !isJumping) {
      setDucking(isDucking);
    }
  };

  const restart = () => {
    setGameOver(false);
    setLastScore(score);
    if (score > highestScore.current) {
      highestScore.current = score;
    }
    setScore(0);
    setLives(1);
    setSpeed(1);
    setObstacles([]);
    setVelocity(0);
    setPositionY(0);
    setIsJumping(false);
    setJumpTicks(0);
    setDucking(false);
    setFrameIndex(0);
    collidedRef.current.clear();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") handleJump();
      if (e.code === "ArrowDown") handleDuck(true);
    };
  
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown") handleDuck(false);
    };
  
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch.clientY < window.innerHeight / 2) {
        handleJump(); // Jump if the touch is in the upper half of the screen
      } else {
        handleDuck(true); // Duck if the touch is in the lower half
      }
    };
  
    const handleTouchEnd = () => {
      handleDuck(false); // Stop ducking when the touch ends
    };
  
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
  
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isJumping, gameOver]);

  useEffect(() => {
    jumpSound.current = new Audio("/jump.mp3");
  }, []);

  useEffect(() => {
    const assets = [
      "/girl_run1.png", "/girl_run2.png", "/girl_run3.png",
      "/girl_duck1.png", "/girl_duck2.png",
      "/cactus.png", "/bird.webp", "/snack.png", "/col.gif"
    ];
    assets.forEach(src => {
      const img = new Image();
      img.src = src;
      assetCache.current[src] = img;
    });
  }, []);

  useEffect(() => {
    if (score > 0 && score % 100 === 0) {
      new Audio("/milestone.mp3").play();
    }
  }, [score]);

  useEffect(() => {
    if (gameOver) new Audio("/gameover.mp3").play();
  }, [gameOver]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex(i => (i + 1) % 3);
    }, 120);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!gameOver) {
        setScore(s => s + 1);
        setSpeed(s => Math.min(6 + Math.floor(score / 100) * 0.5, 10));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [gameOver]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!gameOver) {
        const rand = Math.random();
        const type = rand < 0.7 ? "cactus" : rand < 0.85 ? "bird" : "snack";
        setObstacles(prev => [...prev, {
          id: Date.now(),
          type,
          left: GAME_WIDTH
        }]);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver]);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = 0;

    const gameLoop = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      setVelocity(v => {
        let newVelocity = v;
        if (jumpTicks > 0) {
          newVelocity = -6.5;
          setJumpTicks(t => t - 1);
        } else {
          newVelocity = v + (v < 0 ? 0.2 : 0.8);
        }

        let newY = 0;
        setPositionY(y => {
          newY = y + newVelocity;
          if (newY > 0) {
            setIsJumping(false);
            return 0;
          }
          return newY;
        });

        return newY === 0 ? 0 : newVelocity;
      });

      setObstacles(prev => {
        const next = prev.map(o => ({ ...o, left: o.left - speed }));
        const filtered: Obstacle[] = [];

        const dinoBox = {
          x: DINO_LEFT,
          y: -positionY, // ✅ แก้ตรงนี้ให้ hitbox ตรงภาพ
          width: ducking ? 64 : 48,
          height: ducking ? 40 : 48,
        };

        for (const obs of next) {
          const obsBox = {
            x: obs.left + 5,
            y: obs.type === "bird" ? 40 : 0,
            width: obs.type === "bird" ? 30 : 40,
            height: obs.type === "bird" ? 20 : 40,
          };

          const isCollide =
            dinoBox.x < obsBox.x + obsBox.width &&
            dinoBox.x + dinoBox.width > obsBox.x &&
            dinoBox.y < obsBox.y + obsBox.height &&
            dinoBox.y + dinoBox.height > obsBox.y;

          if (isCollide && !collidedRef.current.has(obs.id)) {
            collidedRef.current.add(obs.id);

            if (obs.type === "snack") {
              new Audio("/eat.mp3").play();
              setScore(s => s + 20);
              continue;
            } else if (obs.type === "cactus" || obs.type === "bird") {
              new Audio("/hit.mp3").play();
              setLives(l => {
                const next = l - 1;
                if (next <= 0) setGameOver(true);
                return next;
              });
              continue;
            }
          }

          if (obs.left > -50) filtered.push(obs);
        }

        return filtered;
      });

      if (!gameOver) animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameOver, ducking, positionY, speed, jumpTicks]);

  const dinoImg = ducking
    ? `/girl_duck${frameIndex + 1}.png`
    : `/girl_run${frameIndex + 1}.png`;

  return (
    <div className="w-full h-screen bg-[#f1f1f1] flex items-center justify-center font-mono">
      <div className="absolute top-10 flex items-center justify-center text-black font-bold text-5xl">
        <span>DinoCol</span>
        <img src={assetCache.current["/col.gif"]?.src} alt="col" className="w-10 h-10 ml-2" />
      </div>

      <div
          className="relative bg-white border border-gray-400 overflow-hidden"
          style={{ width: GAME_WIDTH, height: 200 }}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            if (touch.clientY < window.innerHeight / 2) {
              handleJump(); // Jump if the touch is in the upper half of the screen
            } else {
              handleDuck(true); // Duck if the touch is in the lower half
            }
          }}
          onTouchEnd={() => {
            handleDuck(false); // Stop ducking when the touch ends
          }}
        >
        <div className="absolute top-2 left-4 text-sm font-bold text-gray-800 z-10">คะแนน: {score}</div>
        <div className="absolute top-2 right-4 text-sm font-bold text-red-500 z-10">♥ {lives}</div>

        <img
          src={dinoImg}
          alt="girl"
          className={`absolute left-12 bottom-0 z-10 ${ducking ? "w-16 h-10" : "w-12 h-12"}`}
          style={{ transform: `translateY(${positionY}px)` }}
        />

        {obstacles.map((obs) => {
          const obsBoxY = obs.type === "bird" ? 60 : 0;
          return (
            <React.Fragment key={obs.id}>
              <img
                src={
                  obs.type === "cactus"
                    ? assetCache.current["/cactus.png"]?.src
                    : obs.type === "bird"
                    ? assetCache.current["/bird.webp"]?.src
                    : assetCache.current["/snack.png"]?.src
                }
                alt={obs.type}
                className={`absolute ${obs.type === "bird" ? "w-10 h-10 bottom-[40px]" : "w-10 h-10 bottom-0"}`}
                style={{ left: obs.left }}
              />
            </React.Fragment>
          );
        })}

        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-20">
            <div className="text-center">
              <h1 className="text-xl font-bold text-red-600 mb-4">Game Over</h1>
              <p className="text-lg font-bold text-gray-800 mb-2">
                Last Score: {score}
              </p>
              <p className="text-lg font-bold text-gray-800 mb-4">
                Highest Score: {highestScore.current}
              </p>
              <button
                onClick={restart}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Restart
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-10 text-black font-bold text-center">
          Design and idea by <a href="https://www.twitch.tv/riii_to" target="_blank" className="text-purple-600 hover:text-purple-800">riii_to</a> & Optimize and Hosting with ❤️ by <a href="https://www.twitch.tv/flukrocker" target="_blank" className="text-purple-600 hover:text-purple-800">FlukRocker</a>
          <p>Testing by <a href="https://www.twitch.tv/l3lackmegas" target="_blank" className="text-purple-600 hover:text-purple-800">l3lackmegas</a>, <a href="https://www.twitch.tv/xerenon258" target="_blank" className="text-purple-600 hover:text-purple-800">Xerenon</a> and <a href="https://www.twitch.tv/crosslos_" target="_blank" className="text-purple-600 hover:text-purple-800">Crosslos_</a></p>
        </div>
    </div>
  );
}