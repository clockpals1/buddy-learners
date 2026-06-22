import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, RotateCcw, Play, Star, X, Heart, Trophy, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/games/typing-ninjas")({
  head: () => ({ meta: [{ title: "Typing Ninjas · Leafva Academy" }] }),
  component: TypingNinjas,
  validateSearch: (search: Record<string, unknown>) => ({
    childId: search.childId as string | undefined,
  }),
});

type FallingLetter = {
  id: string;
  char: string;
  x: number;
  y: number;
  speed: number;
};

const WORLDS = [
  { name: "Home Row Dojo", keys: ["A", "S", "D", "F"], color: "#8B5CF6" },
  { name: "Shadow Temple", keys: ["J", "K", "L"], color: "#EC4899" },
  { name: "Speed Forest", keys: ["A", "S", "D", "F", "J", "K", "L"], color: "#10B981" },
  { name: "Space Mountain", keys: [" "], color: "#F59E0B" },
  { name: "Master Dojo", keys: ["A", "S", "D", "F", "J", "K", "L", " "], color: "#EF4444" },
];

function TypingNinjas() {
  const { childId } = useSearch({ from: "/_authenticated/games/typing-ninjas" });
  const [world, setWorld] = useState(0);
  const [level, setLevel] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [letters, setLetters] = useState<FallingLetter[]>([]);
  const [showTutorial, setShowTutorial] = useState(true);
  const [bestStars, setBestStars] = useState<Record<number, number>>({});
  const [totalStars, setTotalStars] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ name: string; score: number; child_id: string }[]>([]);

  const gameRef = useRef<HTMLDivElement>(null);
  const spawnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  const currentWorld = WORLDS[world];
  const speedMultiplier = 1 + (level * 0.1);
  const spawnRate = Math.max(500, 1500 - (level * 100));

  // Load progress on mount
  useEffect(() => {
    loadProgress();
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    const { data: scores } = await (supabase as any)
      .from("game_progress")
      .select("child_id, game_slug, level, stars, children(display_name)")
      .eq("game_slug", "typing-ninjas")
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
      .eq("game_slug", "typing-ninjas");

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
        game_slug: "typing-ninjas",
        level: levelNum,
        stars: starsEarned,
        completed_at: new Date().toISOString(),
      }, { onConflict: "user_id,child_id,game_slug,level" });

    setBestStars(prev => ({ ...prev, [levelNum]: Math.max(prev[levelNum] || 0, starsEarned) }));
    setTotalStars(prev => prev + (starsEarned - (bestStars[levelNum] || 0)));
  }

  function spawnLetter() {
    if (!isPlaying || isPaused) return;

    const containerWidth = gameRef.current?.clientWidth || 600;
    const keys = currentWorld.keys;
    const char = keys[Math.floor(Math.random() * keys.length)];

    const newLetter: FallingLetter = {
      id: Math.random().toString(36).substr(2, 9),
      char: char === " " ? "␣" : char,
      x: Math.random() * (containerWidth - 60) + 30,
      y: -50,
      speed: (1 + Math.random() * 0.5) * speedMultiplier,
    };

    setLetters(prev => [...prev, newLetter]);
  }

  function gameLoop() {
    if (!isPlaying || isPaused) return;

    setLetters(prev => {
      const updated = prev.map(letter => ({
        ...letter,
        y: letter.y + letter.speed,
      }));

      // Check for letters that hit the ground
      const missed = updated.filter(l => l.y > 500);
      if (missed.length > 0) {
        setLives(prev => Math.max(0, prev - missed.length));
        setCombo(0);
      }

      return updated.filter(l => l.y <= 500);
    });

    gameLoopRef.current = setTimeout(gameLoop, 16);
  }

  function startGame() {
    setIsPlaying(true);
    setIsPaused(false);
    setScore(0);
    setLives(3);
    setCombo(0);
    setLetters([]);
    
    // Clear any existing intervals
    if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
    if (gameLoopRef.current) clearTimeout(gameLoopRef.current);
    
    // Start spawning letters
    spawnLetter();
    spawnIntervalRef.current = setInterval(spawnLetter, spawnRate);
    
    // Start game loop
    gameLoopRef.current = setTimeout(gameLoop, 16);
  }

  function pauseGame() {
    setIsPaused(true);
    if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
    if (gameLoopRef.current) clearTimeout(gameLoopRef.current);
  }

  function resumeGame() {
    setIsPaused(false);
    spawnLetter();
    spawnIntervalRef.current = setInterval(spawnLetter, spawnRate);
    gameLoopRef.current = setTimeout(gameLoop, 16);
  }

  function endGame() {
    setIsPlaying(false);
    setIsPaused(false);
    if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
    if (gameLoopRef.current) clearTimeout(gameLoopRef.current);

    // Calculate stars based on score
    const stars = score >= 100 ? 3 : score >= 50 ? 2 : score >= 20 ? 1 : 0;
    if (stars > 0) {
      saveProgress(world * 10 + level, stars);
    }
  }

  useEffect(() => {
    if (lives <= 0 && isPlaying) {
      endGame();
    }
  }, [lives, isPlaying]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!isPlaying || isPaused) return;

    const key = e.key.toUpperCase();
    const spaceKey = e.key === " ";

    // Find matching letter
    const matchingIndex = letters.findIndex(l => {
      if (l.char === "␣") return spaceKey;
      return l.char === key;
    });

    if (matchingIndex !== -1) {
      // Correct key
      setScore(prev => prev + 10 + combo);
      setCombo(prev => prev + 1);
      setLetters(prev => prev.filter((_, i) => i !== matchingIndex));
    } else {
      // Wrong key
      setCombo(0);
      setLives(prev => Math.max(0, prev - 1));
    }
  }, [letters, isPlaying, isPaused, combo]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  function getComboEffect() {
    if (combo >= 30) return { text: "Golden Keyboard Fury!", color: "#FFD700" };
    if (combo >= 20) return { text: "Dragon Ninja Mode!", color: "#FF6B6B" };
    if (combo >= 10) return { text: "Lightning Slash!", color: "#4ECDC4" };
    if (combo >= 5) return { text: "Fire Sword!", color: "#FF8C00" };
    return null;
  }

  const comboEffect = getComboEffect();

  return (
    <div className="min-h-dvh" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}>
      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold" style={{ color: "#8B5CF6" }}>🥷 How to Play</h2>
              <button
                onClick={() => setShowTutorial(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100"
              >
                <X className="h-6 w-6" style={{ color: "#6b7280" }} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🎯</div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Type the Letters</h3>
                  <p className="text-gray-600">Letters fall from the sky. Type the correct key before they hit the ground!</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="text-4xl">⚡</div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Build Combos</h3>
                  <p className="text-gray-600">Correct keys in a row build combos. Higher combos = more points!</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="text-4xl">❤️</div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Watch Your Lives</h3>
                  <p className="text-gray-600">Wrong keys or missed letters cost lives. Don't lose all 3!</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="text-4xl">🌍</div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Master Each World</h3>
                  <p className="text-gray-600">Start with home row keys, then advance to harder challenges!</p>
                </div>
              </div>

              <div className="bg-purple-50 rounded-xl p-4 mt-6">
                <h3 className="font-bold text-purple-900 mb-2">🎮 Current World: {currentWorld.name}</h3>
                <p className="text-purple-700 text-sm">Practice these keys: {currentWorld.keys.map(k => k === " " ? "Space" : k).join(", ")}</p>
              </div>
            </div>

            <button
              onClick={() => { setShowTutorial(false); startGame(); }}
              className="mt-8 w-full py-4 rounded-xl font-bold text-lg text-white transition hover:scale-105"
              style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)" }}
            >
              Start Training! 🥷
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {lives <= 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div className="text-6xl mb-4">😢</div>
            <h2 className="text-3xl font-bold mb-2" style={{ color: "#EF4444" }}>Game Over!</h2>
            <p className="text-gray-600 mb-6">The Typo Monsters won this time...</p>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="text-4xl font-bold mb-2" style={{ color: "#8B5CF6" }}>{score}</div>
              <div className="text-sm text-gray-600">Final Score</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setLives(3); startGame(); }}
                className="flex-1 py-3 rounded-xl font-bold text-white transition hover:scale-105"
                style={{ background: "#8B5CF6" }}
              >
                Try Again
              </button>
              <button
                onClick={() => { setLives(3); setLetters([]); setIsPlaying(false); }}
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
        {/* World & Level Selector */}
        {!isPlaying && (
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">🥷 Typing Ninjas</h1>
            <p className="text-purple-200 mb-6">Defeat the Typo Monsters with your keyboard skills!</p>

            <div className="grid grid-cols-5 gap-2 mb-6">
              {WORLDS.map((w, i) => (
                <button
                  key={i}
                  onClick={() => setWorld(i)}
                  className={`py-3 px-2 rounded-xl font-bold text-sm transition ${
                    world === i ? "text-white" : "text-white/50 hover:text-white"
                  }`}
                  style={{ background: world === i ? w.color : "rgba(255,255,255,0.1)" }}
                >
                  <div className="text-lg mb-1">{i + 1}</div>
                  <div className="text-xs">{w.name.split(" ")[0]}</div>
                </button>
              ))}
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-bold">Level {level + 1}</span>
                <span className="text-purple-200 text-sm">Speed: {speedMultiplier.toFixed(1)}x</span>
              </div>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                  <button
                    key={i}
                    onClick={() => setLevel(i)}
                    className={`flex-1 h-2 rounded-full transition ${
                      level === i ? "bg-white" : "bg-white/20 hover:bg-white/30"
                    }`}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={startGame}
              className="w-full py-4 rounded-xl font-bold text-lg text-white transition hover:scale-105 flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg, ${currentWorld.color} 0%, ${currentWorld.color}CC 100%)` }}
            >
              <Play className="h-6 w-6" /> Start Training
            </button>
          </div>
        )}

        {/* Game Area */}
        {isPlaying && (
          <>
            {/* Stats Bar */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-white">
                  <div className="text-2xl font-bold">{score}</div>
                  <div className="text-xs text-purple-200">Score</div>
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
                {combo > 0 && (
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    <span className="text-white font-bold">{combo}</span>
                  </div>
                )}
                {comboEffect && (
                  <div className="px-3 py-1 rounded-full text-sm font-bold text-white animate-pulse" style={{ background: comboEffect.color }}>
                    {comboEffect.text}
                  </div>
                )}
                <button
                  onClick={isPaused ? resumeGame : pauseGame}
                  className="px-4 py-2 rounded-lg bg-white/20 text-white font-bold hover:bg-white/30 transition"
                >
                  {isPaused ? "Resume" : "Pause"}
                </button>
              </div>
            </div>

            {/* Game Canvas */}
            <div
              ref={gameRef}
              className="relative rounded-2xl overflow-hidden"
              style={{ height: "500px", background: "linear-gradient(180deg, #1a1a2e 0%, #0f3460 100%)", border: `3px solid ${currentWorld.color}` }}
            >
              {/* Keyboard hint at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/30 backdrop-blur">
                <div className="flex justify-center gap-2">
                  {currentWorld.keys.map((key) => (
                    <div
                      key={key}
                      className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white bg-white/10 border-2 border-white/20"
                    >
                      {key === " " ? "␣" : key}
                    </div>
                  ))}
                </div>
              </div>

              {/* Falling Letters */}
              {letters.map((letter) => (
                <div
                  key={letter.id}
                  className="absolute text-4xl font-bold text-white drop-shadow-lg"
                  style={{
                    left: letter.x,
                    top: letter.y,
                    transform: "translateX(-50%)",
                    textShadow: "0 0 20px rgba(139, 92, 246, 0.8)",
                    zIndex: 10,
                  }}
                >
                  {letter.char}
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
