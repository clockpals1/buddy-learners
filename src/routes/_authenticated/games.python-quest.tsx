import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Trophy, X, Star, Play, Zap, Lock, ChevronRight, RotateCcw, Lightbulb, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/games/python-quest")({
  head: () => ({ meta: [{ title: "Python Quest · Leafva Academy" }] }),
  component: PythonQuest,
  validateSearch: (search: Record<string, unknown>) => ({
    childId: search.childId as string | undefined,
  }),
});

// ─── Types ────────────────────────────────────────────────────────────────────
type Quest = {
  id: string;
  title: string;
  story: string;
  npcSays: string;
  task: string;
  starterCode: string;
  hints: string[];
  successMessage: string;
  worldEffect: string;
  validate: (code: string) => boolean;
  xpReward: number;
};

type World = {
  id: number;
  name: string;
  emoji: string;
  concept: string;
  description: string;
  color: string;
  bgGradient: string;
  premium: boolean;
  quests: Quest[];
};

// ─── Quest Validator Helpers ──────────────────────────────────────────────────
const has = (code: string, ...patterns: RegExp[]) => patterns.every(p => p.test(code));
const trim = (code: string) => code.replace(/\s+/g, " ").toLowerCase();

// ─── Worlds & Quests Data ─────────────────────────────────────────────────────
const WORLDS: World[] = [
  {
    id: 1, name: "Python Academy", emoji: "🏰", concept: "print() & Strings",
    description: "Your first steps as a Code Apprentice! Learn to speak Python.",
    color: "#22c55e", bgGradient: "from-green-950 via-emerald-900 to-green-950",
    premium: false,
    quests: [
      {
        id: "w1q1", title: "The Greeting Spell", xpReward: 100,
        story: "The Academy doors are sealed with an ancient greeting lock.",
        npcSays: "\"To enter the Academy, you must cast the Greeting Spell! Type the magic words...\"",
        task: "Use print() to display \"Hello, Code Kingdom!\"",
        starterCode: '# Cast the Greeting Spell!\n',
        hints: ["The print() function shows text on screen", "Text must be inside quotes: print(\"your text\")", "Try: print(\"Hello, Code Kingdom!\")"],
        successMessage: "The Academy doors swing open! You spoke Python! 🏰✨",
        worldEffect: "🏰 Academy doors open with golden light!",
        validate: (c) => has(c, /print\s*\(/, /hello.*code kingdom/i),
      },
      {
        id: "w1q2", title: "Name the Dragon", xpReward: 120,
        story: "A small dragon needs a name to bond with you.",
        npcSays: "\"Give the dragon a name using a variable! It will remember you forever.\"",
        task: "Create a variable called `dragon_name` and assign it any name, then print it!",
        starterCode: '# Name your dragon!\ndragon_name = \n',
        hints: ["Variables store information: name = \"value\"", "Strings use quotes: dragon_name = \"Spark\"", "Then print it: print(dragon_name)"],
        successMessage: "Your dragon roars with joy! It now knows its name! 🐉💚",
        worldEffect: "🐉 Dragon flies up and breathes green fire!",
        validate: (c) => has(c, /dragon_name\s*=\s*["']/, /print\s*\(\s*dragon_name/),
      },
      {
        id: "w1q3", title: "The Welcome Banner", xpReward: 150,
        story: "The Academy needs a welcome banner for new students.",
        npcSays: "\"Print your name and age on two separate lines using two print() statements!\"",
        task: "Create variables `name` and `age`, then print them on separate lines.",
        starterCode: '# Create your profile!\nname = ""\nage = \n',
        hints: ["name = \"Your Name\" — use your own name!", "age = 10 — numbers don't need quotes", "print(name) then print(age) on the next line"],
        successMessage: "Your banner appears on the Academy wall! Everyone cheers! 🎉",
        worldEffect: "📜 A magical banner appears with your name in golden letters!",
        validate: (c) => has(c, /name\s*=\s*["']/, /age\s*=\s*\d/, /print\s*\(.*name/, /print\s*\(.*age/),
      },
    ],
  },
  {
    id: 2, name: "Forest of Variables", emoji: "🌲", concept: "Variables & Numbers",
    description: "Deep in the forest, magical creatures need names and numbers to survive!",
    color: "#10b981", bgGradient: "from-emerald-950 via-teal-900 to-emerald-950",
    premium: false,
    quests: [
      {
        id: "w2q1", title: "The Treasure Counter", xpReward: 130,
        story: "A treasure chest needs counting. Numbers are falling everywhere!",
        npcSays: "\"Store the treasure count in a variable and do math with it!\"",
        task: "Create `coins = 50`, add 25 to it, then print the result.",
        starterCode: '# Count the treasure!\ncoins = 50\n',
        hints: ["coins = 50 stores the number 50", "coins = coins + 25 adds 25 to it", "Or use: coins += 25"],
        successMessage: "The treasure chest overflows with gold! 💰",
        worldEffect: "💰 Gold coins rain from the treasure chest!",
        validate: (c) => has(c, /coins\s*=\s*50/, /(coins\s*=\s*coins\s*\+\s*25|coins\s*\+=\s*25)/, /print\s*\(\s*coins/),
      },
      {
        id: "w2q2", title: "Potion Recipe", xpReward: 140,
        story: "The forest witch needs help calculating potion ingredients!",
        npcSays: "\"Use variables to calculate: if one potion needs 3 herbs, how many herbs for 5 potions?\"",
        task: "Create `herbs_per_potion = 3` and `potions = 5`, multiply them, store in `total_herbs`, then print it.",
        starterCode: '# Calculate ingredients!\nherbs_per_potion = 3\npotions = 5\n',
        hints: ["Multiplication uses *: total = a * b", "total_herbs = herbs_per_potion * potions", "Then print(total_herbs)"],
        successMessage: "The potion is brewing! The witch dances happily! 🧙✨",
        worldEffect: "🧪 Magical potion bubbles and glows purple!",
        validate: (c) => has(c, /herbs_per_potion\s*=\s*3/, /potions\s*=\s*5/, /total_herbs\s*=/, /\*/, /print\s*\(\s*total_herbs/),
      },
      {
        id: "w2q3", title: "The String Weaver", xpReward: 160,
        story: "A magical spider weaves messages from string pieces.",
        npcSays: "\"Join two strings together using + to create a magic message!\"",
        task: "Create `first = \"Python\"` and `last = \" Wizard\"`, join them into `full_title`, then print it.",
        starterCode: '# Weave the magic title!\nfirst = "Python"\nlast = " Wizard"\n',
        hints: ["Joining strings is called concatenation", "full_title = first + last", "Print the result with print(full_title)"],
        successMessage: "The title appears in magical sparks! You are the Python Wizard! 🧙‍♂️",
        worldEffect: "✨ Magical letters float together forming your title!",
        validate: (c) => has(c, /first\s*=\s*["']Python["']/, /last\s*=\s*["'] Wizard["']/, /full_title\s*=\s*first\s*\+\s*last/, /print\s*\(\s*full_title/),
      },
    ],
  },
  {
    id: 3, name: "Loop Jungle", emoji: "🌀", concept: "for & while Loops",
    description: "In the Loop Jungle, patterns repeat forever. Master loops to survive!",
    color: "#f59e0b", bgGradient: "from-yellow-950 via-amber-900 to-yellow-950",
    premium: false,
    quests: [
      {
        id: "w3q1", title: "The Army of Torches", xpReward: 170,
        story: "The jungle is dark! Plant 5 torches to light the path.",
        npcSays: "\"Use a for loop to plant 5 torches. Loops repeat code automatically!\"",
        task: "Write a for loop that prints \"Torch planted! 🔥\" exactly 5 times using range(5).",
        starterCode: '# Plant the torches!\n',
        hints: ["for loops repeat code: for i in range(5):", "Don't forget the colon : at the end", "Indent the print() with 4 spaces"],
        successMessage: "5 torches blaze to life! The path is lit! 🔥🔥🔥🔥🔥",
        worldEffect: "🔥 Five torches ignite lighting the jungle path!",
        validate: (c) => has(c, /for\s+\w+\s+in\s+range\s*\(\s*5\s*\)/, /print\s*\(/, /torch/i),
      },
      {
        id: "w3q2", title: "The Magic Harvest", xpReward: 185,
        story: "Magical crops need harvesting. Each crop doubles the food supply!",
        npcSays: "\"Use a for loop with a list of crops to harvest them all!\"",
        task: "Create a list `crops = [\"wheat\", \"corn\", \"rice\"]` and loop through it, printing \"Harvesting: \" + each crop.",
        starterCode: '# Harvest the crops!\ncrops = ["wheat", "corn", "rice"]\n',
        hints: ["for crop in crops: — this loops through each item", "print(\"Harvesting: \" + crop) inside the loop", "Each line inside the loop must be indented"],
        successMessage: "All crops harvested! The village will eat well tonight! 🌾",
        worldEffect: "🌾 Golden crops float into a magical storage chest!",
        validate: (c) => has(c, /crops\s*=\s*\[/, /for\s+\w+\s+in\s+crops/, /print\s*\(.*harvest/i),
      },
      {
        id: "w3q3", title: "The Countdown Crystal", xpReward: 200,
        story: "A crystal orb counts down to unleash a magic explosion!",
        npcSays: "\"Use a while loop to countdown from 5 to 1, then print Boom!\"",
        task: "Use a while loop to count down from 5 to 1, printing each number. Then print \"BOOM! 💥\".",
        starterCode: '# Start the countdown!\ncountdown = 5\n',
        hints: ["while countdown > 0: keeps looping while condition is true", "print(countdown) to show the number", "countdown -= 1 decreases by 1 each time", "After the loop, print(\"BOOM! 💥\")"],
        successMessage: "BOOM! The crystal explodes in rainbow colors! 💥🌈",
        worldEffect: "💥 Crystal shatters releasing a rainbow explosion!",
        validate: (c) => has(c, /countdown\s*=\s*5/, /while\s+countdown\s*>\s*0/, /countdown\s*-=\s*1/, /boom/i),
      },
    ],
  },
  {
    id: 4, name: "Castle of Conditions", emoji: "🏯", concept: "if / else / elif",
    description: "Every door in the castle requires a decision. Learn if/else to navigate!",
    color: "#8b5cf6", bgGradient: "from-violet-950 via-purple-900 to-violet-950",
    premium: false,
    quests: [
      {
        id: "w4q1", title: "The Password Gate", xpReward: 190,
        story: "The castle gate checks passwords. Only the chosen word passes!",
        npcSays: "\"Write an if statement — if the password is correct, open the gate!\"",
        task: "Set `password = \"dragon123\"`. If it equals \"dragon123\", print \"Gate opens! ⚔️\", else print \"Access denied! 🚫\".",
        starterCode: '# Check the password!\npassword = "dragon123"\n',
        hints: ["if password == \"dragon123\": — use double equals ==", "print(\"Gate opens! ⚔️\") with indentation", "else: on same level as if", "print(\"Access denied! 🚫\") inside else"],
        successMessage: "The gate creaks open! You solved the if/else! ⚔️✨",
        worldEffect: "⚔️ Massive castle gates swing open with a thunderous sound!",
        validate: (c) => has(c, /password\s*=\s*["']dragon123["']/, /if\s+password\s*==\s*["']dragon123["']/, /else\s*:/),
      },
      {
        id: "w4q2", title: "The Magic Level Check", xpReward: 210,
        story: "A wizard guards three doors based on your power level.",
        npcSays: "\"Use elif to check multiple conditions — three doors need three checks!\"",
        task: "Set `power = 75`. Print \"Apprentice\" if < 50, \"Mage\" if < 90, else \"Grand Wizard\".",
        starterCode: '# Check your power level!\npower = 75\n',
        hints: ["if power < 50: — first condition", "elif power < 90: — second condition (else if)", "else: — catches everything remaining", "Each block needs indented print()"],
        successMessage: "You're a Mage! The second door glows and opens! 🧙",
        worldEffect: "🧙 The middle door glows purple and swings open revealing treasure!",
        validate: (c) => has(c, /power\s*=\s*75/, /if\s+power/, /elif\s+power/, /else\s*:/),
      },
      {
        id: "w4q3", title: "The Dragon Tamer", xpReward: 230,
        story: "Three dragons need different food based on their mood.",
        npcSays: "\"Check the dragon's mood and give the right food!\"",
        task: "Set `mood = \"angry\"`. If \"happy\" print \"Give treats\", elif \"hungry\" print \"Give fish\", elif \"angry\" print \"Give space\", else print \"Pet gently\".",
        starterCode: '# Feed the dragon!\nmood = "angry"\n',
        hints: ["Start with: if mood == \"happy\":", "Then: elif mood == \"hungry\":", "Then: elif mood == \"angry\":", "Finally: else:"],
        successMessage: "The angry dragon calms down! You mastered elif! 🐉❤️",
        worldEffect: "🐉 Angry dragon breathes out smoke and sits peacefully!",
        validate: (c) => has(c, /mood\s*=\s*["']angry["']/, /if\s+mood\s*==/, /elif\s+mood\s*==.*elif\s+mood\s*==/s, /else\s*:/),
      },
    ],
  },
  {
    id: 5, name: "Function Mountains", emoji: "⛰️", concept: "Functions & Return",
    description: "At the mountain peak, master the art of magical reusable spells!",
    color: "#ef4444", bgGradient: "from-red-950 via-rose-900 to-red-950",
    premium: false,
    quests: [
      {
        id: "w5q1", title: "The Fireball Spell", xpReward: 220,
        story: "Create a reusable fireball spell that wizards can cast anytime!",
        npcSays: "\"Define a function called cast_fireball and call it twice!\"",
        task: "Define a function `cast_fireball()` that prints \"🔥 Fireball launched!\", then call it twice.",
        starterCode: '# Create the Fireball Spell!\n',
        hints: ["def cast_fireball(): — defines the function", "Indent the print() inside it", "Call it with cast_fireball() — no def, no colon", "Call it twice on separate lines"],
        successMessage: "Two fireballs soar through the sky! Functions are MAGIC! 🔥🔥",
        worldEffect: "🔥🔥 Two enormous fireballs launch and explode against a mountain!",
        validate: (c) => has(c, /def\s+cast_fireball\s*\(\s*\)\s*:/, /print\s*\(/, /cast_fireball\s*\(\s*\).*cast_fireball\s*\(\s*\)/s),
      },
      {
        id: "w5q2", title: "The Greeting Wizard", xpReward: 240,
        story: "The wizard needs to greet hundreds of adventurers by name!",
        npcSays: "\"Create a function with a parameter — it can greet different people!\"",
        task: "Define `greet_hero(name)` that prints \"Welcome, \" + name + \"! 🗡️\". Call it with \"Aria\" and \"Leo\".",
        starterCode: '# Create the greeting spell!\n',
        hints: ["def greet_hero(name): — name is the parameter", "print(\"Welcome, \" + name + \"! 🗡️\")", "Call: greet_hero(\"Aria\")", "Then: greet_hero(\"Leo\")"],
        successMessage: "Aria and Leo both receive golden welcomes! ⚔️✨",
        worldEffect: "⚔️ Two heroes appear with their names written in stars!",
        validate: (c) => has(c, /def\s+greet_hero\s*\(\s*name\s*\)\s*:/, /greet_hero\s*\(\s*["']Aria["']/, /greet_hero\s*\(\s*["']Leo["']/),
      },
      {
        id: "w5q3", title: "The Power Calculator", xpReward: 260,
        story: "The kingdom needs a power calculator that returns results!",
        npcSays: "\"Create a function that RETURNS a value — not just prints!\"",
        task: "Define `calculate_power(base, level)` that returns `base * level`. Call it with (10, 5) and print the result.",
        starterCode: '# Build the power calculator!\n',
        hints: ["def calculate_power(base, level):", "return base * level — return sends a value back", "result = calculate_power(10, 5) stores it", "print(result) shows the answer"],
        successMessage: "Power calculated: 50! The kingdom's machines roar to life! ⚡",
        worldEffect: "⚡ Giant mechanical gears spin as the factory powers up!",
        validate: (c) => has(c, /def\s+calculate_power\s*\(\s*base\s*,\s*level\s*\)\s*:/, /return\s+base\s*\*\s*level/, /calculate_power\s*\(\s*10\s*,\s*5\s*\)/, /print\s*\(/),
      },
    ],
  },
  // PREMIUM WORLDS
  {
    id: 6, name: "List Islands", emoji: "🏝️", concept: "Lists & Collections",
    description: "Organize magical creatures into lists on tropical islands!",
    color: "#06b6d4", bgGradient: "from-cyan-950 via-sky-900 to-cyan-950",
    premium: true,
    quests: [
      { id: "w6q1", title: "Pet Collection", xpReward: 280, story: "", npcSays: "", task: "", starterCode: "", hints: [], successMessage: "", worldEffect: "", validate: () => false },
      { id: "w6q2", title: "Inventory Sorter", xpReward: 300, story: "", npcSays: "", task: "", starterCode: "", hints: [], successMessage: "", worldEffect: "", validate: () => false },
      { id: "w6q3", title: "Quest Log", xpReward: 320, story: "", npcSays: "", task: "", starterCode: "", hints: [], successMessage: "", worldEffect: "", validate: () => false },
    ],
  },
  {
    id: 7, name: "Dictionary Desert", emoji: "🏜️", concept: "Dictionaries & Maps",
    description: "Ancient ruins hide secrets in magical key-value scrolls!",
    color: "#f97316", bgGradient: "from-orange-950 via-amber-900 to-orange-950",
    premium: true,
    quests: [
      { id: "w7q1", title: "NPC Info Cards", xpReward: 340, story: "", npcSays: "", task: "", starterCode: "", hints: [], successMessage: "", worldEffect: "", validate: () => false },
      { id: "w7q2", title: "Magic Inventory", xpReward: 360, story: "", npcSays: "", task: "", starterCode: "", hints: [], successMessage: "", worldEffect: "", validate: () => false },
      { id: "w7q3", title: "Dragon Codex", xpReward: 380, story: "", npcSays: "", task: "", starterCode: "", hints: [], successMessage: "", worldEffect: "", validate: () => false },
    ],
  },
  {
    id: 8, name: "Robot Factory", emoji: "🤖", concept: "Classes & Objects",
    description: "Build intelligent robots using Python classes and objects!",
    color: "#64748b", bgGradient: "from-slate-950 via-slate-800 to-slate-950",
    premium: true,
    quests: [
      { id: "w8q1", title: "Robot Blueprint", xpReward: 400, story: "", npcSays: "", task: "", starterCode: "", hints: [], successMessage: "", worldEffect: "", validate: () => false },
      { id: "w8q2", title: "Robot Methods", xpReward: 430, story: "", npcSays: "", task: "", starterCode: "", hints: [], successMessage: "", worldEffect: "", validate: () => false },
      { id: "w8q3", title: "Robot Army", xpReward: 460, story: "", npcSays: "", task: "", starterCode: "", hints: [], successMessage: "", worldEffect: "", validate: () => false },
    ],
  },
  {
    id: 9, name: "Space Colony", emoji: "🚀", concept: "Modules & APIs",
    description: "Launch into space and use Python modules to navigate the cosmos!",
    color: "#a855f7", bgGradient: "from-purple-950 via-indigo-900 to-purple-950",
    premium: true,
    quests: [
      { id: "w9q1", title: "Random Planets", xpReward: 480, story: "", npcSays: "", task: "", starterCode: "", hints: [], successMessage: "", worldEffect: "", validate: () => false },
      { id: "w9q2", title: "Math Module", xpReward: 500, story: "", npcSays: "", task: "", starterCode: "", hints: [], successMessage: "", worldEffect: "", validate: () => false },
      { id: "w9q3", title: "Space API", xpReward: 530, story: "", npcSays: "", task: "", starterCode: "", hints: [], successMessage: "", worldEffect: "", validate: () => false },
    ],
  },
  {
    id: 10, name: "Bug King's Castle", emoji: "👑", concept: "Final Adventure",
    description: "Face the Bug King using ALL Python knowledge to save the kingdom!",
    color: "#dc2626", bgGradient: "from-red-950 via-rose-950 to-red-950",
    premium: true,
    quests: [
      { id: "w10q1", title: "Debug the Dungeon", xpReward: 600, story: "", npcSays: "", task: "", starterCode: "", hints: [], successMessage: "", worldEffect: "", validate: () => false },
      { id: "w10q2", title: "Code the Shield", xpReward: 650, story: "", npcSays: "", task: "", starterCode: "", hints: [], successMessage: "", worldEffect: "", validate: () => false },
      { id: "w10q3", title: "Defeat the Bug King", xpReward: 999, story: "", npcSays: "", task: "", starterCode: "", hints: [], successMessage: "", worldEffect: "", validate: () => false },
    ],
  },
];

const FREE_WORLDS = 5;

// ─── Pyro Mentor Messages ──────────────────────────────────────────────────────
const PYRO_TIPS = [
  "Every Python master started with Hello World! You're doing great! 🐉",
  "Mistakes are just bugs waiting to be squashed! Try again! 💪",
  "Python is a real programming language used by NASA and Google! 🚀",
  "Variables are like treasure chests that hold your data! 💎",
  "Loops save you from writing the same thing 1000 times! 🌀",
  "Functions are magical spells you can reuse! ✨",
  "if/else is how computers make decisions — just like you! 🧠",
  "You're becoming a real programmer! The Bug King trembles! 👑",
];

// ─── Component ────────────────────────────────────────────────────────────────
function PythonQuest() {
  const { childId } = useSearch({ from: "/_authenticated/games/python-quest" });
  const [screen, setScreen] = useState<"worldmap" | "quest" | "premium">("worldmap");
  const [activeWorld, setActiveWorld] = useState<World | null>(null);
  const [activeQuestIdx, setActiveQuestIdx] = useState(0);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [hintIdx, setHintIdx] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [completedQuests, setCompletedQuests] = useState<Set<string>>(new Set());
  const [totalStars, setTotalStars] = useState(0);
  const [pyroMsg, setPyroMsg] = useState(PYRO_TIPS[0]);
  const [pyroVisible, setPyroVisible] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ name: string; score: number }[]>([]);
  const [hasSubscription, setHasSubscription] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const activeQuest = activeWorld?.quests[activeQuestIdx] ?? null;

  useEffect(() => {
    loadProgress();
    loadLeaderboard();
    checkSubscription();
    rotatePyroTip();
  }, []);

  function rotatePyroTip() {
    setInterval(() => {
      setPyroMsg(PYRO_TIPS[Math.floor(Math.random() * PYRO_TIPS.length)]);
    }, 12000);
  }

  async function checkSubscription() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: roleData } = await (supabase as any).from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    if (roleData?.role === "super_admin" || roleData?.role === "instructor") { setHasSubscription(true); return; }
    if (!childId) return;
    const { data: enroll } = await (supabase as any).from("enrollments").select("id").eq("child_id", childId).eq("status", "active").limit(1);
    if (enroll && enroll.length > 0) setHasSubscription(true);
  }

  async function loadLeaderboard() {
    const { data: scores } = await (supabase as any)
      .from("game_progress").select("child_id, stars, children(display_name)")
      .eq("game_slug", "python-quest").order("stars", { ascending: false }).limit(10);
    if (scores) setLeaderboard(scores.map((s: any) => ({ name: s.children?.display_name || "Wizard", score: s.stars })));
  }

  async function loadProgress() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !childId) return;
    const { data: progress } = await (supabase as any)
      .from("game_progress").select("level, stars").eq("user_id", user.id).eq("child_id", childId).eq("game_slug", "python-quest");
    if (progress && progress.length > 0) {
      const total = progress.reduce((t: number, p: any) => t + p.stars, 0);
      setTotalStars(total);
      setXp(total * 50);
      setLevel(Math.floor(total / 5) + 1);
      setCompletedQuests(new Set(progress.map((p: any) => `w${Math.floor(p.level / 10) + 1}q${(p.level % 10) + 1}`)));
    }
  }

  async function saveQuestProgress(questId: string, xpGained: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !childId) return;
    const worldNum = parseInt(questId.charAt(1));
    const questNum = parseInt(questId.charAt(3));
    const levelNum = (worldNum - 1) * 10 + (questNum - 1);
    await (supabase as any).from("game_progress").upsert({
      user_id: user.id, child_id: childId, game_slug: "python-quest",
      level: levelNum, stars: 3, completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,child_id,game_slug,level" });
    setCompletedQuests(prev => new Set([...prev, questId]));
    setXp(prev => { const newXp = prev + xpGained; if (newXp >= level * 500) setLevel(l => l + 1); return newXp; });
    setTotalStars(prev => prev + 3);
    loadLeaderboard();
  }

  function openWorld(world: World) {
    if (world.premium && !hasSubscription) { setScreen("premium"); return; }
    setActiveWorld(world);
    setActiveQuestIdx(0);
    setCode(world.quests[0].starterCode);
    setOutput(null); setSucceeded(false); setShowHint(false); setHintIdx(0);
    setScreen("quest");
  }

  function runCode() {
    if (!activeQuest) return;
    const trimmedCode = code.trim();
    if (trimmedCode.length < 5) { setOutput("❌ Write some Python code first!"); return; }

    if (activeQuest.validate(trimmedCode)) {
      setSucceeded(true);
      setOutput(`✅ ${activeQuest.successMessage}\n\n${activeQuest.worldEffect}\n\n+${activeQuest.xpReward} XP`);
      if (!completedQuests.has(activeQuest.id)) saveQuestProgress(activeQuest.id, activeQuest.xpReward);
    } else {
      const tips = ["🐉 Pyro says: Close! Check your spelling and syntax.",
        "💡 Hint: Make sure every print() has parentheses and quotes around text.",
        "🔍 Look carefully at the task requirements and try again!"];
      setOutput(`❌ Not quite right...\n\n${tips[Math.floor(Math.random() * tips.length)]}\n\nTip: ${activeQuest.hints[0]}`);
      setPyroMsg("Try checking your code carefully — every character matters in Python! 🐉");
      setPyroVisible(true);
    }
  }

  function nextQuest() {
    if (!activeWorld) return;
    if (activeQuestIdx < activeWorld.quests.length - 1) {
      const nextIdx = activeQuestIdx + 1;
      setActiveQuestIdx(nextIdx);
      setCode(activeWorld.quests[nextIdx].starterCode);
      setOutput(null); setSucceeded(false); setShowHint(false); setHintIdx(0);
    } else {
      setScreen("worldmap");
    }
  }

  const worldProgress = (world: World) => {
    const completed = world.quests.filter(q => completedQuests.has(q.id)).length;
    return { completed, total: world.quests.length, pct: Math.round((completed / world.quests.length) * 100) };
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/60 backdrop-blur border-b border-purple-500/20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {screen !== "worldmap" ? (
              <button onClick={() => setScreen("worldmap")} className="flex items-center gap-1 text-purple-300 hover:opacity-80">
                <ArrowLeft className="h-4 w-4" /> Map
              </button>
            ) : (
              <Link to="/child/$childId" params={{ childId: childId || "" }} className="flex items-center gap-2 text-purple-300 hover:opacity-80">
                <ArrowLeft className="h-4 w-4" /> Portal
              </Link>
            )}
            <span className="text-purple-200 font-bold hidden sm:block">🐍 Python Quest</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold">
            <span className="text-yellow-300">Lv.{level}</span>
            <span className="text-purple-300">⚡ {xp} XP</span>
            <span className="text-yellow-400">⭐ {totalStars}</span>
            <button onClick={() => setShowLeaderboard(true)} className="text-yellow-400 hover:opacity-80"><Trophy className="h-4 w-4" /></button>
          </div>
        </div>
      </header>

      {/* ── WORLD MAP ── */}
      {screen === "worldmap" && (
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="text-7xl mb-3">🐍</div>
            <h1 className="text-5xl font-black mb-2 bg-gradient-to-r from-purple-400 via-pink-300 to-yellow-300 bg-clip-text text-transparent">
              Python Quest
            </h1>
            <p className="text-purple-300 text-lg">The Code Kingdom awaits! Master Python to save the realm.</p>
            {/* XP Bar */}
            <div className="max-w-sm mx-auto mt-4">
              <div className="flex justify-between text-xs text-purple-400 mb-1">
                <span>Level {level}</span><span>{xp} / {level * 500} XP</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all" style={{ width: `${Math.min(100, (xp % (level * 500)) / (level * 500) * 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Pyro Mentor */}
          {pyroVisible && (
            <div className="flex items-start gap-3 bg-purple-900/40 border border-purple-500/30 rounded-2xl p-4 mb-8 max-w-xl mx-auto">
              <div className="text-4xl flex-shrink-0">🐉</div>
              <div>
                <p className="text-purple-200 text-sm font-bold mb-0.5">Pyro the Dragon says:</p>
                <p className="text-white/80 text-sm">{pyroMsg}</p>
              </div>
              <button onClick={() => setPyroVisible(false)} className="ml-auto text-white/30 hover:text-white/60"><X className="h-4 w-4" /></button>
            </div>
          )}

          {/* World Grid */}
          <div className="grid sm:grid-cols-2 gap-5">
            {WORLDS.map((world) => {
              const prog = worldProgress(world);
              const locked = world.premium && !hasSubscription;
              return (
                <button key={world.id} onClick={() => openWorld(world)}
                  className={`rounded-2xl p-5 text-left transition hover:scale-[1.02] relative overflow-hidden border ${
                    locked ? "border-white/10 opacity-70" : "border-white/10 hover:border-white/30"
                  }`}
                  style={{ background: `linear-gradient(135deg, ${world.color}22, ${world.color}11)` }}>
                  {locked && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center rounded-2xl z-10">
                      <div className="text-center">
                        <Lock className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
                        <p className="text-yellow-300 font-bold text-sm">Premium World</p>
                        <p className="text-white/60 text-xs">Upgrade to unlock</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-4xl">{world.emoji}</div>
                    <div className="flex items-center gap-1 text-xs" style={{ color: world.color }}>
                      {world.premium && !locked && <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full text-xs">✨ Premium</span>}
                      <span>{prog.completed}/{prog.total} done</span>
                    </div>
                  </div>
                  <h3 className="font-black text-lg mb-0.5 text-white">World {world.id}: {world.name}</h3>
                  <p className="text-xs font-semibold mb-1" style={{ color: world.color }}>📚 {world.concept}</p>
                  <p className="text-white/60 text-sm mb-3">{world.description}</p>
                  {/* Progress bar */}
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${prog.pct}%`, background: world.color }} />
                  </div>
                  {prog.completed === prog.total && prog.total > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-green-400"><CheckCircle className="h-3 w-3" /> Complete!</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── QUEST SCREEN ── */}
      {screen === "quest" && activeWorld && activeQuest && (
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Quest header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="text-3xl">{activeWorld.emoji}</div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest">World {activeWorld.id} — {activeWorld.name}</p>
              <h2 className="text-xl font-black text-white">Quest {activeQuestIdx + 1}: {activeQuest.title}</h2>
            </div>
            <div className="ml-auto text-sm text-yellow-300 font-bold">+{activeQuest.xpReward} XP</div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Left: Story & Task */}
            <div className="space-y-4">
              {/* Story */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <p className="text-xs text-purple-400 uppercase tracking-widest mb-2">📖 Story</p>
                <p className="text-white/80 text-sm mb-3">{activeQuest.story}</p>
                <div className="bg-purple-900/40 rounded-xl p-3 border-l-4 border-purple-400">
                  <p className="text-purple-200 text-sm italic">{activeQuest.npcSays}</p>
                </div>
              </div>

              {/* Task */}
              <div className="bg-white/5 border border-yellow-500/20 rounded-2xl p-5">
                <p className="text-xs text-yellow-400 uppercase tracking-widest mb-2">⚡ Your Mission</p>
                <p className="text-white text-sm">{activeQuest.task}</p>
              </div>

              {/* Hint */}
              {showHint && (
                <div className="bg-white/5 border border-blue-500/20 rounded-2xl p-4 space-y-2">
                  <p className="text-xs text-blue-400 uppercase tracking-widest">💡 Hint {hintIdx + 1}/{activeQuest.hints.length}</p>
                  <p className="text-blue-200 text-sm">{activeQuest.hints[hintIdx]}</p>
                  {hintIdx < activeQuest.hints.length - 1 && (
                    <button onClick={() => setHintIdx(i => i + 1)} className="text-xs text-blue-400 underline hover:no-underline">Show next hint →</button>
                  )}
                </div>
              )}

              {/* Output */}
              {output && (
                <div className={`rounded-2xl p-4 text-sm font-mono whitespace-pre-line border ${
                  succeeded ? "bg-green-900/30 border-green-500/30 text-green-300" : "bg-red-900/30 border-red-500/30 text-red-300"
                }`}>
                  {output}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={runCode}
                  className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition hover:scale-105 shadow-lg"
                  style={{ background: activeWorld.color }}>
                  <Play className="h-5 w-5" /> Run Code! 🐍
                </button>
                {!showHint && (
                  <button onClick={() => setShowHint(true)} className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition">
                    <Lightbulb className="h-5 w-5 text-yellow-400" />
                  </button>
                )}
                <button onClick={() => setCode(activeQuest.starterCode)} className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition">
                  <RotateCcw className="h-5 w-5 text-white/60" />
                </button>
              </div>

              {succeeded && (
                <button onClick={nextQuest}
                  className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-105 transition flex items-center justify-center gap-2 shadow-xl">
                  {activeQuestIdx < activeWorld.quests.length - 1 ? "Next Quest →" : "Complete World! 🏆"}
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Right: Code Editor */}
            <div className="flex flex-col">
              <div className="bg-[#1e1e2e] rounded-t-2xl px-4 py-2 flex items-center gap-2 border border-white/10 border-b-0">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-white/40 text-xs ml-2">🐍 quest.py</span>
                {completedQuests.has(activeQuest.id) && <span className="ml-auto text-xs text-green-400 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Solved!</span>}
              </div>
              <textarea
                ref={editorRef}
                value={code}
                onChange={e => setCode(e.target.value)}
                spellCheck={false}
                className="flex-1 bg-[#1e1e2e] border border-white/10 border-t-0 rounded-b-2xl p-4 font-mono text-sm text-green-300 resize-none focus:outline-none focus:border-purple-500/50 leading-relaxed"
                style={{ minHeight: "300px", tabSize: 4 }}
                onKeyDown={e => {
                  if (e.key === "Tab") { e.preventDefault(); const s = e.currentTarget.selectionStart; const end = e.currentTarget.selectionEnd; setCode(c => c.substring(0, s) + "    " + c.substring(end)); setTimeout(() => { if (editorRef.current) { editorRef.current.selectionStart = s + 4; editorRef.current.selectionEnd = s + 4; } }, 0); }
                }}
                placeholder="# Write your Python code here..."
              />
              {/* Quick reference */}
              <div className="mt-3 bg-white/5 border border-white/10 rounded-xl p-3">
                <p className="text-xs text-white/40 mb-2">⚡ Quick Reference — {activeWorld.concept}</p>
                <div className="font-mono text-xs text-purple-300 space-y-1">
                  {activeWorld.id === 1 && <><p>print("text")</p><p>variable = "value"</p></>}
                  {activeWorld.id === 2 && <><p>num = 42</p><p>text = "hello"</p><p>result = a + b</p></>}
                  {activeWorld.id === 3 && <><p>for i in range(5):</p><p>{"    "}print(i)</p><p>while x &gt; 0:</p></>}
                  {activeWorld.id === 4 && <><p>if x == 5:</p><p>elif x &gt; 5:</p><p>else:</p></>}
                  {activeWorld.id === 5 && <><p>def my_function():</p><p>{"    "}return value</p><p>my_function()</p></>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PREMIUM SCREEN ── */}
      {screen === "premium" && (
        <div className="max-w-3xl mx-auto px-4 py-10 text-center">
          <div className="text-7xl mb-4 animate-bounce">🐉</div>
          <h2 className="text-4xl font-black mb-3 bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
            The Grand Python Portal
          </h2>
          <p className="text-purple-200 text-lg mb-2">Pyro says:</p>
          <div className="bg-purple-900/40 border border-purple-500/30 rounded-2xl p-5 mb-8 max-w-lg mx-auto">
            <p className="text-white italic">"You've mastered the Apprentice Worlds! Beyond this gate lies the Advanced Kingdom — build robots, create games, train AI companions, and become a true Python Wizard!"</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 mb-8">
            {/* Free */}
            <div className="bg-white/5 border border-white/20 rounded-2xl p-6 text-left">
              <h3 className="text-xl font-bold mb-3">🗡️ Free Explorer</h3>
              <ul className="space-y-2 text-sm text-white/70">
                {["Worlds 1–5", "Beginner Python", "Save Progress", "Daily Rewards", "Basic Achievements"].map(f => (
                  <li key={f} className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />{f}</li>
                ))}
              </ul>
            </div>
            {/* Premium */}
            <div className="bg-gradient-to-br from-yellow-900/40 to-purple-900/40 border border-yellow-400/40 rounded-2xl p-6 text-left relative overflow-hidden">
              <div className="absolute top-3 right-3 bg-yellow-400 text-black text-xs font-black px-2 py-1 rounded-full">✨ UPGRADE</div>
              <h3 className="text-xl font-bold mb-3">🧙 Python Wizard</h3>
              <ul className="space-y-2 text-sm text-white/80">
                {["Worlds 6–10 + Future worlds", "AI Coding Mentor (Pyro+)", "Multiplayer Coding Quests", "Dragon Pets & Mounts", "Weekly Tournaments", "Build Real Python Games", "AI & Robotics Missions", "Parent Progress Reports", "Printable Certificates"].map(f => (
                  <li key={f} className="flex items-center gap-2"><Star className="h-4 w-4 text-yellow-400 flex-shrink-0" />{f}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Premium world previews */}
          <div className="grid grid-cols-5 gap-2 mb-8">
            {WORLDS.filter(w => w.premium).map(w => (
              <div key={w.id} className="aspect-square rounded-xl flex flex-col items-center justify-center text-center p-2 border border-white/10" style={{ background: w.color + "22" }}>
                <div className="text-2xl mb-1">{w.emoji}</div>
                <p className="text-xs text-white/60">{w.name.split(" ")[0]}</p>
              </div>
            ))}
          </div>

          <Link to="/checkout" search={{ childId }}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-black text-xl text-black bg-gradient-to-r from-yellow-400 to-orange-400 hover:scale-105 transition shadow-2xl">
            <Zap className="h-6 w-6" /> Unlock All Worlds!
          </Link>
          <button onClick={() => setScreen("worldmap")} className="block mx-auto mt-4 text-white/40 hover:text-white/70 text-sm underline">
            Continue Free Adventure
          </button>
        </div>
      )}

      {/* Leaderboard */}
      {showLeaderboard && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur z-50">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">🏆 Python Wizards</h2>
              <button onClick={() => setShowLeaderboard(false)}><X className="h-5 w-5 text-white/60" /></button>
            </div>
            <div className="space-y-2">
              {leaderboard.length === 0 ? (
                <p className="text-white/40 text-center py-6">No wizards yet — be the first!</p>
              ) : leaderboard.map((e, i) => (
                <div key={i} className={`flex justify-between items-center p-3 rounded-xl ${i === 0 ? "bg-yellow-500/10 border border-yellow-400/30" : "bg-white/5"}`}>
                  <span className="text-white font-semibold">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`} {e.name}</span>
                  <span className="font-bold text-purple-400">{e.score} ⭐</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
