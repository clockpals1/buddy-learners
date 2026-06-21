import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import Nav from "@/components/landing/Nav";
import ClientHero from "@/components/landing/ClientHero";
import Tracks from "@/components/landing/Tracks";
import HowItWorks from "@/components/landing/HowItWorks";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import Register from "@/components/landing/Register";
import Footer from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Leafva Academy — Summer coding, AI & cybersecurity camp for kids 6–15" },
      {
        name: "description",
        content:
          "A summer training program teaching kids 6–15 the fundamentals of coding, AI, networking, and cybersecurity — through games, AI tutors, and live mentor-led sessions.",
      },
      { property: "og:title", content: "Leafva Academy — Summer camp for curious kids" },
      {
        property: "og:description",
        content: "Games. AI tutors. Live mentors. Coding, AI & cybersecurity for ages 6–15.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main>
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-24 md:pt-24 md:pb-32 grid md:grid-cols-2 gap-10 items-center min-h-[80vh]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sun/40 text-ink text-xs font-semibold uppercase tracking-wider">
              Summer camp · Ages 6–15
            </span>
            <h1 className="mt-5 text-5xl md:text-7xl font-700 leading-[1.02] tracking-tight">
              Where curious kids become
              <span className="block text-gradient-sunrise">code-savvy creators.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl">
              Coding, AI, networking, and cybersecurity — taught through games, friendly
              AI tutors, and live mentor sessions. Built so your child actually wants to
              show up.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#register"
                className="inline-flex h-12 items-center px-6 rounded-full bg-gradient-cta text-coral-foreground font-semibold shadow-pop hover:scale-[1.03] transition"
              >
                Start the adventure
              </a>
              <a
                href="#tracks"
                className="inline-flex h-12 items-center px-6 rounded-full border border-border bg-card hover:bg-muted transition font-medium"
              >
                See the tracks
              </a>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
              <div>
                <p className="font-700 text-foreground text-lg font-display">3 tracks</p>
                <p>tuned to age</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="font-700 text-foreground text-lg font-display">AI tutor</p>
                <p>hints, not answers</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="font-700 text-foreground text-lg font-display">Live mentors</p>
                <p>real humans, weekly</p>
              </div>
            </div>
          </motion.div>

          <div className="relative h-[420px] md:h-[560px]">
            <ClientHero />
          </div>
        </div>
      </section>

      <Tracks />
      <HowItWorks />
      <Pricing />
      <FAQ />
      <Register />
      <Footer />
    </main>
  );
}
