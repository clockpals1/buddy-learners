import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Trophy, X, Star, Shield, Lock, Wifi, Eye, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/games/security-sentinel")({
  head: () => ({ meta: [{ title: "Security Sentinel · Leafva Academy" }] }),
  component: SecuritySentinel,
  validateSearch: (search: Record<string, unknown>) => ({
    childId: search.childId as string | undefined,
  }),
});

type MissionType = "password" | "phishing" | "firewall" | "encryption" | "wifi";
type MissionStatus = "locked" | "available" | "completed";

type Mission = {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  emoji: string;
  xpReward: number;
  status: MissionStatus;
  world: number;
};

type PhishingEmail = {
  from: string;
  subject: string;
  body: string;
  isPhishing: boolean;
  clue: string;
};

type FirewallRule = {
  source: string;
  label: string;
  dangerous: boolean;
  emoji: string;
};

const MISSIONS: Mission[] = [
  { id: "pw1", type: "password", title: "Password Lab 1", description: "Build an unbreakable password!", emoji: "🔐", xpReward: 100, status: "available", world: 1 },
  { id: "ph1", type: "phishing", title: "Phishing Detective", description: "Spot fake emails before clicking!", emoji: "🎣", xpReward: 150, status: "available", world: 1 },
  { id: "fw1", type: "firewall", title: "Firewall Builder", description: "Block dangerous connections!", emoji: "🛡️", xpReward: 200, status: "available", world: 1 },
  { id: "en1", type: "encryption", title: "Encryption Escape", description: "Decode secret messages!", emoji: "🔒", xpReward: 175, status: "available", world: 2 },
  { id: "wi1", type: "wifi", title: "WiFi Security", description: "Secure your network!", emoji: "📡", xpReward: 150, status: "available", world: 2 },
  { id: "pw2", type: "password", title: "Password Lab 2", description: "Advanced password tricks!", emoji: "💪", xpReward: 200, status: "available", world: 2 },
  { id: "ph2", type: "phishing", title: "Phishing Expert", description: "Harder fake emails!", emoji: "🕵️", xpReward: 250, status: "available", world: 3 },
  { id: "fw2", type: "firewall", title: "Network Defense", description: "Protect a whole city network!", emoji: "🌐", xpReward: 300, status: "available", world: 3 },
];

const PHISHING_EMAILS: PhishingEmail[] = [
  { from: "support@amaz0n-security.com", subject: "⚠️ Your account will be deleted!", body: "Click here NOW to verify your account or it will be permanently deleted in 24 hours! Enter your password immediately.", isPhishing: true, clue: "Fake domain: 'amaz0n' uses zero instead of 'o'" },
  { from: "teacher@school.edu", subject: "Homework assignment due Friday", body: "Hi class! Please submit your project by Friday. Let me know if you have questions.", isPhishing: false, clue: "Legitimate school email with normal subject" },
  { from: "noreply@paypa1.com", subject: "You won $1,000,000!", body: "Congratulations! You've been selected as our lucky winner! Click to claim your prize now!", isPhishing: true, clue: "Too good to be true + fake domain 'paypa1'" },
  { from: "friend@gmail.com", subject: "Check this out!", body: "Hey! I found something amazing, click this link: http://totally-not-a-virus.ru/download", isPhishing: true, clue: "Suspicious link with .ru domain and urgent tone" },
  { from: "newsletter@nationalgeographic.com", subject: "This week in science", body: "Discover the latest discoveries from space, ocean depths, and wildlife in this week's newsletter!", isPhishing: false, clue: "Legitimate newsletter from real domain" },
];

const FIREWALL_RULES: FirewallRule[] = [
  { source: "Update from microsoft.com", label: "Windows Update", dangerous: false, emoji: "✅" },
  { source: "Download from free-hacks.ru", label: "Unknown file", dangerous: true, emoji: "⚠️" },
  { source: "Message from WhatsApp", label: "Friend message", dangerous: false, emoji: "✅" },
  { source: "Executable from unknown-site.xyz", label: "Suspicious program", dangerous: true, emoji: "⚠️" },
  { source: "Video from youtube.com", label: "YouTube video", dangerous: false, emoji: "✅" },
  { source: "Popup from casino-win-money.net", label: "Pop-up ad", dangerous: true, emoji: "⚠️" },
];

