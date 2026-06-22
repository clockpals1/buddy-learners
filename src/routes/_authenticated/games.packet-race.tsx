import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Play, Star, X, Heart, Trophy, RotateCcw, Wifi, Router, Server, Laptop, Smartphone, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/games/packet-race")({
  head: () => ({ meta: [{ title: "Network Builder · Leafva Academy" }] }),
  component: NetworkBuilder,
  validateSearch: (search: Record<string, unknown>) => ({
    childId: search.childId as string | undefined,
  }),
});

type Device = {
  id: string;
  type: "computer" | "router" | "server" | "phone";
  x: number;
  y: number;
  connected: boolean;
};

type Connection = {
  id: string;
  from: string;
  to: string;
  active: boolean;
};

type Packet = {
  id: string;
  x: number;
  y: number;
  targetId: string;
  path: string[];
  progress: number;
};

const WORLDS = [
  { 
    name: "Home Network", 
    color: "#3B82F6", 
    description: "Connect your home devices to the internet!",
    emoji: "🏠",
    targetDevices: 3,
    tutorial: "Drag devices from the toolbox and connect them with cables to build your home network."
  },
  { 
    name: "School Network", 
    color: "#10B981", 
    description: "Build a network for your school classroom!",
    emoji: "🏫",
    targetDevices: 5,
    tutorial: "Use routers to connect multiple groups of computers together."
  },
  { 
    name: "City Network", 
    color: "#F59E0B", 
    description: "Connect buildings across the city!",
    emoji: "🏙️",
    targetDevices: 7,
    tutorial: "Servers store data - connect them to share information across the network."
  },
  { 
    name: "Internet Backbone", 
    color: "#8B5CF6", 
    description: "Build the global internet infrastructure!",
    emoji: "🌐",
    targetDevices: 10,
    tutorial: "Connect multiple servers and routers to create a fast, reliable network."
  },
];

const DEVICE_TYPES = [
  { type: "computer" as const, name: "Computer", icon: Laptop, color: "#3B82F6" },
  { type: "router" as const, name: "Router", icon: Router, color: "#10B981" },
  { type: "server" as const, name: "Server", icon: Server, color: "#F59E0B" },
  { type: "phone" as const, name: "Phone", icon: Smartphone, color: "#EC4899" },
];

