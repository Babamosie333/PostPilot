import { useEffect, useState } from "react";
import Logo from "./Logo";

const MIN_DISPLAY_MS = 900;

export default function SplashScreen({ ready, onDone }) {
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const start = Date.now();
    if (!ready) return;

    const elapsed = Date.now() - start;
    const wait = Math.max(MIN_DISPLAY_MS - elapsed, 0);
    const t1 = setTimeout(() => setExiting(true), wait);
    const t2 = setTimeout(() => {
      setMounted(false);
      onDone?.();
    }, wait + 350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [ready, onDone]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink ${
        exiting ? "splash-exit" : ""
      }`}
    >
      <div className="splash-logo">
        <Logo size={56} />
      </div>
      <span className="splash-text font-display text-[17px] font-700 tracking-tight text-paper">
        PostPilot
      </span>
    </div>
  );
}