import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Play, Star, X, Heart, Trophy, Zap, Shield, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/games/packet-race")({
  head: () => ({ meta: [{ title: "Packet Race · Leafva Academy" }] }),
  component: PacketRace,
  validateSearch: (search: Record<string, unknown>) => ({
    childId: search.childId as string | undefined,
  }),
});

type Packet = {
  x: number;
  y: number;
  speed: number;
  hasShield: boolean;
  hasTurbo: boolean;
};

type Router = {
  id: string;
  x: number;
  y: number;
  type: "fast" | "slow" | "broken" | "busy" | "magic";
  pathIndex: number;
};

type PowerUp = {
  id: string;
  x: number;
  y: number;
  type: "turbo" | "shield" | "bandwidth";
};

type Obstacle = {
  id: string;
  x: number;
  y: number;
  type: "congestion" | "virus" | "broken";
};

const WORLDS = [
  { name: "Home Network", color: "#3B82F6", description: "Learn about computers and Wi-Fi" },
  { name: "Neighborhood", color: "#10B981", description: "Discover network nodes and switches" },
  { name: "City Internet", color: "#F59E0B", description: "Navigate traffic and congestion" },
  { name: "Cloud Highway", color: "#8B5CF6", description: "Speed through fiber optics" },
  { name: "Global Internet", color: "#EC4899", description: "Connect across oceans" },
  { name: "Cyber Fortress", color: "#EF4444", description: "Master all networking skills" },
];

