import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Play, Star, X, Heart, Trophy, Zap, Shield, RotateCcw, Sparkles, Gift } from "lucide-react";
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
  hasMagnet: boolean;
  trail: { x: number; y: number }[];
};

type Collectible = {
  id: string;
  x: number;
  y: number;
  type: "coin" | "gem" | "star" | "turbo" | "shield" | "magnet" | "key";
  collected: boolean;
};

type Obstacle = {
  id: string;
  x: number;
  y: number;
  type: "rock" | "spike" | "cloud" | "virus";
  width: number;
  height: number;
};

const WORLDS = [
  { 
    name: "Home WiFi", 
    color: "#3B82F6", 
    bgFrom: "#1e3a8a", 
    bgTo: "#1e40af",
    description: "Help the packet reach your home computer!",
    emoji: "🏠",
    targetDistance: 500,
  },
  { 
    name: "Neighborhood", 
    color: "#10B981", 
    bgFrom: "#064e3b", 
    bgTo: "#065f46",
    description: "Race through the neighborhood network!",
    emoji: "🏘️",
    targetDistance: 750,
  },
  { 
    name: "City Internet", 
    color: "#F59E0B", 
    bgFrom: "#78350f", 
    bgTo: "#92400e",
    description: "Zoom through the busy city streets!",
    emoji: "🏙️",
    targetDistance: 1000,
  },
  { 
    name: "Cloud Highway", 
    color: "#8B5CF6", 
    bgFrom: "#5b21b6", 
    bgTo: "#6d28d9",
    description: "Speed through the magical cloud highway!",
    emoji: "☁️",
    targetDistance: 1250,
  },
  { 
    name: "Ocean Cables", 
    color: "#06B6D4", 
    bgFrom: "#164e63", 
    bgTo: "#155e75",
    description: "Dive deep into the underwater cables!",
    emoji: "🌊",
    targetDistance: 1500,
  },
  { 
    name: "Space Network", 
    color: "#EC4899", 
    bgFrom: "#831843", 
    bgTo: "#9d174d",
    description: "Bounce through satellites in space!",
    emoji: "🚀",
    targetDistance: 2000,
  },
];

const SKINS = [
  { id: "default", name: "Classic Packet", emoji: "📦", color: "#8B5CF6" },
  { id: "rainbow", name: "Rainbow", emoji: "🌈", color: "#F59E0B" },
  { id: "fire", name: "Fire", emoji: "🔥", color: "#EF4444" },
  { id: "ice", name: "Ice", emoji: "❄️", color: "#3B82F6" },
  { id: "star", name: "Star", emoji: "⭐", color: "#FCD34D" },
  { id: "robot", name: "Robot", emoji: "🤖", color: "#10B981" },
];

