export default function Footer() {
  return (
    <footer className="border-t border-border/60 py-12 px-6 text-sm text-muted-foreground">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row gap-6 justify-between">
        <div>
          <p className="font-display font-700 text-foreground text-lg">Leafva Academy</p>
          <p className="mt-1 max-w-md">
            A summer training program teaching kids 6–15 coding, AI, networking, and
            cybersecurity — through games, AI tutors, and live mentor sessions.
          </p>
        </div>
        <div className="flex flex-wrap gap-6">
          <a href="#tracks" className="hover:text-foreground">Tracks</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
          <a href="/terms" className="hover:text-foreground">Terms</a>
          <a href="/privacy" className="hover:text-foreground">Privacy & COPPA</a>
        </div>
      </div>
      <p className="mx-auto max-w-7xl mt-8 text-xs">
        © {new Date().getFullYear()} Leafva Academy. Built for curious kids.
      </p>
    </footer>
  );
}