function NetworkBuilder() {
  const { childId } = useSearch({ from: "/_authenticated/games/packet-race" });
  const [world, setWorld] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [devices, setDevices] = useState<Device[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(true);
  const [totalStars, setTotalStars] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ name: string; score: number; child_id: string }[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [packetsDelivered, setPacketsDelivered] = useState(0);

  const gameRef = useRef<HTMLDivElement>(null);

  const currentWorld = WORLDS[world];
  const targetDevices = currentWorld.targetDevices;

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
      let total = 0;
      progress.forEach((p) => total += p.stars);
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

  function addDevice(type: Device["type"], x: number, y: number) {
    const newDevice: Device = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x,
      y,
      connected: false,
    };
    setDevices(prev => [...prev, newDevice]);
    setScore(prev => prev + 10);
  }

  function removeDevice(id: string) {
    setDevices(prev => prev.filter(d => d.id !== id));
    setConnections(prev => prev.filter(c => c.from !== id && c.to !== id));
  }

  function addConnection(from: string, to: string) {
    if (from === to) return;
    const exists = connections.some(c => 
      (c.from === from && c.to === to) || (c.from === to && c.to === from)
    );
    if (exists) return;

    const newConnection: Connection = {
      id: Math.random().toString(36).substr(2, 9),
      from,
      to,
      active: true,
    };
    setConnections(prev => [...prev, newConnection]);
    setScore(prev => prev + 15);
    
    // Mark devices as connected
    setDevices(prev => prev.map(d => 
      (d.id === from || d.id === to) ? { ...d, connected: true } : d
    ));
  }

  function removeConnection(id: string) {
    setConnections(prev => prev.filter(c => c.id !== id));
  }

  function sendPacket(fromId: string, toId: string) {
    // Find path using BFS
    const path = findPath(fromId, toId);
    if (!path || path.length === 0) return;

    const newPacket: Packet = {
      id: Math.random().toString(36).substr(2, 9),
      x: devices.find(d => d.id === fromId)?.x || 0,
      y: devices.find(d => d.id === fromId)?.y || 0,
      targetId: toId,
      path,
      progress: 0,
    };
    setPackets(prev => [...prev, newPacket]);
  }

  function findPath(from: string, to: string): string[] {
    const queue: { node: string; path: string[] }[] = [{ node: from, path: [from] }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      
      if (node === to) return path;
      if (visited.has(node)) continue;
      visited.add(node);

      const neighbors = connections
        .filter(c => c.from === node || c.to === node)
        .map(c => c.from === node ? c.to : c.from);

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({ node: neighbor, path: [...path, neighbor] });
        }
      }
    }

    return [];
  }

  function startGame() {
    setIsPlaying(true);
    setIsPaused(false);
    setScore(0);
    setLives(3);
    setDevices([]);
    setConnections([]);
    setPackets([]);
    setPacketsDelivered(0);
    setGameOver(false);
    setVictory(false);
    
    // Add initial server
    addDevice("server", 100, 250);
  }

  function pauseGame() {
    setIsPaused(true);
  }

  function resumeGame() {
    setIsPaused(false);
  }

  function endGame() {
    setIsPlaying(false);
    setIsPaused(false);

    const stars = score >= 100 ? 3 : score >= 50 ? 2 : score >= 20 ? 1 : 0;
    if (stars > 0) {
      saveProgress(world, stars);
    }
  }

  // Check victory condition
  useEffect(() => {
    if (isPlaying && !isPaused) {
      const connectedDevices = devices.filter(d => d.connected).length;
      if (connectedDevices >= targetDevices && packetsDelivered >= 5) {
        setVictory(true);
        setGameOver(true);
        setIsPlaying(false);
      }
    }
  }, [devices, packetsDelivered, isPlaying, isPaused, targetDevices]);

  // Animate packets
  useEffect(() => {
    if (!isPlaying || isPaused) return;

    const interval = setInterval(() => {
      setPackets(prev => {
        const updated = prev.map(packet => {
          if (packet.progress >= packet.path.length - 1) {
            // Packet delivered
            setPacketsDelivered(p => p + 1);
            setScore(s => s + 20);
            return null;
          }

          const nextNodeId = packet.path[packet.progress + 1];
          const nextDevice = devices.find(d => d.id === nextNodeId);
          if (!nextDevice) return packet;

          return {
            ...packet,
            x: packet.x + (nextDevice.x - packet.x) * 0.1,
            y: packet.y + (nextDevice.y - packet.y) * 0.1,
            progress: packet.progress + 0.1,
          };
        }).filter(p => p !== null) as Packet[];

        return updated;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, isPaused, devices]);

  // Auto-send packets between connected devices
  useEffect(() => {
    if (!isPlaying || isPaused || connections.length === 0) return;

    const interval = setInterval(() => {
      if (connections.length > 0 && devices.length > 1) {
        const randomConnection = connections[Math.floor(Math.random() * connections.length)];
        sendPacket(randomConnection.from, randomConnection.to);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isPlaying, isPaused, connections, devices]);

  return (
    <div className="min-h-dvh bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur z-50">
          <div className="bg-white rounded-3xl p-8 max-w-lg mx-4 text-center shadow-2xl">
            <div className="text-6xl mb-4">🌐✨</div>
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Network Builder!
            </h2>
            <div className="space-y-4 text-gray-700 text-left">
              <p className="text-lg font-semibold">Build your own computer network!</p>
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <p><strong>🎮 How to Play:</strong></p>
                <p>• Click a device type in the toolbox</p>
                <p>• Click on the game area to place it</p>
                <p>• Click two devices to connect them with a cable</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 space-y-2">
                <p><strong>🎯 Goal:</strong></p>
                <p>• Connect {targetDevices} devices</p>
                <p>• Deliver 5 data packets</p>
                <p>• Watch data flow through your network!</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4 space-y-2">
                <p><strong>💡 Learn:</strong></p>
                <p>• Routers connect different networks</p>
                <p>• Servers store and share data</p>
                <p>• Data travels through connections</p>
              </div>
            </div>
            <button
              onClick={() => setShowTutorial(false)}
              className="w-full mt-6 py-4 rounded-xl font-bold text-white text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-105 transition shadow-lg"
            >
              Let's Build! 🚀
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
              {victory ? "Network Complete!" : "Try Again!"}
            </h2>
            <div className="text-5xl mb-4">
              {victory ? (score >= 100 ? "⭐⭐⭐" : score >= 50 ? "⭐⭐" : "⭐") : "😢"}
            </div>
            <div className="space-y-2 mb-6">
              <p className="text-2xl font-bold text-purple-600">Score: {score}</p>
              <p className="text-lg text-gray-600">Devices: {devices.length}</p>
              <p className="text-lg text-gray-600">Packets: {packetsDelivered}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setLives(3); startGame(); }}
                className="flex-1 py-3 rounded-xl font-bold text-white transition hover:scale-105 shadow-lg"
                style={{ background: currentWorld.color }}
              >
                <RotateCcw className="inline mr-2 h-5 w-5" /> Build Again
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
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
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

      <div className="mx-auto max-w-6xl px-6 py-8">
        {!isPlaying && !gameOver && (
          <div className="text-center">
            <div className="text-8xl mb-4">{currentWorld.emoji}</div>
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">Network Builder</h1>
            <p className="text-purple-200 mb-6 text-lg">{currentWorld.description}</p>

            {/* World Selector */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-4">Select World</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
              <Play className="h-8 w-8" /> Start Building!
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
                  <div className="text-2xl font-bold">{devices.length}/{targetDevices}</div>
                  <div className="text-xs text-purple-200">Devices</div>
                </div>
                <div className="text-white">
                  <div className="text-2xl font-bold">{packetsDelivered}/5</div>
                  <div className="text-xs text-purple-200">Packets</div>
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
              <button
                onClick={isPaused ? resumeGame : pauseGame}
                className="px-4 py-2 rounded-lg bg-white/20 text-white font-bold hover:bg-white/30 transition"
              >
                {isPaused ? "▶️" : "⏸️"}
              </button>
            </div>

            <div className="flex gap-4">
              {/* Device Toolbox */}
              <div className="w-48 bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20">
                <h3 className="text-white font-bold mb-4">Devices</h3>
                <div className="space-y-2">
                  {DEVICE_TYPES.map((dt) => (
                    <button
                      key={dt.type}
                      onClick={() => setSelectedDevice({ id: "", type: dt.type, x: 0, y: 0, connected: false })}
                      className={`w-full p-3 rounded-xl flex items-center gap-2 transition ${
                        selectedDevice?.type === dt.type ? "ring-2 ring-white" : "hover:bg-white/10"
                      }`}
                      style={{ background: dt.color + "30" }}
                    >
                      <dt.icon className="h-5 w-5" style={{ color: dt.color }} />
                      <span className="text-white text-sm font-semibold">{dt.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Area */}
              <div
                ref={gameRef}
                className="flex-1 rounded-2xl overflow-hidden border-4 border-white/30 shadow-2xl relative"
                style={{ height: "500px", background: "linear-gradient(180deg, #1a1a2e 0%, #0f3460 100%" }}
                onClick={(e) => {
                  if (!selectedDevice) return;
                  const rect = gameRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  addDevice(selectedDevice.type, x, y);
                  setSelectedDevice(null);
                }}
              >
                {/* Connections */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {connections.map((conn) => {
                    const fromDevice = devices.find(d => d.id === conn.from);
                    const toDevice = devices.find(d => d.id === conn.to);
                    if (!fromDevice || !toDevice) return null;
                    return (
                      <line
                        key={conn.id}
                        x1={fromDevice.x}
                        y1={fromDevice.y}
                        x2={toDevice.x}
                        y2={toDevice.y}
                        stroke={conn.active ? "#10B981" : "#6B7280"}
                        strokeWidth="3"
                        strokeDasharray={conn.active ? "0" : "5,5"}
                      />
                    );
                  })}
                </svg>

                {/* Devices */}
                {devices.map((device) => {
                  const deviceType = DEVICE_TYPES.find(dt => dt.type === device.type);
                  const Icon = deviceType?.icon || Laptop;
                  return (
                    <div
                      key={device.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (connectingFrom === null) {
                          setConnectingFrom(device.id);
                        } else if (connectingFrom === device.id) {
                          setConnectingFrom(null);
                        } else {
                          addConnection(connectingFrom, device.id);
                          setConnectingFrom(null);
                        }
                      }}
                      className={`absolute w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition ${
                        connectingFrom === device.id ? "ring-4 ring-yellow-400" : "hover:scale-110"
                      } ${device.connected ? "bg-green-500/30" : "bg-gray-500/30"}`}
                      style={{
                        left: device.x,
                        top: device.y,
                        transform: "translate(-50%, -50%)",
                        background: deviceType?.color + "30",
                        border: `2px solid ${deviceType?.color}`,
                      }}
                    >
                      <Icon className="h-6 w-6" style={{ color: deviceType?.color }} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDevice(device.id);
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}

                {/* Packets */}
                {packets.map((packet) => (
                  <div
                    key={packet.id}
                    className="absolute w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-xs"
                    style={{
                      left: packet.x,
                      top: packet.y,
                      transform: "translate(-50%, -50%)",
                      boxShadow: "0 0 10px #F59E0B",
                    }}
                  >
                    📦
                  </div>
                ))}

                {/* Connecting indicator */}
                {connectingFrom && (
                  <div className="absolute bottom-4 left-4 bg-yellow-500 text-white px-3 py-1 rounded-lg text-sm">
                    Select another device to connect
                  </div>
                )}

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
            </div>

            {/* Instructions */}
            <div className="mt-4 text-center text-white/60 text-sm">
              Click device type → Click to place → Click two devices to connect • Watch data flow!
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
