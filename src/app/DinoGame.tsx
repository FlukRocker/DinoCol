"use client";
import React, { useEffect, useRef, useState } from "react";
import Leaderboard from '@/components/Leaderboard';
import { CompactEncrypt, generateSecret, CompactSign } from "jose";

interface Obstacle {
  id: number;
  type: "cactus" | "bird" | "snack" | "bottle";
  left: number;
  height?: number; // For bottles to have different heights
}

interface User {
  name: string;
  profileImage: string;
  twitchId: string;
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
  const [speed, setSpeed] = useState(6);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [volume, setVolume] = useState(0.5);
  const [user, setUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showScoreBonus, setShowScoreBonus] = useState(false);
  const [bonusPosition, setBonusPosition] = useState({ x: 0, y: 0 });
  const [isPaused, setIsPaused] = useState(false);
  const [canJump, setCanJump] = useState(true);

  const highestScore = useRef(0);
  const [lastScore, setLastScore] = useState(0);
  const collidedRef = useRef<Set<number>>(new Set());

  const DINO_LEFT = 48;
  const GAME_WIDTH = 800;
  const GRAVITY = 0.25;
  const INITIAL_JUMP_VELOCITY = -11.5;
  const MAX_JUMP_HEIGHT = 86;
  const TARGET_FPS = 60;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;
  const BASE_SPEED = 6;
  const SPEED_INCREASE_INTERVAL = 100;
  const SPEED_INCREASE_AMOUNT = 0.2;
  const MAX_SPEED = 12;

  const jumpSound = useRef<HTMLAudioElement | null>(null);
  const assetCache = useRef<{ [key: string]: HTMLImageElement }>({});
  const lastFrameTime = useRef(0);

  const handleJump = () => {
    if (!isJumping && !gameOver && canJump) {
      jumpSound.current?.play();
      setIsJumping(true);
      setVelocity(INITIAL_JUMP_VELOCITY);
      setJumpTicks(1);
      setCanJump(false);
    }
  };

  const handleDuck = (isDucking: boolean) => {
    if (!gameOver) {
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
    setSpeed(BASE_SPEED);
    setObstacles([]);
    setVelocity(0);
    setPositionY(0);
    setIsJumping(false);
    setJumpTicks(0);
    setDucking(false);
    setFrameIndex(0);
    collidedRef.current.clear();
  };

  const handleVolumeChange = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    if (jumpSound.current) {
      jumpSound.current.volume = clampedVolume;
    }
  };

  const handleTwitchLogin = () => {
    // Twitch OAuth parameters
    const redirectUri = window.location.origin;
    const scope = 'user:read:email';
    
    // Create OAuth URL
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_TWITCH_CLIENT}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
    
    // Redirect to Twitch login
    window.location.href = authUrl;
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('twitchAccessToken');
    // ลบ hash ออกจาก URL
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  // Check for OAuth callback
  useEffect(() => {
    // ตรวจสอบ token ที่มีอยู่ใน localStorage ก่อน
    const storedToken = localStorage.getItem('twitchAccessToken');
    if (storedToken) {
      fetchUserInfo(storedToken);
      return;
    }

    // ถ้าไม่มี token ใน localStorage ให้ตรวจสอบจาก URL
    const hash = window.location.hash;
    if (hash) {
      const accessToken = hash.split('&')[0].split('=')[1];
      if (accessToken) {
        // เก็บ token ลง localStorage
        localStorage.setItem('twitchAccessToken', accessToken);
        // ลบ hash ออกจาก URL
        window.history.replaceState({}, document.title, window.location.pathname);
        fetchUserInfo(accessToken);
      }
    }
  }, []);

