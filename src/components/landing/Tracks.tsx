import { motion } from "framer-motion";

const tracks = [
  {
    name: "Spark Cubs",
    ages: "Ages 6–9",
    blurb: "Drag-and-drop coding, story games, and a friendly AI buddy that grows with them.",
    bullets: ["Block-based coding", "What is the internet?", "AI as a character"],
    color: "track-cubs",
    emoji: "🦊",
  },
  {
    name: "Code Rangers",
    ages: "Ages 10–12",
    blurb: "Scratch to Python, packet-race networking games, and 'spot the scam' cyber missions.",
    bullets: ["Intro Python", "How data travels", "Cyber-spy games"],
    color: "track-rangers",
    emoji: "🛡️",
  },
  {
    name: "Cyber Pioneers",
    ages: "Ages 13–15",
    blurb: "Real Python & JS, build AI chatbots with Groq, and ethical-hacking capture-the-flag.",
    bullets: ["Build with AI APIs", "Networks & firewalls", "CTF (sandboxed)"],
    color: "track-pioneers",
    emoji: "⚡",
  },
];

export default function Tracks() {
  return (
    <section id="tracks" className="py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl mb-14">
          <p className="text-sm font-semibold text-coral uppercase tracking-wider">Three age tracks</p>
          <h2 className="mt-3 text-4xl md:text-5xl font-700">A path for every curious kid.</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Each track has its own mascot, color world, and difficulty curve — so your child gets
            content that fits them, not a one-size-fits-all classroom.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tracks.map((t, i) => (
            <motion.article
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group relative rounded-3xl bg-card p-7 shadow-soft border border-border/60 hover:shadow-lift transition"
            >
              <div
                className="absolute inset-x-0 top-0 h-1.5 rounded-t-3xl"
                style={{ background: `var(--${t.color})` }}
              />
              <div className="flex items-center justify-between">
                <span className="text-5xl">{t.emoji}</span>
                <span
                  className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full text-white"
                  style={{ background: `var(--${t.color})` }}
                >
                  {t.ages}
                </span>
              </div>
              <h3 className="mt-6 text-2xl font-700">{t.name}</h3>
              <p className="mt-2 text-muted-foreground">{t.blurb}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {t.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: `var(--${t.color})` }} />
                    {b}
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