function PacketRace() {
  const { childId } = useSearch({ from: "/_authenticated/games/packet-race" });
  const [world, setWorld] = useState(0);
  const [level, setLevel] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [packet, setPacket] = useState<Packet>({ x: 50, y: 300, speed: 2, hasShield: false, hasTurbo: false });
  const [routers, setRouters] = useState<Router[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [showTutorial, setShowTutorial] = useState(true);
  const [bestStars, setBestStars] = useState<Record<number, number>>({});
  const [totalStars, setTotalStars] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ name: string; score: number; child_id: string }[]>([]);
  const [distance, setDistance] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const gameRef = useRef<HTMLDivElement>(null);

  const currentWorld = WORLDS[world];
  const targetDistance = 1000 + (world * 200) + (level * 100);

  // Load progress on mount
  useEffect(() => {
    loadProgress();
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    const { data: scores } = await (supabase as any)
      .from("game_progress")
      .select("child_id, game_slug, level, stars, children(display_name)")
      .eq("game_slug", "packet-race")
      .order("stars", { ascending: false })
      .limit(10);

    if (scores) {
      const leaderboardData = scores.map((s: any) => ({
        name: s.children?.display_name || "Anonymous",
        score: s.stars,
        child_id: s.child_id,
      }));
      setLeaderboard(leaderboardData);
    }
  }

  async function loadProgress() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !childId) return;

    const { data: progress } = await (supabase as any)
      .from("game_progress")
      .select("level, stars")
      .eq("user_id", user.id)
      .eq("child_id", childId)
      .eq("game_slug", "packet-race");

    if (progress) {
      const bestStarsMap: Record<number, number> = {};
      let total = 0;
      progress.forEach((p: any) => {
        bestStarsMap[p.level] = Math.max(bestStarsMap[p.level] || 0, p.stars);
        total += p.stars;
      });
      setBestStars(bestStarsMap);
      setTotalStars(total);
    }
  }

  async function saveProgress(levelNum: number, starsEarned: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !childId) return;

    await (supabase as any)
      .from("game_progress")
      .upsert({
        user_id: user.id,
        child_id: childId,
        game_slug: "packet-race",
        level: levelNum,
        stars: starsEarned,
        completed_at: new Date().toISOString(),
      }, { onConflict: "user_id,child_id,game_slug,level" });

    setBestStars(prev => ({ ...prev, [levelNum]: Math.max(prev[levelNum] || 0, starsEarned) }));
    setTotalStars(prev => prev + (starsEarned - (bestStars[levelNum] || 0)));
    loadLeaderboard();
  }

  function generateLevel() {
    const newRouters: Router[] = [];
    const newPowerUps: PowerUp[] = [];
    const newObstacles: Obstacle[] = [];

    // Generate routers at intersections
    for (let i = 0; i < 5 + world + level; i++) {
      const types: Router["type"][] = ["fast", "slow", "broken", "busy", "magic"];
      newRouters.push({
        id: `router-${i}`,
        x: 150 + i * 150,
        y: 200 + Math.random() * 200,
        type: types[Math.floor(Math.random() * types.length)],
        pathIndex: i,
      });
    }

    // Generate power-ups
    for (let i = 0; i < 3; i++) {
      const types: PowerUp["type"][] = ["turbo", "shield", "bandwidth"];
      newPowerUps.push({
        id: `powerup-${i}`,
        x: 200 + i * 200,
        y: 150 + Math.random() * 300,
        type: types[Math.floor(Math.random() * types.length)],
      });
    }

    // Generate obstacles
    for (let i = 0; i < 2 + world; i++) {
      const types: Obstacle["type"][] = ["congestion", "virus", "broken"];
      newObstacles.push({
        id: `obstacle-${i}`,
        x: 250 + i * 180,
        y: 180 + Math.random() * 240,
        type: types[Math.floor(Math.random() * types.length)],
      });
    }

    setRouters(newRouters);
    setPowerUps(newPowerUps);
    setObstacles(newObstacles);
  }

  function startGame() {
    setIsPlaying(true);
    setIsPaused(false);
    setScore(0);
    setLives(3);
    setDistance(0);
    setPacket({ x: 50, y: 300, speed: 2, hasShield: false, hasTurbo: false });
    setGameOver(false);
    generateLevel();
  }

  function pauseGame() {
    setIsPaused(true);
  }

  function resumeGame() {
    setIsPaused(false);
  }

  function selectRouter(router: Router) {
    if (!isPlaying || isPaused) return;

    // Apply router effects
    let newSpeed = packet.speed;
    let newShield = packet.hasShield;

    switch (router.type) {
      case "fast":
        newSpeed = packet.speed * 1.5;
        setScore(prev => prev + 10);
        break;
      case "slow":
        newSpeed = packet.speed * 0.5;
        break;
      case "broken":
        if (!packet.hasShield) {
          setLives(prev => Math.max(0, prev - 1));
        }
        break;
      case "busy":
        newSpeed = packet.speed * 0.7;
        break;
      case "magic":
        newSpeed = packet.speed * 2;
        setScore(prev => prev + 20);
        break;
    }

    setPacket(prev => ({
      ...prev,
      x: router.x,
      y: router.y,
      speed: newSpeed,
      hasShield: newShield,
    }));

    // Remove used router
    setRouters(prev => prev.filter(r => r.id !== router.id));
  }

  function collectPowerUp(powerUp: PowerUp) {
    switch (powerUp.type) {
      case "turbo":
        setPacket(prev => ({ ...prev, hasTurbo: true, speed: prev.speed * 2 }));
        setTimeout(() => setPacket(prev => ({ ...prev, hasTurbo: false, speed: prev.speed / 2 })), 5000);
        break;
      case "shield":
        setPacket(prev => ({ ...prev, hasShield: true }));
        break;
      case "bandwidth":
        setScore(prev => prev + 30);
        break;
    }
    setPowerUps(prev => prev.filter(p => p.id !== powerUp.id));
  }

  function hitObstacle(obstacle: Obstacle) {
    if (!packet.hasShield) {
      setLives(prev => Math.max(0, prev - 1));
    }
    setObstacles(prev => prev.filter(o => o.id !== obstacle.id));
  }

  // Game loop
  useEffect(() => {
    if (!isPlaying || isPaused) return;

    const interval = setInterval(() => {
      setPacket(prev => {
        const newX = prev.x + prev.speed;
        const newDistance = distance + prev.speed;

        // Check collisions with power-ups
        powerUps.forEach(p => {
          if (Math.abs(newX - p.x) < 30 && Math.abs(prev.y - p.y) < 30) {
            collectPowerUp(p);
          }
        });

        // Check collisions with obstacles
        obstacles.forEach(o => {
          if (Math.abs(newX - o.x) < 30 && Math.abs(prev.y - o.y) < 30) {
            hitObstacle(o);
          }
        });

        // Check if reached target
        if (newDistance >= targetDistance) {
          const stars = score >= 100 ? 3 : score >= 50 ? 2 : score >= 20 ? 1 : 0;
          if (stars > 0) {
            saveProgress(world * 10 + level, stars);
          }
          setIsPlaying(false);
          setGameOver(true);
        }

        setDistance(newDistance);
        return { ...prev, x: newX };
      });
    }, 16);

    return () => clearInterval(interval);
  }, [isPlaying, isPaused, packet.speed, powerUps, obstacles, distance, targetDistance, score]);

  // Check for game over
  useEffect(() => {
    if (lives <= 0 && isPlaying) {
      setIsPlaying(false);
      setGameOver(true);
    }
  }, [lives, isPlaying]);

  return (
    <div className="min-h-dvh bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg mx-4">
            <h2 className="text-3xl font-bold mb-4 text-center">📦 Welcome to Packet Race!</h2>
            <div className="space-y-4 text-gray-700">
              <p>You're a data packet racing through the Internet!</p>
              <div className="space-y-2">
                <p><strong>🟢 Fast Router:</strong> Speed boost!</p>
                <p><strong>🔴 Slow Router:</strong> Slows you down</p>
                <p><strong>⚡ Magic Router:</strong> Teleport speed!</p>
                <p><strong>🛡️ Shield:</strong> Protects from obstacles</p>
                <p><strong>🚀 Turbo:</strong> Double speed for 5 seconds</p>
              </div>
              <p>Reach the destination before time runs out!</p>
            </div>
            <button
              onClick={() => setShowTutorial(false)}
              className="w-full mt-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition"
            >
              Let's Race!
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameOver && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              {lives <= 0 ? "💔 Packet Lost!" : "🎉 Delivery Complete!"}
            </h2>
            <div className="text-6xl mb-4">
              {score >= 100 ? "⭐⭐⭐" : score >= 50 ? "⭐⭐" : score >= 20 ? "⭐" : "😢"}
            </div>
            <p className="text-xl mb-2">Score: {score}</p>
            <p className="text-gray-600 mb-6">Distance: {Math.floor(distance)}m</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setLives(3); startGame(); }}
                className="flex-1 py-3 rounded-xl font-bold text-white transition hover:scale-105"
                style={{ background: currentWorld.color }}
              >
                Try Again
              </button>
              <button
                onClick={() => { setLives(3); setGameOver(false); }}
                className="flex-1 py-3 rounded-xl font-bold border-2 border-gray-300 transition hover:bg-gray-50"
              >
                Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-4xl px-6 h-16 flex items-center justify-between">
          <Link to="/child/$childId" params={{ childId: childId || "" }} className="flex items-center gap-2 text-white hover:opacity-80 transition">
            <ArrowLeft className="h-5 w-5" />
            Back
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowLeaderboard(true)}
              className="flex items-center gap-2 text-white hover:opacity-80 transition"
            >
              <Trophy className="h-5 w-5 text-yellow-400" />
              <span className="font-bold">Leaderboard</span>
            </button>
            <div className="flex items-center gap-2 text-white">
              <Star className="h-5 w-5 text-yellow-400" />
              <span className="font-bold">{totalStars}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {!isPlaying && !gameOver && (
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">📦 Packet Race</h1>
            <p className="text-purple-200 mb-6">Race through the Internet as a data packet!</p>

            {/* World Selector */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-4">Select World</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {WORLDS.map((w, i) => (
                  <button
                    key={i}
                    onClick={() => setWorld(i)}
                    className={`p-4 rounded-xl transition ${
                      world === i ? "ring-4 ring-white" : "hover:scale-105"
                    }`}
                    style={{ background: w.color }}
                  >
                    <div className="text-2xl mb-2">{world === i ? "🚀" : "🌐"}</div>
                    <div className="text-white font-bold text-sm">{w.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={startGame}
              className="px-8 py-4 rounded-xl font-bold text-white text-xl transition hover:scale-105 flex items-center gap-3 mx-auto"
              style={{ background: currentWorld.color }}
            >
              <Play className="h-6 w-6" /> Start Race
            </button>
          </div>
        )}

        {isPlaying && (
          <>
            {/* Stats Bar */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-white">
                  <div className="text-2xl font-bold">{score}</div>
                  <div className="text-xs text-purple-200">Score</div>
                </div>
                <div className="text-white">
                  <div className="text-2xl font-bold">{Math.floor(distance)}m</div>
                  <div className="text-xs text-purple-200">Distance</div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((i) => (
                    <Heart
                      key={i}
                      className={`h-5 w-5 ${i <= lives ? "text-red-500 fill-red-500" : "text-gray-500"}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {packet.hasTurbo && <Zap className="h-5 w-5 text-yellow-400" />}
                {packet.hasShield && <Shield className="h-5 w-5 text-blue-400" />}
                <button
                  onClick={isPaused ? resumeGame : pauseGame}
                  className="px-4 py-2 rounded-lg bg-white/20 text-white font-bold hover:bg-white/30 transition"
                >
                  {isPaused ? "Resume" : "Pause"}
                </button>
              </div>
            </div>

            {/* Game Area */}
            <div
              ref={gameRef}
              className="relative rounded-2xl overflow-hidden"
              style={{ height: "500px", background: "linear-gradient(180deg, #1a1a2e 0%, #0f3460 100%)", border: `3px solid ${currentWorld.color}` }}
            >
              {/* Progress Bar */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gray-700">
                <div
                  className="h-full transition-all"
                  style={{ width: `${(distance / targetDistance) * 100}%`, background: currentWorld.color }}
                />
              </div>

              {/* Packet */}
              <div
                className="absolute w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all"
                style={{
                  left: packet.x,
                  top: packet.y,
                  transform: "translate(-50%, -50%)",
                  background: packet.hasTurbo ? "#F59E0B" : packet.hasShield ? "#3B82F6" : "#8B5CF6",
                  boxShadow: `0 0 20px ${packet.hasTurbo ? "#F59E0B" : packet.hasShield ? "#3B82F6" : "#8B5CF6"}`,
                  zIndex: 10,
                }}
              >
                📦
              </div>

              {/* Routers */}
              {routers.map((router) => (
                <div
                  key={router.id}
                  onClick={() => selectRouter(router)}
                  className="absolute w-16 h-16 rounded-full flex items-center justify-center text-2xl cursor-pointer hover:scale-110 transition"
                  style={{
                    left: router.x,
                    top: router.y,
                    transform: "translate(-50%, -50%)",
                    background:
                      router.type === "fast" ? "#10B981" :
                      router.type === "slow" ? "#F59E0B" :
                      router.type === "broken" ? "#EF4444" :
                      router.type === "busy" ? "#6B7280" :
                      "#8B5CF6",
                    boxShadow: `0 0 15px ${
                      router.type === "fast" ? "#10B981" :
                      router.type === "slow" ? "#F59E0B" :
                      router.type === "broken" ? "#EF4444" :
                      router.type === "busy" ? "#6B7280" :
                      "#8B5CF6"
                    }`,
                  }}
                >
                  {router.type === "fast" ? "🟢" :
                   router.type === "slow" ? "🟡" :
                   router.type === "broken" ? "❌" :
                   router.type === "busy" ? "🔴" :
                   "⚡"}
                </div>
              ))}

              {/* Power-ups */}
              {powerUps.map((powerUp) => (
                <div
                  key={powerUp.id}
                  onClick={() => collectPowerUp(powerUp)}
                  className="absolute w-10 h-10 rounded-full flex items-center justify-center text-xl cursor-pointer hover:scale-110 transition"
                  style={{
                    left: powerUp.x,
                    top: powerUp.y,
                    transform: "translate(-50%, -50%)",
                    background:
                      powerUp.type === "turbo" ? "#F59E0B" :
                      powerUp.type === "shield" ? "#3B82F6" :
                      "#8B5CF6",
                    boxShadow: `0 0 15px ${
                      powerUp.type === "turbo" ? "#F59E0B" :
                      powerUp.type === "shield" ? "#3B82F6" :
                      "#8B5CF6"
                    }`,
                  }}
                >
                  {powerUp.type === "turbo" ? "🚀" : powerUp.type === "shield" ? "🛡️" : "💎"}
                </div>
              ))}

              {/* Obstacles */}
              {obstacles.map((obstacle) => (
                <div
                  key={obstacle.id}
                  className="absolute w-12 h-12 rounded flex items-center justify-center text-xl"
                  style={{
                    left: obstacle.x,
                    top: obstacle.y,
                    transform: "translate(-50%, -50%)",
                    background:
                      obstacle.type === "congestion" ? "#6B7280" :
                      obstacle.type === "virus" ? "#EF4444" :
                      "#F59E0B",
                    opacity: 0.8,
                  }}
                >
                  {obstacle.type === "congestion" ? "🚧" : obstacle.type === "virus" ? "🦠" : "⚠️"}
                </div>
              ))}

              {/* Paused Overlay */}
              {isPaused && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur">
                  <div className="text-center">
                    <div className="text-6xl mb-4">⏸️</div>
                    <h2 className="text-3xl font-bold text-white mb-4">Paused</h2>
                    <button
                      onClick={resumeGame}
                      className="px-8 py-3 rounded-xl font-bold text-white transition hover:scale-105"
                      style={{ background: currentWorld.color }}
                    >
                      Resume
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">🏆 Leaderboard</h2>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              {leaderboard.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No scores yet. Be the first!</p>
              ) : (
                leaderboard.map((entry, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      index === 0 ? "bg-yellow-50 border-2 border-yellow-400" :
                      index === 1 ? "bg-gray-50 border-2 border-gray-300" :
                      index === 2 ? "bg-orange-50 border-2 border-orange-300" :
                      "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                      </span>
                      <span className="font-semibold text-gray-800">{entry.name}</span>
                    </div>
                    <span className="font-bold text-purple-600">{entry.score} ⭐</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