  // แยกฟังก์ชันการดึงข้อมูลผู้ใช้ออกมา
  const fetchUserInfo = async (accessToken: string) => {
    try {
      const response = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': process.env.NEXT_PUBLIC_TWITCH_CLIENT || ''
        }
      });
      const data = await response.json();
      if (data.data && data.data[0]) {
        setUser({
          name: data.data[0].display_name,
          profileImage: data.data[0].profile_image_url,
          twitchId: data.data[0].id
        });
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      // ถ้าเกิดข้อผิดพลาด (เช่น token หมดอายุ) ให้ลบ token และ logout
      localStorage.removeItem('twitchAccessToken');
      setUser(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      
      if ((e.code === "Space" || e.code === "ArrowUp") && !isJumping && !gameOver && canJump) {
        handleJump();
      }
      if (e.code === "ArrowDown" && !gameOver) {
        handleDuck(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown") {
        handleDuck(false);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch.clientY < window.innerHeight / 2 && !isJumping && !gameOver && canJump) {
        handleJump();
      } else if (!gameOver) {
        handleDuck(true);
      }
    };

    const handleTouchEnd = () => {
      handleDuck(false);
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
  }, [isJumping, gameOver, canJump]);

  useEffect(() => {
    jumpSound.current = new Audio("/jump.mp3");
  }, []);

  useEffect(() => {
    const assets = [
      "/girl_run1.png", "/girl_run2.png", "/girl_run3.png",
      "/girl_duck1.png", "/girl_duck2.png",
      "/cactus.png", "/bird.webp", "/snack.png", "/col.gif",
    ];
    assets.forEach(src => {
      const img = new Image();
      img.src = src;
      assetCache.current[src] = img;
    });
  }, []);

  useEffect(() => {
    const playSound = (sound: string) => {
      const audio = new Audio(sound);
      audio.volume = volume;
      audio.play();
    };

    if (score > 0 && score % 100 === 0) {
      playSound("/milestone.mp3");
    }
  }, [score, volume]);

  useEffect(() => {
    if (gameOver) {
      const audio = new Audio("/gameover.mp3");
      audio.volume = volume;
      audio.play();
    }
  }, [gameOver, volume]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex(i => (i + 1) % 3);
    }, 220);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !gameOver) {
        setIsPaused(true);
      } else {
        setIsPaused(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameOver]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!gameOver && !isPaused) {
        setScore(s => s + 1);
        setSpeed(currentSpeed => {
          const speedIncrease = Math.floor(score / SPEED_INCREASE_INTERVAL) * SPEED_INCREASE_AMOUNT;
          const newSpeed = BASE_SPEED + speedIncrease;
          return Math.min(newSpeed, MAX_SPEED);
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, [gameOver, isPaused, score]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!gameOver) {
        const rand = Math.random();
        let obstaclesToAdd: Obstacle[] = [];
        
        // Random chance to spawn multiple cacti
        if (rand < 0.3) { // 30% chance to spawn multiple cacti
          const cactusRand = Math.random();
          let cactusCount = 1;
          
          if (cactusRand < 0.2) { // 20% chance for 3 cacti
            cactusCount = 3;
          } else if (cactusRand < 0.6) { // 40% chance for 2 cacti
            cactusCount = 2;
          } // 40% chance for 1 cactus
          
          for (let i = 0; i < cactusCount; i++) {
            obstaclesToAdd.push({
              id: Date.now() + i,
              type: "cactus",
              left: GAME_WIDTH + (i * 30), // Space cacti 30px apart
            });
          }
        } else {
          // Regular obstacles
          const type = rand < 0.7 ? "cactus" : rand < 0.85 ? "bird" : "snack";
          obstaclesToAdd.push({
            id: Date.now(),
            type,
            left: GAME_WIDTH
          });
        }
        
        setObstacles(prev => [...prev, ...obstaclesToAdd]);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver]);

  const updateGameState = () => {
    const currentTime = performance.now();
    const elapsed = currentTime - lastFrameTime.current;

    if (elapsed < FRAME_INTERVAL || isPaused) {
      return;
    }

    lastFrameTime.current = currentTime - (elapsed % FRAME_INTERVAL);

    setVelocity(v => {
      let newVelocity = v;
      if (isJumping) {
        newVelocity += GRAVITY;
        setJumpTicks(prev => prev + 1);
      }
      return newVelocity;
    });

    setPositionY(y => {
      const newY = y + velocity;
      
      if (newY >= 0) {
        setIsJumping(false);
        setVelocity(0);
        setJumpTicks(0);
        setCanJump(true);
        return 0;
      }
      
      if (newY <= -MAX_JUMP_HEIGHT) {
        setVelocity(GRAVITY);
        return -MAX_JUMP_HEIGHT;
      }
      
      return newY;
    });

    setObstacles(prev => {
      const next = prev.map(o => ({ ...o, left: o.left - speed }));
      const filtered: Obstacle[] = [];

      const dinoBox = {
        x: DINO_LEFT,
        y: -positionY,
        width: ducking ? 64 : 48,
        height: ducking ? 40 : 48,
      };

      for (const obs of next) {
        const obsBox = {
          x: obs.left + 5,
          y: obs.type === "bird" ? 40 : obs.type === "bottle" ? 0 : 0,
          width: obs.type === "bird" ? 30 : obs.type === "bottle" ? 20 : 25,
          height: obs.type === "bird" ? 20 : obs.type === "bottle" ? (obs.height || 40) : 35,
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
            // Show bonus score animation
            setBonusPosition({ x: obs.left, y: obsBox.y });
            setShowScoreBonus(true);
            setTimeout(() => setShowScoreBonus(false), 1000);
            continue;
          } else if (obs.type === "cactus" || obs.type === "bird" || obs.type === "bottle") {
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
  };

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = 0;

    const gameLoop = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      if (!gameOver && !isPaused) {
        updateGameState();
      }

      if (!gameOver) animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameOver, isPaused, ducking, positionY, speed, isJumping]);

  useEffect(() => {
    fetchLeaderboard();
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

  useEffect(() => {
    if (gameOver && user) {
      const encryptData = async () => {
        try {
          if (!process.env.NEXT_PUBLIC_JWE_SECRET) {
            console.error('NEXT_PUBLIC_JWE_SECRET is not set');
            return;
          }

          // Create a 256-bit (32 bytes) key using the first 32 bytes of the secret
          const secretBuffer = new TextEncoder().encode(process.env.NEXT_PUBLIC_JWE_SECRET);
          const key = secretBuffer.slice(0, 32);

          const payload = {
            twitchId: user.twitchId,
            username: user.name,
            profileImage: user.profileImage,
            score: score
          };


          const jwe = await new CompactEncrypt(
            new TextEncoder().encode(JSON.stringify(payload))
          )
            .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
            .encrypt(key);


          // Send encrypted data to API
          const response = await fetch('/api/leaderboard', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: jwe }),
          });

          const data = await response.json();

          if (!response.ok) {
            console.error('API Error:', data);
            throw new Error(data.error || 'Failed to update leaderboard');
          }

          console.log('Leaderboard updated successfully');
          // Fetch updated leaderboard
          fetchLeaderboard();
        } catch (error) {
          console.error('Failed to update leaderboard:', error);
        }
      };

      encryptData();
    }
  }, [gameOver, score, user]);

  const dinoImg = ducking
    ? `/girl_duck${frameIndex + 1}.png`
    : `/girl_run${frameIndex + 1}.png`;

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <div className="w-full h-screen bg-[#f1f1f1] flex flex-col items-center justify-center font-mono">
      <div className="absolute top-10 flex items-center justify-center text-black font-bold text-5xl">
        <span>DinoCol</span>
        <img src={assetCache.current["/col.gif"]?.src} alt="col" className="w-10 h-10 ml-2" />
      </div>
      <div className="fixed top-4 right-4 z-50">
        {user ? (
          <div className="flex items-center gap-2">
            <img src={user.profileImage} alt={user.name} className="w-8 h-8 rounded-full" />
            <span>{user.name}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-2 py-1 rounded text-sm"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={handleTwitchLogin}
            className="bg-purple-600 text-white px-4 py-2 rounded"
          >
            Login with Twitch
          </button>
        )}
      </div>

      <div className="relative w-full max-w-[800px] px-4">
        <div className="relative">
          <div className="absolute top-4 left-4">
            <div className="text-2xl font-bold flex items-center gap-2">
              Score: {formatNumber(score)}
              {showScoreBonus && (
                <span className="text-green-500 animate-bounce">+20</span>
              )}
            </div>
            <div className="text-lg">Lives: {lives}</div>
          </div>

          <div
            className="w-full h-[200px] bg-white relative overflow-hidden border-b-2 border-gray-400"
            style={{ touchAction: "none" }}
          >
            <div className="absolute top-2 left-4 text-sm font-bold text-gray-800 z-10 flex items-center gap-2">
              คะแนน: {formatNumber(score)}
              {showScoreBonus && (
                <span className="text-green-500 animate-bounce">+20</span>
              )}
            </div>
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

            {isPaused && !gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
                <div className="text-white text-2xl font-bold">
                  Game Paused
                </div>
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-20">
                <div className="text-center">
                  <h1 className="text-xl font-bold text-red-600 mb-4">Game Over</h1>
                  <p className="text-lg font-bold text-gray-800 mb-2">
                    Last Score: {formatNumber(score)}
                  </p>
                  <p className="text-lg font-bold text-gray-800 mb-4">
                    Highest Score: {formatNumber(highestScore.current)}
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

          {/* Desktop Leaderboard */}
          <div className="absolute top-0 -right-80 xl:block hidden">
            <Leaderboard data={leaderboard} />
          </div>

          {/* Tablet Leaderboard */}
          <div className="xl:hidden md:block hidden absolute top-0 -right-60">
            <Leaderboard data={leaderboard} />
          </div>

          {/* Mobile Leaderboard */}
          <div className="md:hidden block mt-4 w-full max-w-[300px] mx-auto">
            <Leaderboard data={leaderboard} />
          </div>
        </div>

        <div className="absolute -bottom-32 left-1/2 transform -translate-x-1/2 flex items-center gap-2 text-black">
          <button
            onClick={() => handleVolumeChange(volume - 0.1)}
            className="bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center"
            title="Decrease Volume"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5L6 9H2v6h4l5 4V5zM15 12h4"
              />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-12 text-center">
              {Math.round(volume * 100)}%
            </div>
          </div>
          <button
            onClick={() => handleVolumeChange(volume + 0.1)}
            className="bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center"
            title="Increase Volume"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5L6 9H2v6h4l5 4V5zM15 12h4m-2-2v4"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="fixed bottom-4 text-black font-bold text-center">
        <div>
          Design and idea by <a href="https://www.twitch.tv/riii_to" target="_blank" className="text-purple-600 hover:text-purple-800">riii_to</a> & Optimize and Hosting with ❤️ by <a href="https://www.twitch.tv/flukrocker" target="_blank" className="text-purple-600 hover:text-purple-800">FlukRocker</a>
        </div>
        <div>
          Develop by <a href="https://www.twitch.tv/xerenon258" target="_blank" className="text-purple-600 hover:text-purple-800">XeReNoN</a>, <a href="https://www.twitch.tv/xerenon258" target="_blank" className="text-purple-600 hover:text-purple-800">Xerenon</a> and <a href="https://www.twitch.tv/xerenon258" target="_blank" className="text-purple-600 hover:text-purple-800">XeReNoN</a>
        </div>
        <div>
          Testing by <a href="https://www.twitch.tv/l3lackmegas" target="_blank" className="text-purple-600 hover:text-purple-800">l3lackmegas</a>, <a href="https://www.twitch.tv/xerenon258" target="_blank" className="text-purple-600 hover:text-purple-800">Xerenon</a> and <a href="https://www.twitch.tv/crosslos_" target="_blank" className="text-purple-600 hover:text-purple-800">Crosslos_</a>
        </div>
      </div>
    </div>
  );
}