function PacketRace() {
  const { childId } = useSearch({ from: "/_authenticated/games/packet-race" });
  const [world, setWorld] = useState(0);
  const [level, setLevel] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [lives, setLives] = useState(3);
  const [packet, setPacket] = useState<Packet>({ 
    x: 50, 
    y: 300, 
    speed: 3, 
    hasShield: false, 
    hasTurbo: false, 
    hasMagnet: false,
    trail: [] 
  });
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [showTutorial, setShowTutorial] = useState(true);
  const [selectedSkin, setSelectedSkin] = useState(SKINS[0]);
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(["default"]);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [distance, setDistance] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ name: string; score: number; child_id: string }[]>([]);
  const [totalStars, setTotalStars] = useState(0);

  const gameRef = useRef<HTMLDivElement>(null);
  const keysPressed = useRef<Set<string>>(new Set());

  const currentWorld = WORLDS[world];
  const targetDistance = currentWorld.targetDistance + (level * 100);

  // Load progress on mount
  useEffect(() => {
    loadProgress();
    loadLeaderboard();
    const savedSkins = localStorage.getItem("unlockedSkins");
    if (savedSkins) setUnlockedSkins(JSON.parse(savedSkins));
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
      let total = 0;
      progress.forEach((p: any) => total += p.stars);
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

    setTotalStars(prev => prev + starsEarned);
    loadLeaderboard();
  }

  function generateLevel() {
    const newCollectibles: Collectible[] = [];
    const newObstacles: Obstacle[] = [];

    // Generate collectibles
    for (let i = 0; i < 30 + world * 5; i++) {
      const types: Collectible["type"][] = ["coin", "coin", "coin", "gem", "star", "turbo", "shield", "magnet", "key"];
      newCollectibles.push({
        id: `collectible-${i}`,
        x: 100 + Math.random() * (targetDistance - 200),
        y: 80 + Math.random() * 340,
        type: types[Math.floor(Math.random() * types.length)],
        collected: false,
      });
    }

    // Generate obstacles
    for (let i = 0; i < 10 + world * 3; i++) {
      const types: Obstacle["type"][] = ["rock", "spike", "cloud", "virus"];
      const type = types[Math.floor(Math.random() * types.length)];
      newObstacles.push({
        id: `obstacle-${i}`,
        x: 150 + i * (targetDistance / (10 + world * 3)),
        y: 100 + Math.random() * 300,
        type,
        width: type === "cloud" ? 120 : 60,
        height: type === "cloud" ? 60 : 60,
      });
    }

    setCollectibles(newCollectibles);
    setObstacles(newObstacles);
  }

  function startGame() {
    setIsPlaying(true);
    setIsPaused(false);
    setScore(0);
    setCoins(0);
    setLives(3);
    setCombo(0);
    setMaxCombo(0);
    setDistance(0);
    setPacket({ 
      x: 50, 
      y: 300, 
      speed: 3, 
      hasShield: false, 
      hasTurbo: false, 
      hasMagnet: false,
      trail: [] 
    });
    setGameOver(false);
    setVictory(false);
    generateLevel();
  }

  function pauseGame() {
    setIsPaused(true);
  }

  function resumeGame() {
    setIsPaused(false);
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key);
      if (e.key === " " || e.key === "Escape") {
        if (isPlaying) {
          setIsPaused(prev => !prev);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isPlaying]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || isPaused) return;

    const interval = setInterval(() => {
      setPacket(prev => {
        let newX = prev.x;
        let newY = prev.y;
        let newSpeed = prev.speed;

        // Movement
        if (keysPressed.current.has("ArrowUp") || keysPressed.current.has("w")) newY -= 5;
        if (keysPressed.current.has("ArrowDown") || keysPressed.current.has("s")) newY += 5;
        if (keysPressed.current.has("ArrowLeft") || keysPressed.current.has("a")) newX -= 3;
        if (keysPressed.current.has("ArrowRight") || keysPressed.current.has("d")) newX += 3;

        // Auto-forward movement
        newX += newSpeed;

        // Boundaries
        newY = Math.max(50, Math.min(450, newY));
        newX = Math.max(0, newX);

        // Trail effect
        const newTrail = [...prev.trail, { x: newX, y: newY }].slice(-10);

        // Check collectibles
        collectibles.forEach(c => {
          if (!c.collected) {
            const dist = Math.sqrt(Math.pow(newX - c.x, 2) + Math.pow(newY - c.y, 2));
            const magnetRange = prev.hasMagnet ? 100 : 30;
            
            if (dist < magnetRange) {
              // Magnet effect
              if (prev.hasMagnet && dist > 30) {
                setCollectibles(prevC => prevC.map(col => 
                  col.id === c.id ? { ...col, x: col.x + (newX - col.x) * 0.1, y: col.y + (newY - col.y) * 0.1 } : col
                ));
              } else {
                c.collected = true;
                setCollectibles(prevC => prevC.map(col => col.id === c.id ? { ...col, collected: true } : col));
                
                switch (c.type) {
                  case "coin":
                    setCoins(prev => prev + 1);
                    setScore(prev => prev + 10);
                    break;
                  case "gem":
                    setCoins(prev => prev + 5);
                    setScore(prev => prev + 50);
                    break;
                  case "star":
                    setScore(prev => prev + 100);
                    setCombo(prev => prev + 1);
                    setShowCombo(true);
                    setTimeout(() => setShowCombo(false), 1000);
                    break;
                  case "turbo":
                    newSpeed = 6;
                    setTimeout(() => setPacket(p => ({ ...p, speed: 3 })), 5000);
                    break;
                  case "shield":
                    setPacket(p => ({ ...p, hasShield: true }));
                    setTimeout(() => setPacket(p => ({ ...p, hasShield: false })), 8000);
                    break;
                  case "magnet":
                    setPacket(p => ({ ...p, hasMagnet: true }));
                    setTimeout(() => setPacket(p => ({ ...p, hasMagnet: false })), 6000);
                    break;
                  case "key":
                    setScore(prev => prev + 200);
                    break;
                }
              }
            }
          }
        });

        // Check obstacles
        obstacles.forEach(o => {
          if (
            newX > o.x - 30 && 
            newX < o.x + o.width + 30 && 
            newY > o.y - 30 && 
            newY < o.y + o.height + 30
          ) {
            if (!prev.hasShield) {
              setLives(prev => Math.max(0, prev - 1));
              setCombo(0);
            }
            // Push back
            newX = Math.max(0, o.x - 50);
          }
        });

        // Update distance
        const newDistance = distance + newSpeed;
        setDistance(newDistance);

        // Check victory
        if (newDistance >= targetDistance) {
          const stars = score >= 500 ? 3 : score >= 300 ? 2 : score >= 100 ? 1 : 0;
          if (stars > 0) {
            saveProgress(world * 10 + level, stars);
          }
          setIsPlaying(false);
          setVictory(true);
          setGameOver(true);
          
          // Unlock skins based on achievements
          if (score >= 300 && !unlockedSkins.includes("rainbow")) {
            setUnlockedSkins(prev => [...prev, "rainbow"]);
            localStorage.setItem("unlockedSkins", JSON.stringify([...unlockedSkins, "rainbow"]));
          }
          if (maxCombo >= 5 && !unlockedSkins.includes("star")) {
            setUnlockedSkins(prev => [...prev, "star"]);
            localStorage.setItem("unlockedSkins", JSON.stringify([...unlockedSkins, "star"]));
          }
        }

        return { ...prev, x: newX, y: newY, speed: newSpeed, trail: newTrail };
      });

      // Update max combo
      setMaxCombo(prev => Math.max(prev, combo));
    }, 16);

    return () => clearInterval(interval);
  }, [isPlaying, isPaused, collectibles, obstacles, distance, targetDistance, score, combo, maxCombo, unlockedSkins]);

  // Check for game over
  useEffect(() => {
    if (lives <= 0 && isPlaying) {
      setIsPlaying(false);
      setGameOver(true);
      setVictory(false);
    }
  }, [lives, isPlaying]);

  return (
    <div className="min-h-dvh overflow-hidden" style={{ background: `linear-gradient(180deg, ${currentWorld.bgFrom} 0%, ${currentWorld.bgTo} 100%)` }}>
      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur z-50">
          <div className="bg-white rounded-3xl p-8 max-w-lg mx-4 text-center shadow-2xl">
            <div className="text-6xl mb-4">📦✨</div>
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Welcome to Packet Race!
            </h2>
            <div className="space-y-4 text-gray-700 text-left">
              <p className="text-lg font-semibold">You're a magical data packet!</p>
              <div className="bg-purple-50 rounded-xl p-4 space-y-2">
                <p><strong>🎮 Controls:</strong></p>
                <p>• Arrow keys or WASD to move</p>
                <p>• Space or Escape to pause</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4 space-y-2">
                <p><strong>🎯 Goal:</strong></p>
                <p>• Collect coins and gems for points</p>
                <p>• Avoid rocks and obstacles</p>
                <p>• Reach the finish line!</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 space-y-2">
                <p><strong>⚡ Power-ups:</strong></p>
                <p>• 🚀 Turbo = Super speed!</p>
                <p>• 🛡️ Shield = Protects you!</p>
                <p>• 🧲 Magnet = Attracts coins!</p>
              </div>
            </div>
            <button
              onClick={() => setShowTutorial(false)}
              className="w-full mt-6 py-4 rounded-xl font-bold text-white text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-105 transition shadow-lg"
            >
              Let's Go! 🚀
            </button>
          </div>
        </div>
      )}

      {/* Game Over / Victory Modal */}
      {gameOver && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <div className="text-6xl mb-4">{victory ? "🎉" : "💔"}</div>
            <h2 className="text-3xl font-bold mb-4">
              {victory ? "You Made It!" : "Try Again!"}
            </h2>
            <div className="text-5xl mb-4">
              {victory ? (score >= 500 ? "⭐⭐⭐" : score >= 300 ? "⭐⭐" : "⭐") : "😢"}
            </div>
            <div className="space-y-2 mb-6">
              <p className="text-2xl font-bold text-purple-600">Score: {score}</p>
              <p className="text-lg text-gray-600">Coins: {coins} 🪙</p>
              <p className="text-lg text-gray-600">Distance: {Math.floor(distance)}m</p>
              {maxCombo > 0 && <p className="text-lg text-yellow-600">Best Combo: {maxCombo}x 🔥</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setLives(3); startGame(); }}
                className="flex-1 py-3 rounded-xl font-bold text-white transition hover:scale-105 shadow-lg"
                style={{ background: currentWorld.color }}
              >
                <RotateCcw className="inline mr-2 h-5 w-5" /> Play Again
              </button>
              <button
                onClick={() => { setGameOver(false); setVictory(false); }}
                className="flex-1 py-3 rounded-xl font-bold border-2 border-gray-300 transition hover:bg-gray-50"
              >
                Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/20 bg-black/30 backdrop-blur sticky top-0 z-30">
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
            <div className="text-8xl mb-4">{currentWorld.emoji}</div>
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">Packet Race</h1>
            <p className="text-purple-200 mb-6 text-lg">{currentWorld.description}</p>

            {/* Skin Selector */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-4">Choose Your Packet</h3>
              <div className="flex flex-wrap justify-center gap-3">
                {SKINS.map((skin) => (
                  <button
                    key={skin.id}
                    onClick={() => {
                      if (unlockedSkins.includes(skin.id)) {
                        setSelectedSkin(skin);
                      }
                    }}
                    disabled={!unlockedSkins.includes(skin.id)}
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition ${
                      selectedSkin.id === skin.id ? "ring-4 ring-white scale-110" : "hover:scale-105"
                    } ${!unlockedSkins.includes(skin.id) ? "opacity-50 grayscale" : ""}`}
                    style={{ background: skin.color }}
                  >
                    {unlockedSkins.includes(skin.id) ? skin.emoji : "🔒"}
                  </button>
                ))}
              </div>
            </div>

            {/* World Selector */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-4">Select World</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {WORLDS.map((w, i) => (
                  <button
                    key={i}
                    onClick={() => setWorld(i)}
                    className={`p-4 rounded-2xl transition ${
                      world === i ? "ring-4 ring-white scale-105" : "hover:scale-105 opacity-80 hover:opacity-100"
                    }`}
                    style={{ background: w.color }}
                  >
                    <div className="text-3xl mb-2">{w.emoji}</div>
                    <div className="text-white font-bold text-sm">{w.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={startGame}
              className="px-12 py-5 rounded-2xl font-bold text-white text-2xl transition hover:scale-105 flex items-center gap-3 mx-auto shadow-2xl"
              style={{ background: currentWorld.color }}
            >
              <Play className="h-8 w-8" /> Start Race!
            </button>
          </div>
        )}

        {isPlaying && (
          <>
            {/* Stats Bar */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-4 flex items-center justify-between border border-white/20">
              <div className="flex items-center gap-6">
                <div className="text-white">
                  <div className="text-2xl font-bold">{score}</div>
                  <div className="text-xs text-purple-200">Score</div>
                </div>
                <div className="text-white">
                  <div className="text-2xl font-bold">{coins} 🪙</div>
                  <div className="text-xs text-purple-200">Coins</div>
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
                {showCombo && combo > 0 && (
                  <div className="text-yellow-400 font-bold text-xl animate-pulse">
                    {combo}x COMBO! 🔥
                  </div>
                )}
                {packet.hasTurbo && <Zap className="h-6 w-6 text-yellow-400 animate-pulse" />}
                {packet.hasShield && <Shield className="h-6 w-6 text-blue-400" />}
                {packet.hasMagnet && <Sparkles className="h-6 w-6 text-purple-400" />}
                <button
                  onClick={isPaused ? resumeGame : pauseGame}
                  className="px-4 py-2 rounded-lg bg-white/20 text-white font-bold hover:bg-white/30 transition"
                >
                  {isPaused ? "▶️" : "⏸️"}
                </button>
              </div>
            </div>

            {/* Game Area */}
            <div
              ref={gameRef}
              className="relative rounded-2xl overflow-hidden border-4 border-white/30 shadow-2xl"
              style={{ height: "500px", background: `linear-gradient(180deg, ${currentWorld.bgFrom} 0%, ${currentWorld.bgTo} 100%)` }}
            >
              {/* Progress Bar */}
              <div className="absolute top-0 left-0 right-0 h-3 bg-gray-800/50">
                <div
                  className="h-full transition-all relative"
                  style={{ width: `${(distance / targetDistance) * 100}%`, background: currentWorld.color }}
                >
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-white animate-pulse" />
                </div>
              </div>

              {/* Finish Line */}
              <div
                className="absolute top-0 bottom-0 w-4 flex items-center justify-center"
                style={{ 
                  left: targetDistance,
                  background: "repeating-linear-gradient(45deg, #000, #000 10px, #fff 10px, #fff 20px)"
                }}
              >
                <div className="text-4xl">🏁</div>
              </div>

              {/* Trail */}
              {packet.trail.map((pos, i) => (
                <div
                  key={i}
                  className="absolute w-4 h-4 rounded-full opacity-50"
                  style={{
                    left: pos.x,
                    top: pos.y,
                    transform: "translate(-50%, -50%)",
                    background: selectedSkin.color,
                    opacity: (i / packet.trail.length) * 0.5,
                  }}
                />
              ))}

              {/* Packet */}
              <div
                className="absolute w-14 h-14 rounded-full flex items-center justify-center text-3xl transition-all shadow-2xl"
                style={{
                  left: packet.x,
                  top: packet.y,
                  transform: "translate(-50%, -50%)",
                  background: packet.hasTurbo ? "#F59E0B" : packet.hasShield ? "#3B82F6" : selectedSkin.color,
                  boxShadow: `0 0 30px ${packet.hasTurbo ? "#F59E0B" : packet.hasShield ? "#3B82F6" : selectedSkin.color}`,
                  zIndex: 10,
                }}
              >
                {selectedSkin.emoji}
              </div>

              {/* Collectibles */}
              {collectibles.map((c) => (
                !c.collected && (
                  <div
                    key={c.id}
                    className="absolute w-10 h-10 rounded-full flex items-center justify-center text-2xl animate-bounce"
                    style={{
                      left: c.x,
                      top: c.y,
                      transform: "translate(-50%, -50%)",
                      animationDelay: `${Math.random() * 0.5}s`,
                    }}
                  >
                    {c.type === "coin" && "🪙"}
                    {c.type === "gem" && "💎"}
                    {c.type === "star" && "⭐"}
                    {c.type === "turbo" && "🚀"}
                    {c.type === "shield" && "🛡️"}
                    {c.type === "magnet" && "🧲"}
                    {c.type === "key" && "🔑"}
                  </div>
                )
              ))}

              {/* Obstacles */}
              {obstacles.map((o) => (
                <div
                  key={o.id}
                  className="absolute flex items-center justify-center text-4xl"
                  style={{
                    left: o.x,
                    top: o.y,
                    width: o.width,
                    height: o.height,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {o.type === "rock" && "🪨"}
                  {o.type === "spike" && "🔺"}
                  {o.type === "cloud" && "☁️"}
                  {o.type === "virus" && "🦠"}
                </div>
              ))}

              {/* Paused Overlay */}
              {isPaused && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur">
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

            {/* Mobile Controls Hint */}
            <div className="mt-4 text-center text-white/60 text-sm">
              Use Arrow Keys or WASD to move • Space to pause
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

