import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Star, Trophy, X, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/games/math-maze")({
  head: () => ({ meta: [{ title: "Math Maze Master · Leafva Academy" }] }),
  component: MathMazeMaster,
  validateSearch: (search: Record<string, unknown>) => ({
    childId: search.childId as string | undefined,
  }),
});

type Cell = "wall" | "path" | "door" | "key" | "treasure" | "portal" | "start" | "end";
type Direction = "up" | "down" | "left" | "right";

type MathChallenge = {
  question: string;
  answer: number;
  options: number[];
  hint: string;
};

type WorldConfig = {
  name: string;
  emoji: string;
  color: string;
  bgGradient: string;
  description: string;
  operation: string;
  maxNum: number;
};

const WORLDS: WorldConfig[] = [
  { name: "Addition Forest", emoji: "🌲", color: "#22c55e", bgGradient: "from-green-900 via-green-800 to-emerald-900", description: "Help forest animals by solving addition!", operation: "+", maxNum: 10 },
  { name: "Subtraction Caves", emoji: "🦇", color: "#8b5cf6", bgGradient: "from-purple-900 via-violet-800 to-purple-900", description: "Navigate dark caves with subtraction magic!", operation: "-", maxNum: 15 },
  { name: "Multiplication Mountains", emoji: "⛰️", color: "#f59e0b", bgGradient: "from-yellow-900 via-orange-800 to-yellow-900", description: "Climb mountains using times tables!", operation: "×", maxNum: 10 },
  { name: "Division Desert", emoji: "🌵", color: "#ef4444", bgGradient: "from-red-900 via-rose-800 to-red-900", description: "Cross the desert with division power!", operation: "÷", maxNum: 12 },
  { name: "Crystal Kingdom", emoji: "💎", color: "#06b6d4", bgGradient: "from-cyan-900 via-sky-800 to-cyan-900", description: "Discover crystal treasures with mixed math!", operation: "mixed", maxNum: 20 },
];

const MAZE_TEMPLATE = [
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,0,0,1],
  [1,0,1,0,1,0,1,1,1,0,1],
  [1,0,1,0,0,0,0,0,1,0,1],
  [1,0,1,1,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,1],
  [1,1,1,0,1,0,1,1,1,0,1],
  [1,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,1,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1],
];

function generateMaze(): Cell[][] {
  const maze: Cell[][] = MAZE_TEMPLATE.map(row => row.map(cell => cell === 1 ? "wall" : "path"));
  maze[1][1] = "start";
  maze[9][9] = "end";
  // Place doors, keys, treasures
  maze[3][5] = "door";
  maze[6][4] = "door";
  maze[7][7] = "door";
  maze[2][8] = "key";
  maze[5][2] = "key";
  maze[8][5] = "treasure";
  maze[4][9] = "treasure";
  maze[6][1] = "portal";
  return maze;
}

function generateChallenge(world: WorldConfig): MathChallenge {
  const a = Math.floor(Math.random() * world.maxNum) + 1;
  const b = Math.floor(Math.random() * world.maxNum) + 1;
  let question = "";
  let answer = 0;
  const ops = world.operation === "mixed" ? ["+", "-", "×"] : [world.operation];
  const op = ops[Math.floor(Math.random() * ops.length)];

  if (op === "+") { question = `${a} + ${b} = ?`; answer = a + b; }
  else if (op === "-") { const big = Math.max(a, b); const small = Math.min(a, b); question = `${big} - ${small} = ?`; answer = big - small; }
  else if (op === "×") { const x = Math.floor(Math.random() * 9) + 1; const y = Math.floor(Math.random() * 9) + 1; question = `${x} × ${y} = ?`; answer = x * y; }
  else if (op === "÷") { const divisor = Math.floor(Math.random() * 9) + 1; const quotient = Math.floor(Math.random() * 9) + 1; question = `${divisor * quotient} ÷ ${divisor} = ?`; answer = quotient; }

  const options = [answer];
  while (options.length < 4) {
    const wrong = answer + (Math.floor(Math.random() * 10) - 5);
    if (wrong > 0 && !options.includes(wrong)) options.push(wrong);
  }
  options.sort(() => Math.random() - 0.5);

  const hints: Record<string, string> = {
    "+": `Count up from ${a} by adding ${b} more!`,
    "-": `Start at the bigger number and count down!`,
    "×": `Try counting in groups!`,
    "÷": `How many equal groups can you make?`,
  };

  return { question, answer, options, hint: hints[op] || "Think carefully and try again!" };
}