const PASSWORD_RULES = [
  { rule: "At least 8 characters", check: (p: string) => p.length >= 8, icon: "📏" },
  { rule: "Has uppercase letters (A-Z)", check: (p: string) => /[A-Z]/.test(p), icon: "⬆️" },
  { rule: "Has numbers (0-9)", check: (p: string) => /[0-9]/.test(p), icon: "🔢" },
  { rule: "Has symbols (!@#$)", check: (p: string) => /[!@#$%^&*]/.test(p), icon: "✨" },
  { rule: "Not a common word", check: (p: string) => !["password", "123456", "qwerty"].includes(p.toLowerCase()), icon: "🚫" },
];

const ENCRYPTION_PAIRS = [
  { plain: "HELLO", cipher: "IFMMP", shift: 1 },
  { plain: "CAT", cipher: "FDW", shift: 3 },
  { plain: "DOG", cipher: "GRJ", shift: 3 },
  { plain: "SAFE", cipher: "VDIH", shift: 3 },
];

const WIFI_OPTIONS = [
  { name: "MyHomeWiFi_Protected", secured: true, strength: 3, desc: "WPA3 encrypted" },
  { name: "FREE_PUBLIC_WIFI", secured: false, strength: 2, desc: "No password" },
  { name: "CoffeeShop_Open", secured: false, strength: 3, desc: "Open network" },
  { name: "SchoolNetwork_Secure", secured: true, strength: 2, desc: "WPA2 encrypted" },
];

function SecuritySentinel() {
  const { childId } = useSearch({ from: "/_authenticated/games/security-sentinel" });
  const [screen, setScreen] = useState<"menu" | "mission" | "complete">("menu");
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [badges, setBadges] = useState<string[]>([]);
  const [completedMissions, setCompletedMissions] = useState<Set<string>>(new Set());
  const [totalStars, setTotalStars] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ name: string; score: number }[]>([]);
  const [missionResult, setMissionResult] = useState<{ success: boolean; msg: string; xpGained: number } | null>(null);

  // Password mission state
  const [password, setPassword] = useState("");
  // Phishing mission state
  const [emailIdx, setEmailIdx] = useState(0);
  const [phishingScore, setPhishingScore] = useState(0);
  const [emailAnswered, setEmailAnswered] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null);
  // Firewall mission state
  const [firewallIdx, setFirewallIdx] = useState(0);
  const [firewallScore, setFirewallScore] = useState(0);
  const [firewallAnswered, setFirewallAnswered] = useState(false);
  const [firewallFeedback, setFirewallFeedback] = useState<string | null>(null);
  // Encryption state
  const [encryptionIdx, setEncryptionIdx] = useState(0);
  const [encryptionInput, setEncryptionInput] = useState("");
  const [encryptionFeedback, setEncryptionFeedback] = useState<string | null>(null);
  // WiFi state
  const [wifiSelected, setWifiSelected] = useState<number | null>(null);
  const [wifiFeedback, setWifiFeedback] = useState<string | null>(null);

  useEffect(() => { loadProgress(); loadLeaderboard(); }, []);

  async function loadLeaderboard() {
    const { data: scores } = await (supabase as any)
      .from("game_progress").select("child_id, stars, children(display_name)")
      .eq("game_slug", "security-sentinel").order("stars", { ascending: false }).limit(10);
    if (scores) setLeaderboard(scores.map((s: any) => ({ name: s.children?.display_name || "Sentinel", score: s.stars })));
  }

  async function loadProgress() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !childId) return;
    const { data: progress } = await (supabase as any)
      .from("game_progress").select("stars, level").eq("user_id", user.id).eq("child_id", childId).eq("game_slug", "security-sentinel");
    if (progress) {
      const total = progress.reduce((t: number, p: any) => t + p.stars, 0);
      setTotalStars(total);
      setCompletedMissions(new Set(progress.map((p: any) => String(p.level))));
    }
  }

  async function saveProgress(missionId: string, starsEarned: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !childId) return;
    const levelNum = MISSIONS.findIndex(m => m.id === missionId);
    await (supabase as any).from("game_progress").upsert({
      user_id: user.id, child_id: childId, game_slug: "security-sentinel",
      level: levelNum, stars: starsEarned, completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,child_id,game_slug,level" });
    setTotalStars(prev => prev + starsEarned);
    setCompletedMissions(prev => new Set([...prev, missionId]));
    loadLeaderboard();
  }

  function startMission(mission: Mission) {
    setActiveMission(mission);
    setScreen("mission");
    setMissionResult(null);
    // reset sub-states
    setPassword("");
    setEmailIdx(0); setPhishingScore(0); setEmailAnswered(false); setEmailFeedback(null);
    setFirewallIdx(0); setFirewallScore(0); setFirewallAnswered(false); setFirewallFeedback(null);
    setEncryptionIdx(0); setEncryptionInput(""); setEncryptionFeedback(null);
    setWifiSelected(null); setWifiFeedback(null);
  }

  function completeMission(success: boolean, xpGained: number) {
    if (!activeMission) return;
    if (success) {
      const newXp = xp + xpGained;
      setXp(newXp);
      if (newXp >= level * 500) setLevel(l => l + 1);
      const stars = xpGained >= activeMission.xpReward ? 3 : xpGained >= activeMission.xpReward * 0.6 ? 2 : 1;
      saveProgress(activeMission.id, stars);
      if (!badges.includes(activeMission.type)) setBadges(b => [...b, activeMission.type]);
    }
    setMissionResult({ success, msg: success ? "Mission Complete! 🎉" : "Keep Training! 💪", xpGained });
  }

  // --- Password Mission ---
  const passwordStrength = PASSWORD_RULES.filter(r => r.check(password)).length;
  const passwordColor = passwordStrength <= 1 ? "#ef4444" : passwordStrength <= 3 ? "#f59e0b" : "#22c55e";
  const passwordLabel = passwordStrength <= 1 ? "Very Weak 😰" : passwordStrength <= 2 ? "Weak 😐" : passwordStrength <= 3 ? "OK 🙂" : passwordStrength <= 4 ? "Strong 💪" : "Unbreakable! 🚀";

  function submitPassword() {
    if (passwordStrength >= 4) {
      completeMission(true, activeMission!.xpReward);
    } else {
      completeMission(false, Math.floor(activeMission!.xpReward * passwordStrength / 5));
    }
  }

  // --- Phishing Mission ---
  const currentEmail = PHISHING_EMAILS[emailIdx];
  function answerPhishing(isPhishing: boolean) {
    if (emailAnswered) return;
    const correct = isPhishing === currentEmail.isPhishing;
    if (correct) setPhishingScore(s => s + 1);
    setEmailFeedback(correct ? `✅ Correct! ${currentEmail.clue}` : `❌ ${currentEmail.clue}`);
    setEmailAnswered(true);
  }
  function nextEmail() {
    if (emailIdx < PHISHING_EMAILS.length - 1) {
      setEmailIdx(i => i + 1); setEmailAnswered(false); setEmailFeedback(null);
    } else {
      const success = phishingScore >= 3;
      completeMission(success, Math.floor((phishingScore / PHISHING_EMAILS.length) * activeMission!.xpReward));
    }
  }

  // --- Firewall Mission ---
  const currentRule = FIREWALL_RULES[firewallIdx];
  function answerFirewall(block: boolean) {
    if (firewallAnswered) return;
    const correct = block === currentRule.dangerous;
    if (correct) setFirewallScore(s => s + 1);
    setFirewallFeedback(correct ? "✅ Great call! Network protected!" : "❌ Wrong choice! That was a threat!");
    setFirewallAnswered(true);
  }
  function nextFirewall() {
    if (firewallIdx < FIREWALL_RULES.length - 1) {
      setFirewallIdx(i => i + 1); setFirewallAnswered(false); setFirewallFeedback(null);
    } else {
      const success = firewallScore >= 4;
      completeMission(success, Math.floor((firewallScore / FIREWALL_RULES.length) * activeMission!.xpReward));
    }
  }

  // --- Encryption Mission ---
  const currentPair = ENCRYPTION_PAIRS[encryptionIdx];
  function checkEncryption() {
    if (encryptionInput.toUpperCase() === currentPair.cipher) {
      setEncryptionFeedback("✅ Encoded! Great cryptographer!");
      setTimeout(() => {
        if (encryptionIdx < ENCRYPTION_PAIRS.length - 1) {
          setEncryptionIdx(i => i + 1); setEncryptionInput(""); setEncryptionFeedback(null);
        } else {
          completeMission(true, activeMission!.xpReward);
        }
      }, 1500);
    } else {
      setEncryptionFeedback(`❌ Try again! Hint: Shift each letter by ${currentPair.shift}`);
    }
  }

  // --- WiFi Mission ---
  function selectWifi(idx: number) {
    setWifiSelected(idx);
    const selected = WIFI_OPTIONS[idx];
    if (selected.secured) {
      setWifiFeedback("✅ Smart choice! Encrypted networks keep you safe!");
      setTimeout(() => completeMission(true, activeMission!.xpReward), 2000);
    } else {
      setWifiFeedback("⚠️ Danger! Open WiFi can let hackers steal your data!");
      setTimeout(() => { setWifiSelected(null); setWifiFeedback(null); }, 2000);
    }
  }

  const badgeInfo: Record<string, { name: string; emoji: string }> = {
    password: { name: "Password Master", emoji: "🔐" },
    phishing: { name: "Phishing Detective", emoji: "🕵️" },
    firewall: { name: "Firewall Builder", emoji: "🛡️" },
    encryption: { name: "Crypto Expert", emoji: "🔒" },
    wifi: { name: "WiFi Guardian", emoji: "📡" },
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Animated background lines */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-10">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="absolute h-px bg-cyan-400" style={{ top: `${i * 12.5}%`, left: 0, right: 0, animation: `pulse ${2 + i * 0.3}s infinite` }} />
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/60 backdrop-blur border-b border-cyan-500/20">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/child/$childId" params={{ childId: childId || "" }} className="flex items-center gap-2 text-cyan-300 hover:opacity-80">
            <ArrowLeft className="h-5 w-5" /> Back
          </Link>
          <div className="flex items-center gap-3 text-sm font-bold">
            <span className="text-cyan-300">⚡ {xp} XP</span>
            <span className="text-yellow-300">Lv.{level}</span>
            <span className="text-white">⭐ {totalStars}</span>
            <button onClick={() => setShowLeaderboard(true)} className="text-yellow-400 hover:opacity-80">
              <Trophy className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 relative z-10">
        {/* MENU */}
        {screen === "menu" && (
          <>
            <div className="text-center mb-8">
              <div className="text-7xl mb-3 animate-pulse">🛡️</div>
              <h1 className="text-4xl font-bold text-white mb-2">Security Sentinel</h1>
              <p className="text-cyan-300 text-lg">Defend Cyber City from hackers!</p>
              <div className="inline-flex items-center gap-2 mt-2 px-4 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-sm">
                Level {level} Sentinel • {completedMissions.size}/{MISSIONS.length} Missions Complete
              </div>
            </div>

            {/* Badges */}
            {badges.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 mb-6">
                {badges.map(b => (
                  <div key={b} className="flex items-center gap-1 bg-white/10 rounded-full px-3 py-1 text-white text-sm border border-white/20">
                    <span>{badgeInfo[b]?.emoji}</span>
                    <span>{badgeInfo[b]?.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Mission Grid */}
            {[1, 2, 3].map(world => (
              <div key={world} className="mb-6">
                <h2 className="text-lg font-bold text-cyan-300 mb-3 flex items-center gap-2">
                  <span>🌆 World {world}</span>
                  <span className="text-white/40 text-sm">— {["Cyber City Basics", "Advanced Security", "Elite Defense"][world - 1]}</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {MISSIONS.filter(m => m.world === world).map(mission => {
                    const done = completedMissions.has(mission.id);
                    return (
                      <button key={mission.id} onClick={() => startMission(mission)}
                        className={`p-4 rounded-2xl text-left transition hover:scale-105 border ${done ? "border-cyan-400/50 bg-cyan-500/20" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                        <div className="text-3xl mb-2">{mission.emoji}</div>
                        <div className="text-white font-bold text-sm mb-1">{mission.title}</div>
                        <div className="text-white/50 text-xs mb-2">{mission.description}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-cyan-400 text-xs font-bold">+{mission.xpReward} XP</span>
                          {done && <CheckCircle className="h-4 w-4 text-cyan-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {/* MISSION */}
        {screen === "mission" && activeMission && (
          <div>
            <button onClick={() => setScreen("menu")} className="flex items-center gap-2 text-cyan-300 mb-6 hover:opacity-80">
              <ArrowLeft className="h-4 w-4" /> Mission Select
            </button>

            <div className="text-center mb-6">
              <div className="text-5xl mb-2">{activeMission.emoji}</div>
              <h2 className="text-2xl font-bold text-white">{activeMission.title}</h2>
              <p className="text-cyan-300">{activeMission.description}</p>
            </div>

            {/* Mission Result */}
            {missionResult && (
              <div className={`rounded-2xl p-6 text-center mb-4 ${missionResult.success ? "bg-green-500/20 border border-green-400/30" : "bg-orange-500/20 border border-orange-400/30"}`}>
                <div className="text-4xl mb-2">{missionResult.success ? "🎉" : "💪"}</div>
                <h3 className="text-2xl font-bold text-white mb-1">{missionResult.msg}</h3>
                <p className="text-cyan-300">+{missionResult.xpGained} XP earned</p>
                <button onClick={() => setScreen("menu")} className="mt-4 px-8 py-3 rounded-xl font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition">
                  Back to Missions
                </button>
              </div>
            )}

            {/* PASSWORD MISSION */}
            {activeMission.type === "password" && !missionResult && (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h3 className="text-white font-bold mb-4 text-lg">🔐 Build an Unbreakable Password!</h3>
                <p className="text-white/60 mb-4 text-sm">A strong password protects your accounts from hackers</p>
                <input type="text" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Type your password here..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white mb-4 focus:outline-none focus:border-cyan-400 text-lg" />
                <div className="h-3 rounded-full bg-white/10 mb-4 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(passwordStrength / 5) * 100}%`, background: passwordColor }} />
                </div>
                <p className="text-center font-bold mb-4" style={{ color: passwordColor }}>{passwordLabel}</p>
                <div className="space-y-2 mb-6">
                  {PASSWORD_RULES.map((rule, i) => (
                    <div key={i} className={`flex items-center gap-2 text-sm ${rule.check(password) ? "text-green-400" : "text-white/40"}`}>
                      <span>{rule.check(password) ? "✅" : "⬜"}</span>
                      <span>{rule.icon} {rule.rule}</span>
                    </div>
                  ))}
                </div>
                <button onClick={submitPassword} disabled={password.length < 3}
                  className="w-full py-3 rounded-xl font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition disabled:opacity-40">
                  Submit Password
                </button>
              </div>
            )}

            {/* PHISHING MISSION */}
            {activeMission.type === "phishing" && !missionResult && (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-bold text-lg">📧 Is this email REAL or FAKE?</h3>
                  <span className="text-cyan-300 text-sm">{emailIdx + 1}/{PHISHING_EMAILS.length}</span>
                </div>
                <div className="bg-white/10 rounded-xl p-4 mb-4 space-y-2">
                  <p className="text-white/60 text-xs">FROM: <span className="text-white font-mono">{currentEmail.from}</span></p>
                  <p className="text-white font-bold">{currentEmail.subject}</p>
                  <p className="text-white/70 text-sm border-t border-white/10 pt-2">{currentEmail.body}</p>
                </div>
                {emailFeedback && (
                  <div className={`p-3 rounded-xl mb-4 text-sm font-bold ${emailFeedback.startsWith("✅") ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                    {emailFeedback}
                  </div>
                )}
                {!emailAnswered ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => answerPhishing(false)} className="py-4 rounded-xl font-bold text-green-300 bg-green-500/20 border border-green-400/30 hover:bg-green-500/30 transition text-lg">
                      ✅ Real Email
                    </button>
                    <button onClick={() => answerPhishing(true)} className="py-4 rounded-xl font-bold text-red-300 bg-red-500/20 border border-red-400/30 hover:bg-red-500/30 transition text-lg">
                      🎣 Phishing!
                    </button>
                  </div>
                ) : (
                  <button onClick={nextEmail} className="w-full py-3 rounded-xl font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition">
                    {emailIdx < PHISHING_EMAILS.length - 1 ? "Next Email →" : "Finish Mission 🎉"}
                  </button>
                )}
              </div>
            )}

            {/* FIREWALL MISSION */}
            {activeMission.type === "firewall" && !missionResult && (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-bold text-lg">🛡️ Block or Allow?</h3>
                  <span className="text-cyan-300 text-sm">{firewallIdx + 1}/{FIREWALL_RULES.length} | Score: {firewallScore}</span>
                </div>
                <div className="bg-white/10 rounded-xl p-5 mb-4 text-center">
                  <div className="text-5xl mb-3">{currentRule.dangerous ? "⚠️" : "📦"}</div>
                  <p className="text-white font-bold text-lg mb-1">{currentRule.label}</p>
                  <p className="text-white/50 text-sm font-mono">{currentRule.source}</p>
                </div>
                {firewallFeedback && (
                  <div className={`p-3 rounded-xl mb-4 text-sm font-bold ${firewallFeedback.startsWith("✅") ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                    {firewallFeedback}
                  </div>
                )}
                {!firewallAnswered ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => answerFirewall(false)} className="py-4 rounded-xl font-bold text-green-300 bg-green-500/20 border border-green-400/30 hover:bg-green-500/30 transition text-lg">
                      ✅ Allow
                    </button>
                    <button onClick={() => answerFirewall(true)} className="py-4 rounded-xl font-bold text-red-300 bg-red-500/20 border border-red-400/30 hover:bg-red-500/30 transition text-lg">
                      🚫 Block!
                    </button>
                  </div>
                ) : (
                  <button onClick={nextFirewall} className="w-full py-3 rounded-xl font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition">
                    {firewallIdx < FIREWALL_RULES.length - 1 ? "Next Threat →" : "Finish Mission 🎉"}
                  </button>
                )}
              </div>
            )}

            {/* ENCRYPTION MISSION */}
            {activeMission.type === "encryption" && !missionResult && (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h3 className="text-white font-bold text-lg mb-2">🔒 Caesar Cipher!</h3>
                <p className="text-white/60 text-sm mb-4">Encode the message by shifting each letter by {currentPair.shift} steps (A→{String.fromCharCode(65 + currentPair.shift)}, B→{String.fromCharCode(66 + currentPair.shift)}...)</p>
                <div className="bg-white/10 rounded-xl p-5 text-center mb-4">
                  <p className="text-white/60 text-sm mb-2">Encode this message:</p>
                  <p className="text-4xl font-bold text-yellow-400 font-mono tracking-widest">{currentPair.plain}</p>
                </div>
                <input type="text" value={encryptionInput} onChange={e => setEncryptionInput(e.target.value.toUpperCase())}
                  placeholder="Type the encoded message..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white mb-3 focus:outline-none focus:border-cyan-400 text-xl tracking-widest font-mono uppercase" />
                {encryptionFeedback && (
                  <div className={`p-3 rounded-xl mb-3 text-sm font-bold ${encryptionFeedback.startsWith("✅") ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                    {encryptionFeedback}
                  </div>
                )}
                <button onClick={checkEncryption} disabled={!encryptionInput}
                  className="w-full py-3 rounded-xl font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition disabled:opacity-40">
                  Submit Code 🔐
                </button>
                <p className="text-center text-white/30 text-xs mt-2">{encryptionIdx + 1}/{ENCRYPTION_PAIRS.length} messages</p>
              </div>
            )}

            {/* WIFI MISSION */}
            {activeMission.type === "wifi" && !missionResult && (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h3 className="text-white font-bold text-lg mb-2">📡 Choose the Safe WiFi!</h3>
                <p className="text-white/60 text-sm mb-4">Which network would you connect to? Always pick encrypted networks!</p>
                {wifiFeedback && (
                  <div className={`p-3 rounded-xl mb-4 text-sm font-bold ${wifiFeedback.startsWith("✅") ? "bg-green-500/20 text-green-300" : "bg-orange-500/20 text-orange-300"}`}>
                    {wifiFeedback}
                  </div>
                )}
                <div className="space-y-3">
                  {WIFI_OPTIONS.map((wifi, i) => (
                    <button key={i} onClick={() => selectWifi(i)} disabled={wifiSelected !== null}
                      className={`w-full p-4 rounded-xl flex items-center gap-3 transition hover:scale-102 border text-left ${
                        wifiSelected === i
                          ? wifi.secured ? "bg-green-500/20 border-green-400/50" : "bg-red-500/20 border-red-400/50"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}>
                      <Wifi className={`h-6 w-6 ${wifi.secured ? "text-green-400" : "text-red-400"}`} />
                      <div className="flex-1">
                        <p className="text-white font-bold font-mono text-sm">{wifi.name}</p>
                        <p className={`text-xs ${wifi.secured ? "text-green-400" : "text-red-400"}`}>{wifi.desc}</p>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map(b => <div key={b} className={`w-2 rounded-full ${b <= wifi.strength ? "bg-white" : "bg-white/20"}`} style={{ height: `${b * 5 + 5}px` }} />)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      {showLeaderboard && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur z-50">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">🏆 Top Sentinels</h2>
              <button onClick={() => setShowLeaderboard(false)}><X className="h-5 w-5 text-white/60" /></button>
            </div>
            <div className="space-y-2">
              {leaderboard.length === 0 ? (
                <p className="text-white/40 text-center py-6">No sentinels yet — join the fight!</p>
              ) : leaderboard.map((e, i) => (
                <div key={i} className={`flex justify-between items-center p-3 rounded-xl ${i === 0 ? "bg-yellow-500/10 border border-yellow-400/30" : "bg-white/5"}`}>
                  <span className="text-white font-semibold">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`} {e.name}</span>
                  <span className="font-bold text-cyan-400">{e.score} ⭐</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
