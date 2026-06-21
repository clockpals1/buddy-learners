import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, RotateCcw, Play, Star, X, Info, Lightbulb, Target, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/games/pixel-pet-coder")({
  head: () => ({ meta: [{ title: "Pixel Pet Coder · Leafva Academy" }] }),
  component: PixelPetCoder,
});

type Direction = "up" | "down" | "left" | "right";
type Block = { id: string; direction: Direction };

const LEVELS = [
  { gridSize: 8, pawPrints: 3, timeLimit: 60 },
  { gridSize: 8, pawPrints: 4, timeLimit: 50 },
  { gridSize: 10, pawPrints: 5, timeLimit: 45 },
];

function PixelPetCoder() {
  const [level, setLevel] = useState(0);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [petPos, setPetPos] = useState({ x: 0, y: 0 });
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [stars, setStars] = useState(0);
  const [timeLeft, setTimeLeft] = useState(LEVELS[0].timeLimit);
  const [maze, setMaze] = useState<boolean[][]>([]);
  const [pawPrints, setPawPrints] = useState<{ x: number; y: number }[]>([]);
  const [doorPos, setDoorPos] = useState({ x: 0, y: 0 });
  const [showBounce, setShowBounce] = useState(false);
  const [showWag, setShowWag] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [bestStars, setBestStars] = useState<Record<number, number>>({});
  const [totalStars, setTotalStars] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const currentLevel = LEVELS[level];

  // Load progress on mount
  useEffect(() => {
    loadProgress();
  }, []);

  async function loadProgress() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: progress } = await supabase
      .from("game_progress")
      .select("level, stars")
      .eq("user_id", user.id)
      .eq("game_slug", "pixel-pet-coder");

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
    if (!user) return;

    await supabase
      .from("game_progress")
      .upsert({
        user_id: user.id,
        game_slug: "pixel-pet-coder",
        level: levelNum,
        stars: starsEarned,
        completed_at: new Date().toISOString(),
      }, { onConflict: "user_id,game_slug,level" });

    setBestStars(prev => ({ ...prev, [levelNum]: Math.max(prev[levelNum] || 0, starsEarned) }));
    setTotalStars(prev => prev + (starsEarned - (bestStars[levelNum] || 0)));
  }

  // Generate maze
  useEffect(() => {
    generateMaze();
  }, [level]);

  function generateMaze() {
    const size = currentLevel.gridSize;
    const newMaze: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));
    
    // Set walls (simple pattern - outer walls + some internal walls)
    for (let i = 0; i < size; i++) {
      newMaze[0][i] = true;
      newMaze[size - 1][i] = true;
      newMaze[i][0] = true;
      newMaze[i][size - 1] = true;
    }
    
    // Add some internal walls (avoid blocking too much)
    for (let i = 2; i < size - 2; i += 2) {
      for (let j = 2; j < size - 2; j += 2) {
        if (Math.random() > 0.5) {
          newMaze[i][j] = true;
        }
      }
    }
    
    setMaze(newMaze);
    
    // Set pet start position
    setPetPos({ x: 1, y: 1 });
    
    // Place paw prints
    const prints: { x: number; y: number }[] = [];
    let attempts = 0;
    while (prints.length < currentLevel.pawPrints && attempts < 100) {
      const x = Math.floor(Math.random() * (size - 2)) + 1;
      const y = Math.floor(Math.random() * (size - 2)) + 1;
      if (!newMaze[y][x] && !(x === 1 && y === 1) && !prints.find(p => p.x === x && p.y === y)) {
        prints.push({ x, y });
      }
      attempts++;
    }
    setPawPrints(prints);
    setCollected(new Set());
    
    // Place door at opposite corner
    setDoorPos({ x: size - 2, y: size - 2 });
    
    // Reset state
    setBlocks([]);
    setIsRunning(false);
    setIsComplete(false);
    setStars(0);
    setTimeLeft(currentLevel.timeLimit);
  }

  // Timer
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, timeLeft]);

  // Check completion
  useEffect(() => {
    if (collected.size === currentLevel.pawPrints && petPos.x === doorPos.x && petPos.y === doorPos.y) {
      setIsRunning(false);
      setIsComplete(true);
      clearInterval(timerRef.current);
      
      // Calculate stars
      const timeUsed = currentLevel.timeLimit - timeLeft;
      let earnedStars = 1;
      if (timeUsed <= currentLevel.timeLimit * 0.3) earnedStars = 3;
      else if (timeUsed <= currentLevel.timeLimit * 0.6) earnedStars = 2;
      setStars(earnedStars);
      saveProgress(level, earnedStars);
    }
  }, [collected, petPos, doorPos, currentLevel, timeLeft, level]);

  function addBlock(direction: Direction) {
    if (isRunning || isComplete) return;
    const newBlock: Block = { id: Date.now().toString(), direction };
    setBlocks([...blocks, newBlock]);
  }

  function removeBlock(id: string) {
    if (isRunning || isComplete) return;
    setBlocks(blocks.filter(b => b.id !== id));
  }

  async function runCode() {
    if (blocks.length === 0 || isRunning || isComplete) return;

    setIsRunning(true);
    setTimeLeft(currentLevel.timeLimit);

    // Reset pet to starting position
    const startPos = { x: 1, y: 1 };
    setPetPos(startPos);
    setCollected(new Set());

    let currentPos = { ...startPos };
    const localCollected = new Set<string>();

    for (const block of blocks) {
      await new Promise(resolve => setTimeout(resolve, 500));

      let newPos = { ...currentPos };
      switch (block.direction) {
        case "up": newPos.y -= 1; break;
        case "down": newPos.y += 1; break;
        case "left": newPos.x -= 1; break;
        case "right": newPos.x += 1; break;
      }

      // Check wall collision
      if (maze[newPos.y]?.[newPos.x] === false) {
        currentPos = newPos;
        setPetPos(currentPos);

        // Check paw print collection
        const printIndex = pawPrints.findIndex(p => p.x === currentPos.x && p.y === currentPos.y);
        if (printIndex !== -1 && !localCollected.has(`${currentPos.x},${currentPos.y}`)) {
          localCollected.add(`${currentPos.x},${currentPos.y}`);
          setCollected(new Set(localCollected));
          setShowBounce(true);
          setTimeout(() => setShowBounce(false), 300);
        }
      } else {
        // Hit wall - stop execution
        setShowWag(true);
        setTimeout(() => setShowWag(false), 500);
        break;
      }
    }

    setIsRunning(false);
  }

  function clearBlocks() {
    if (isRunning || isComplete) return;
    setBlocks([]);
  }

  function resetLevel() {
    generateMaze();
  }

  function nextLevel() {
    if (level < LEVELS.length - 1) {
      setLevel(level + 1);
    }
  }

  const CELL_SIZE = 40;

  return (
    <div className="min-h-dvh" style={{ background: "linear-gradient(135deg, #fef3c7 0%, #fce7f3 50%, #dbeafe 100%)" }}>
      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold" style={{ color: "#7c3aed" }}>🎮 How to Play</h2>
              <button
                onClick={() => setShowTutorial(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100"
              >
                <X className="h-6 w-6" style={{ color: "#6b7280" }} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "#fef3c7" }}>
                  <Target className="h-6 w-6" style={{ color: "#92400e" }} />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1" style={{ color: "#374151" }}>Your Goal</h3>
                  <p className="text-sm" style={{ color: "#6b7280" }}>Collect all paw prints 🐾 to unlock the door 🚪 and reach it before time runs out!</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "#dbeafe" }}>
                  <Lightbulb className="h-6 w-6" style={{ color: "#1e40af" }} />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1" style={{ color: "#374151" }}>How to Move</h3>
                  <p className="text-sm mb-2" style={{ color: "#6b7280" }}>Click the arrow buttons to add movement blocks to your program:</p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-lg text-sm font-bold" style={{ background: "#fef3c7", color: "#92400e" }}>⬆️ Up</span>
                    <span className="px-3 py-1 rounded-lg text-sm font-bold" style={{ background: "#dbeafe", color: "#1e40af" }}>⬇️ Down</span>
                    <span className="px-3 py-1 rounded-lg text-sm font-bold" style={{ background: "#fce7f3", color: "#9d174d" }}>⬅️ Left</span>
                    <span className="px-3 py-1 rounded-lg text-sm font-bold" style={{ background: "#d1fae5", color: "#065f46" }}>➡️ Right</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "#d1fae5" }}>
                  <Play className="h-6 w-6" style={{ color: "#065f46" }} />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1" style={{ color: "#374151" }}>Run Your Code</h3>
                  <p className="text-sm" style={{ color: "#6b7280" }}>Press "Run Code" to watch your pet follow your instructions. If you hit a wall, the pet stops!</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "#fce7f3" }}>
                  <Trophy className="h-6 w-6" style={{ color: "#9d174d" }} />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1" style={{ color: "#374151" }}>Earn Stars</h3>
                  <p className="text-sm" style={{ color: "#6b7280" }}>Complete levels quickly to earn more stars! ⭐⭐⭐ Your progress is saved automatically.</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowTutorial(false)}
              className="w-full mt-8 h-14 rounded-xl font-bold text-lg"
              style={{ background: "#7c3aed", color: "white" }}
            >
              Let's Play! 🚀
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)" }}>
        <div className="flex items-center gap-3">
          <Link to="/portal" className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: "#f0abfc", color: "#86198f" }}>
            <ArrowLeft className="h-5 w-5" />
            <span className="font-semibold">Back</span>
          </Link>
          <button
            onClick={() => setShowTutorial(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "#e0e7ff", color: "#4338ca" }}
          >
            <Info className="h-4 w-4" />
            Help
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-xs font-semibold" style={{ color: "#6b7280" }}>Level</p>
            <p className="text-xl font-bold" style={{ color: "#7c3aed" }}>{level + 1}/3</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold" style={{ color: "#6b7280" }}>Paw Prints</p>
            <p className="text-xl font-bold" style={{ color: "#ec4899" }}>{collected.size}/{currentLevel.pawPrints}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold" style={{ color: "#6b7280" }}>Time</p>
            <p className="text-xl font-bold" style={{ color: timeLeft < 10 ? "#ef4444" : "#10b981" }}>{timeLeft}s</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold" style={{ color: "#6b7280" }}>Stars</p>
            <p className="text-xl font-bold" style={{ color: "#fbbf24" }}>{totalStars}</p>
          </div>
        </div>
        
        <button
          onClick={resetLevel}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold"
          style={{ background: "#fcd34d", color: "#92400e" }}
        >
          <RotateCcw className="h-5 w-5" />
          Restart
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Maze */}
        <div className="flex-1 flex flex-col items-center">
          <div 
            className="rounded-2xl p-4 relative"
            style={{ 
              background: "white",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            }}
          >
            <svg 
              width={currentLevel.gridSize * CELL_SIZE} 
              height={currentLevel.gridSize * CELL_SIZE}
              style={{ background: "#fef9c3" }}
            >
              {/* Grid */}
              {maze.map((row, y) => row.map((cell, x) => (
                <rect
                  key={`${x}-${y}`}
                  x={x * CELL_SIZE}
                  y={y * CELL_SIZE}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill={cell ? "#94a3b8" : "#fef9c3"}
                  stroke="#fde047"
                  strokeWidth="1"
                />
              )))}
              
              {/* Paw prints */}
              {pawPrints.map((print, i) => {
                const isCollected = collected.has(`${print.x},${print.y}`);
                return (
                  <text
                    key={i}
                    x={print.x * CELL_SIZE + CELL_SIZE / 2}
                    y={print.y * CELL_SIZE + CELL_SIZE / 2 + 12}
                    textAnchor="middle"
                    fontSize={24}
                    opacity={isCollected ? 0.3 : 1}
                  >
                    🐾
                  </text>
                );
              })}
              
              {/* Door */}
              <rect
                x={doorPos.x * CELL_SIZE + 4}
                y={doorPos.y * CELL_SIZE + 4}
                width={CELL_SIZE - 8}
                height={CELL_SIZE - 8}
                fill={collected.size === currentLevel.pawPrints ? "#22c55e" : "#9ca3af"}
                rx={4}
              />
              <text
                x={doorPos.x * CELL_SIZE + CELL_SIZE / 2}
                y={doorPos.y * CELL_SIZE + CELL_SIZE / 2 + 12}
                textAnchor="middle"
                fontSize={20}
              >
                🚪
              </text>
              
              {/* Pet */}
              <g
                transform={`translate(${petPos.x * CELL_SIZE + CELL_SIZE / 2}, ${petPos.y * CELL_SIZE + CELL_SIZE / 2})`}
                style={{
                  animation: showBounce ? "bounce 0.3s ease-in-out" : "none",
                  transformOrigin: "center",
                }}
              >
                <text
                  fontSize={32}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    animation: showWag ? "wag 0.5s ease-in-out" : "none",
                    transformOrigin: "center",
                  }}
                >
                  🐕
                </text>
              </g>
            </svg>
          </div>
          
          {/* Completion modal */}
          {isComplete && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
              <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                <h2 className="text-3xl font-bold mb-4" style={{ color: "#7c3aed" }}>🎉 Great Job!</h2>
                <div className="flex justify-center gap-2 mb-6">
                  {[1, 2, 3].map(star => (
                    <Star
                      key={star}
                      className={`h-10 w-10 ${star <= stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                    />
                  ))}
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={resetLevel}
                    className="px-6 py-3 rounded-xl font-semibold"
                    style={{ background: "#fcd34d", color: "#92400e" }}
                  >
                    Play Again
                  </button>
                  {level < LEVELS.length - 1 && (
                    <button
                      onClick={nextLevel}
                      className="px-6 py-3 rounded-xl font-semibold"
                      style={{ background: "#7c3aed", color: "white" }}
                    >
                      Next Level →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Block coding interface */}
        <div className="w-80 flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-4" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
            <h3 className="font-bold text-lg mb-4" style={{ color: "#374151" }}>🧩 Code Blocks</h3>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => addBlock("up")}
                disabled={isRunning || isComplete}
                className="h-16 rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-lg transition hover:scale-105 disabled:opacity-50"
                style={{ background: "#fef3c7", color: "#92400e" }}
              >
                ⬆️ Up
              </button>
              <button
                onClick={() => addBlock("down")}
                disabled={isRunning || isComplete}
                className="h-16 rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-lg transition hover:scale-105 disabled:opacity-50"
                style={{ background: "#dbeafe", color: "#1e40af" }}
              >
                ⬇️ Down
              </button>
              <button
                onClick={() => addBlock("left")}
                disabled={isRunning || isComplete}
                className="h-16 rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-lg transition hover:scale-105 disabled:opacity-50"
                style={{ background: "#fce7f3", color: "#9d174d" }}
              >
                ⬅️ Left
              </button>
              <button
                onClick={() => addBlock("right")}
                disabled={isRunning || isComplete}
                className="h-16 rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-lg transition hover:scale-105 disabled:opacity-50"
                style={{ background: "#d1fae5", color: "#065f46" }}
              >
                ➡️ Right
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 flex-1" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
            <h3 className="font-bold text-lg mb-4" style={{ color: "#374151" }}>📋 Your Program</h3>
            
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {blocks.length === 0 ? (
                <p className="text-center text-sm py-8" style={{ color: "#9ca3af" }}>
                  Add blocks to build your program!
                </p>
              ) : (
                blocks.map((block, index) => (
                  <div
                    key={block.id}
                    className="flex items-center gap-2 p-3 rounded-xl"
                    style={{
                      background: {
                        up: "#fef3c7",
                        down: "#dbeafe",
                        left: "#fce7f3",
                        right: "#d1fae5",
                      }[block.direction],
                    }}
                  >
                    <span className="text-2xl">
                      {block.direction === "up" && "⬆️"}
                      {block.direction === "down" && "⬇️"}
                      {block.direction === "left" && "⬅️"}
                      {block.direction === "right" && "➡️"}
                    </span>
                    <span className="font-semibold capitalize flex-1" style={{ color: "#374151" }}>
                      {block.direction}
                    </span>
                    <button
                      onClick={() => removeBlock(block.id)}
                      disabled={isRunning || isComplete}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-100 disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={clearBlocks}
                disabled={blocks.length === 0 || isRunning || isComplete}
                className="flex-1 h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition hover:scale-105 disabled:opacity-50"
                style={{ background: "#f87171", color: "white" }}
              >
                Clear
              </button>
              <button
                onClick={runCode}
                disabled={blocks.length === 0 || isRunning || isComplete}
                className="flex-1 h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition hover:scale-105 disabled:opacity-50"
                style={{ background: "#7c3aed", color: "white" }}
              >
                <Play className="h-6 w-6" />
                {isRunning ? "Running..." : "Run"}
              </button>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes wag {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          75% { transform: rotate(15deg); }
        }
      `}</style>
    </div>
  );
}