const ENCOURAGEMENTS = ["Great Thinking! 🧠", "Almost There! ✨", "You're So Close! 💪", "Keep Exploring! 🗺️", "Fantastic Try! ⭐"];
const CORRECT_MSGS = ["Door Unlocked! 🎉", "Amazing! ✨", "You're a Math Hero! 🦸", "Brilliant! 🌟", "Magical! 💫"];

function MathMazeMaster() {
  const { childId } = useSearch({ from: "/_authenticated/games/math-maze" });
  const [worldIdx, setWorldIdx] = useState(0);
  const [maze, setMaze] = useState<Cell[][]>([]);
  const [playerPos, setPlayerPos] = useState({ r: 1, c: 1 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [challenge, setChallenge] = useState<MathChallenge | null>(null);
  const [pendingDoor, setPendingDoor] = useState<{ r: number; c: number } | null>(null);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [stars, setStars] = useState(0);
  const [keys, setKeys] = useState(0);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<{ msg: string; correct: boolean } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [totalStars, setTotalStars] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ name: string; score: number }[]>([]);
  const [openedDoors, setOpenedDoors] = useState<Set<string>>(new Set());

  const currentWorld = WORLDS[worldIdx];

  useEffect(() => { loadProgress(); loadLeaderboard(); }, []);

  async function loadLeaderboard() {
    const { data: scores } = await (supabase as any)
      .from("game_progress").select("child_id, stars, children(display_name)")
      .eq("game_slug", "math-maze").order("stars", { ascending: false }).limit(10);
    if (scores) setLeaderboard(scores.map((s: any) => ({ name: s.children?.display_name || "Explorer", score: s.stars })));
  }

  async function loadProgress() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !childId) return;
    const { data: progress } = await (supabase as any)
      .from("game_progress").select("stars").eq("user_id", user.id).eq("child_id", childId).eq("game_slug", "math-maze");
    if (progress) setTotalStars(progress.reduce((t: number, p: any) => t + p.stars, 0));
  }

  async function saveProgress(starsEarned: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !childId) return;
    await (supabase as any).from("game_progress").upsert({
      user_id: user.id, child_id: childId, game_slug: "math-maze",
      level: worldIdx, stars: starsEarned, completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,child_id,game_slug,level" });
    setTotalStars(prev => prev + starsEarned);
    loadLeaderboard();
  }

  function startGame() {
    setMaze(generateMaze());
    setPlayerPos({ r: 1, c: 1 });
    setScore(0); setCoins(0); setStars(0); setKeys(0); setCombo(0);
    setOpenedDoors(new Set());
    setIsPlaying(true); setGameOver(false); setVictory(false);
    setChallenge(null); setPendingDoor(null); setFeedback(null);
  }

  const movePlayer = useCallback((dir: Direction) => {
    if (!isPlaying || challenge) return;
    setPlayerPos(prev => {
      let { r, c } = prev;
      if (dir === "up") r--;
      else if (dir === "down") r++;
      else if (dir === "left") c--;
      else if (dir === "right") c++;

      if (r < 0 || r >= maze.length || c < 0 || c >= maze[0].length) return prev;
      const cell = maze[r][c];
      if (cell === "wall") return prev;

      if (cell === "door" && !openedDoors.has(`${r},${c}`)) {
        setPendingDoor({ r, c });
        setChallenge(generateChallenge(currentWorld));
        return prev;
      }
      if (cell === "key") {
        setKeys(k => k + 1); setScore(s => s + 50); setCoins(co => co + 10);
        setMaze(m => { const nm = m.map(row => [...row]); nm[r][c] = "path"; return nm; });
      }
      if (cell === "treasure") {
        setScore(s => s + 150); setCoins(co => co + 30); setStars(st => st + 1);
        setMaze(m => { const nm = m.map(row => [...row]); nm[r][c] = "path"; return nm; });
      }
      if (cell === "portal") {
        setScore(s => s + 100);
        return { r: 9, c: 1 };
      }
      if (cell === "end") {
        const earned = stars >= 2 ? 3 : stars >= 1 ? 2 : 1;
        saveProgress(earned);
        setVictory(true); setIsPlaying(false);
        return { r, c };
      }
      return { r, c };
    });
  }, [isPlaying, challenge, maze, currentWorld, openedDoors, stars]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w") { e.preventDefault(); movePlayer("up"); }
      if (e.key === "ArrowDown" || e.key === "s") { e.preventDefault(); movePlayer("down"); }
      if (e.key === "ArrowLeft" || e.key === "a") { e.preventDefault(); movePlayer("left"); }
      if (e.key === "ArrowRight" || e.key === "d") { e.preventDefault(); movePlayer("right"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [movePlayer]);

  function answerChallenge(answer: number) {
    if (!challenge || !pendingDoor) return;
    if (answer === challenge.answer) {
      setCombo(c => c + 1);
      const bonusCoins = combo >= 5 ? 20 : 0;
      setScore(s => s + 100 + bonusCoins);
      setCoins(co => co + 5 + bonusCoins);
      setFeedback({ msg: CORRECT_MSGS[Math.floor(Math.random() * CORRECT_MSGS.length)], correct: true });
      const { r, c } = pendingDoor;
      setOpenedDoors(prev => new Set([...prev, `${r},${c}`]));
      setMaze(m => { const nm = m.map(row => [...row]); nm[r][c] = "path"; return nm; });
      setTimeout(() => { setChallenge(null); setPendingDoor(null); setFeedback(null); setShowHint(false); }, 1200);
    } else {
      setCombo(0);
      setFeedback({ msg: ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)], correct: false });
      setTimeout(() => setFeedback(null), 1500);
    }
  }

  const cellEmoji: Record<Cell, string> = {
    wall: "", path: "", door: "🚪", key: "🗝️", treasure: "💎",
    portal: "🌀", start: "🧭", end: "🏆",
  };

  const comboReward = combo >= 20 ? "👑 GOLDEN EXPLORER!" : combo >= 15 ? "🛡️ Magic Shield!" : combo >= 10 ? "💰 Double Coins!" : combo >= 5 ? "🧲 Treasure Magnet!" : null;

  return (
    <div className={`min-h-dvh bg-gradient-to-br ${currentWorld.bgGradient}`}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/40 backdrop-blur border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/child/$childId" params={{ childId: childId || "" }} className="flex items-center gap-2 text-white hover:opacity-80">
            <ArrowLeft className="h-5 w-5" /> Back
          </Link>
          <div className="flex items-center gap-4 text-white text-sm font-bold">
            <span>⭐ {totalStars}</span>
            <span>🪙 {coins}</span>
            <span>🗝️ {keys}</span>
            {combo > 0 && <span className="text-yellow-400 animate-pulse">{combo}x 🔥</span>}
            <button onClick={() => setShowLeaderboard(true)} className="flex items-center gap-1 hover:opacity-80">
              <Trophy className="h-4 w-4 text-yellow-400" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Menu */}
        {!isPlaying && !victory && !gameOver && (
          <div className="text-center">
            <div className="text-8xl mb-3 animate-bounce">{currentWorld.emoji}</div>
            <h1 className="text-4xl font-bold text-white mb-2">Math Maze Master</h1>
            <p className="text-white/70 mb-6 text-lg">{currentWorld.description}</p>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-8">
              {WORLDS.map((w, i) => (
                <button key={i} onClick={() => setWorldIdx(i)}
                  className={`p-3 rounded-2xl transition hover:scale-105 ${worldIdx === i ? "ring-4 ring-white" : "opacity-70"}`}
                  style={{ background: w.color + "44", border: `2px solid ${w.color}` }}>
                  <div className="text-3xl mb-1">{w.emoji}</div>
                  <div className="text-white text-xs font-bold">{w.name.split(" ")[0]}</div>
                </button>
              ))}
            </div>

            <div className="bg-white/10 rounded-2xl p-6 mb-8 max-w-md mx-auto text-left space-y-3">
              <p className="text-white font-bold text-lg">🎮 How to Play:</p>
              <p className="text-white/80">• Use arrow keys or buttons to move</p>
              <p className="text-white/80">• 🗝️ Collect keys to boost your score</p>
              <p className="text-white/80">• 🚪 Doors need math answers to open</p>
              <p className="text-white/80">• 💎 Grab treasures for bonus stars</p>
              <p className="text-white/80">• 🏆 Reach the trophy to win!</p>
            </div>

            <button onClick={startGame}
              className="px-12 py-4 rounded-2xl font-bold text-white text-xl hover:scale-105 transition shadow-2xl"
              style={{ background: currentWorld.color }}>
              🗺️ Start Adventure!
            </button>
          </div>
        )}

        {/* Victory */}
        {victory && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur z-50">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
              <div className="text-6xl mb-3 animate-bounce">🎉</div>
              <h2 className="text-3xl font-bold mb-2">Maze Conquered!</h2>
              <div className="text-4xl mb-4">{stars >= 2 ? "⭐⭐⭐" : stars >= 1 ? "⭐⭐" : "⭐"}</div>
              <p className="text-2xl font-bold text-purple-600 mb-1">Score: {score}</p>
              <p className="text-gray-500 mb-6">Coins: {coins} 🪙 | Combo: {combo}x 🔥</p>
              <div className="flex gap-3">
                <button onClick={startGame} className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: currentWorld.color }}>
                  <RotateCcw className="inline mr-1 h-4 w-4" /> Play Again
                </button>
                <button onClick={() => { setVictory(false); setIsPlaying(false); }} className="flex-1 py-3 rounded-xl font-bold border-2 border-gray-200">
                  Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Area */}
        {isPlaying && (
          <>
            {/* Combo reward banner */}
            {comboReward && (
              <div className="text-center mb-2 text-yellow-300 font-bold text-lg animate-pulse">{comboReward}</div>
            )}

            {/* Maze Grid */}
            <div className="flex justify-center mb-4">
              <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `repeat(${maze[0]?.length || 11}, 1fr)` }}>
                {maze.map((row, r) => row.map((cell, c) => {
                  const isPlayer = playerPos.r === r && playerPos.c === c;
                  const isDoorOpen = cell === "door" && openedDoors.has(`${r},${c}`);
                  return (
                    <div key={`${r}-${c}`}
                      className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-base rounded-sm transition-all ${
                        cell === "wall" ? "bg-gray-900/80" :
                        cell === "start" ? "bg-green-600/40" :
                        cell === "end" ? "bg-yellow-500/40" :
                        "bg-black/20"
                      }`}
                      style={{ border: cell === "wall" ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                      {isPlayer ? <span className="text-xl animate-pulse">🧙</span>
                        : isDoorOpen ? <span className="text-base opacity-50">▫️</span>
                        : cellEmoji[cell] ? <span className="text-base">{cellEmoji[cell]}</span>
                        : null}
                    </div>
                  );
                }))}
              </div>
            </div>

            {/* Mobile D-Pad */}
            <div className="flex flex-col items-center gap-1 mb-4">
              <button onClick={() => movePlayer("up")} className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-xl text-white text-xl font-bold">▲</button>
              <div className="flex gap-1">
                <button onClick={() => movePlayer("left")} className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-xl text-white text-xl font-bold">◀</button>
                <div className="w-12 h-12" />
                <button onClick={() => movePlayer("right")} className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-xl text-white text-xl font-bold">▶</button>
              </div>
              <button onClick={() => movePlayer("down")} className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-xl text-white text-xl font-bold">▼</button>
            </div>
          </>
        )}
      </div>

      {/* Math Challenge Modal */}
      {challenge && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
            <div className="text-5xl mb-3">🚪✨</div>
            <h3 className="text-xl font-bold mb-1 text-gray-700">Magic Door!</h3>
            <p className="text-gray-500 mb-4 text-sm">Solve the puzzle to open it!</p>

            {feedback && (
              <div className={`mb-4 py-2 px-4 rounded-xl font-bold text-lg animate-bounce ${feedback.correct ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                {feedback.msg}
              </div>
            )}

            <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl p-6 mb-6">
              <p className="text-4xl font-bold text-gray-800">{challenge.question}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {challenge.options.map((opt, i) => (
                <button key={i} onClick={() => answerChallenge(opt)}
                  className="py-4 rounded-2xl text-2xl font-bold text-white transition hover:scale-105 shadow-lg"
                  style={{ background: ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b"][i] }}>
                  {opt}
                </button>
              ))}
            </div>

            {!showHint ? (
              <button onClick={() => setShowHint(true)} className="text-sm text-purple-500 underline">Need a hint? 💡</button>
            ) : (
              <div className="bg-yellow-50 rounded-xl p-3 text-sm text-yellow-800">💡 {challenge.hint}</div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {showLeaderboard && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">🏆 Top Explorers</h2>
              <button onClick={() => setShowLeaderboard(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-2">
              {leaderboard.length === 0 ? (
                <p className="text-gray-400 text-center py-6">No scores yet — be the first!</p>
              ) : leaderboard.map((e, i) => (
                <div key={i} className={`flex justify-between items-center p-3 rounded-xl ${i === 0 ? "bg-yellow-50 border-2 border-yellow-300" : i === 1 ? "bg-gray-50 border-2 border-gray-300" : i === 2 ? "bg-orange-50 border-2 border-orange-200" : "bg-gray-50"}`}>
                  <span className="font-semibold">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`} {e.name}</span>
                  <span className="font-bold text-purple-600">{e.score} ⭐</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
