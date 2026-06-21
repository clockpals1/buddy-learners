import { lazy, Suspense, useEffect, useState } from "react";

const Hero3D = lazy(() => import("./Hero3D"));

export default function ClientHero() {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (!mounted || reducedMotion) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-[60vmin] w-[60vmin] rounded-full bg-gradient-sunrise opacity-70 blur-2xl" />
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="absolute inset-0" />}>
      <Hero3D />
    </Suspense>
  );
}
