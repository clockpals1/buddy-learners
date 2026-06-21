import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-cream/70 border-b border-border/50">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-700">
          <span className="grid place-items-center h-9 w-9 rounded-xl bg-gradient-sunrise text-white shadow-pop">
            <Sparkles className="h-5 w-5" />
          </span>
          <span>Leafva <span className="text-coral">Academy</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
          <a href="#tracks" className="hover:text-foreground transition">Tracks</a>
          <a href="#how" className="hover:text-foreground transition">How it works</a>
          <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          <a href="#faq" className="hover:text-foreground transition">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden sm:inline-flex h-10 items-center px-4 rounded-full text-sm font-medium text-foreground hover:bg-muted transition"
          >
            Sign in
          </Link>
          <a
            href="#register"
            className="inline-flex h-10 items-center px-5 rounded-full bg-gradient-cta text-coral-foreground text-sm font-semibold shadow-pop hover:scale-[1.03] transition"
          >
            Join the camp
          </a>
        </div>
      </div>
    </header>
  );
}
