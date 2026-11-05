"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { TeamBadge } from "@/components/TeamBadge";
import type { AuctionScoreResult } from "@/lib/scoring/auctionScoring";

export function AnnouncementSequence({
  auctionId,
  result,
  onComplete,
}: {
  auctionId: string;
  result: AuctionScoreResult;
  onComplete: () => void;
}) {
  const [step, setStep] = useState<"lights" | "calc" | "trophy" | "winner" | "done">("lights");
  const [counter, setCounter] = useState(0);

  const storageKey = `pk_announced_${auctionId}`;

  // Check if user already saw or prefers reduced motion
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alreadySeen = localStorage.getItem(storageKey);
    if (reducedMotion || alreadySeen) {
      onComplete();
      return;
    }

    // Step 1: Lights sweep (0.8s)
    const t1 = setTimeout(() => {
      setStep("calc");
    }, 800);

    // Step 2: Calculating results (~2.5s)
    const t2 = setTimeout(() => {
      setStep("trophy");
    }, 3200);

    // Step 3: Trophy rises (1.2s)
    const t3 = setTimeout(() => {
      setStep("winner");
    }, 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [storageKey, onComplete]);

  const winners = result.teams.filter((t) => t.rank === 1);
  const primaryWinner = winners[0];
  const targetScore = primaryWinner?.finalScore ?? 0;

  // Counter animation when step becomes 'winner'
  useEffect(() => {
    if (step !== "winner" || result.status === "NO_ELIGIBLE_WINNER") return;

    // Trigger confetti in winner's team colors
    const colors = winners.flatMap((w) => [w.colorPrimary, w.colorSecondary]);
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: colors.length > 0 ? colors : ["#FF6B00", "#FFD400", "#E63946"],
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });
      }, 350);
    } catch {
      // ignore
    }

    let start = 0;
    const duration = 1200;
    const steps = 30;
    const stepTime = duration / steps;
    const increment = targetScore / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= targetScore) {
        setCounter(targetScore);
        clearInterval(timer);
      } else {
        setCounter(Math.round(start * 10) / 10);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [step, targetScore, result.status, winners]);

  function handleSkip() {
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // ignore
    }
    onComplete();
  }

  function handleFinish() {
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // ignore
    }
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070A14] overflow-hidden">
      {/* Stadium Lights Sweep */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255, 107, 0, 0.5), transparent 70%), radial-gradient(ellipse 80% 50% at 50% 120%, rgba(255, 212, 0, 0.3), transparent 70%)",
        }}
      />
      <div className="pointer-events-none absolute -inset-full animate-[spin_16s_linear_infinite] opacity-15 bg-[conic-gradient(from_0deg_at_50%_50%,#ff6b00_0deg,transparent_60deg,#ffd400_180deg,transparent_240deg,#ff6b00_360deg)]" />

      {/* Skip Button */}
      <button
        onClick={handleSkip}
        className="absolute top-6 right-6 z-20 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white/80 backdrop-blur hover:bg-white/20 transition"
      >
        Skip Reveal &rarr;
      </button>

      <div className="relative z-10 w-full max-w-xl px-6 text-center">
        <AnimatePresence mode="wait">
          {step === "lights" && (
            <motion.div
              key="lights"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <p className="font-display text-4xl tracking-widest text-orange uppercase">
                Stadium Final Whistle
              </p>
              <p className="text-sm text-muted">Auction closed. Calculating ratings...</p>
            </motion.div>
          )}

          {step === "calc" && (
            <motion.div
              key="calc"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-6"
            >
              <div className="relative mx-auto h-20 w-20">
                <div className="absolute inset-0 animate-ping rounded-full bg-orange/20" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-orange bg-card">
                  <span className="font-display text-2xl text-yellow">PK</span>
                </div>
              </div>
              <div>
                <h2 className="font-display text-4xl text-white tracking-wider">
                  Calculating Results…
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Auditing purchase ledgers, squad depth, role balance, and purse efficiency
                </p>
              </div>
              <div className="mx-auto h-1.5 w-64 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange to-yellow"
                  initial={{ width: "10%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.3, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          )}

          {step === "trophy" && (
            <motion.div
              key="trophy"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ type: "spring", stiffness: 120, damping: 14 }}
              className="space-y-4"
            >
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-yellow/10 border border-yellow/30 shadow-[0_0_50px_rgba(255,212,0,0.3)]">
                <span className="text-6xl" role="img" aria-label="Trophy">
                  🏆
                </span>
              </div>
              <p className="font-display text-3xl tracking-wider text-yellow">
                And the winner is...
              </p>
            </motion.div>
          )}

          {step === "winner" && (
            <motion.div
              key="winner"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 12 }}
              className="space-y-6"
            >
              {result.status === "NO_ELIGIBLE_WINNER" ? (
                <div className="space-y-4">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red/20 text-3xl">
                    ⚠️
                  </div>
                  <h2 className="font-display text-4xl text-red">
                    No Eligible Winner
                  </h2>
                  <p className="text-sm text-muted max-w-md mx-auto">
                    {result.statusExplanation}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="inline-block rounded-full border border-orange/40 bg-orange/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-orange">
                    AUCTION WINNER – BEST AUCTION SQUAD
                  </div>

                  {winners.length > 1 ? (
                    <div className="flex justify-center gap-6 my-4">
                      {winners.map((w) => (
                        <div key={w.teamId} className="flex flex-col items-center">
                          <TeamBadge name={w.teamName} logoUrl={w.logoUrl} color={w.colorPrimary} />
                          <h3 className="mt-2 font-display text-3xl text-white">{w.teamName}</h3>
                        </div>
                      ))}
                    </div>
                  ) : (
                    primaryWinner && (
                      <div className="space-y-3">
                        <div className="mx-auto flex justify-center">
                          <div
                            className="p-1 rounded-full shadow-[0_0_60px_var(--glow)]"
                            style={
                              {
                                "--glow": primaryWinner.colorPrimary || "#FF6B00",
                              } as React.CSSProperties
                            }
                          >
                            <TeamBadge
                              name={primaryWinner.teamName}
                              logoUrl={primaryWinner.logoUrl}
                              color={primaryWinner.colorPrimary}
                            />
                          </div>
                        </div>
                        <h2 className="font-display text-6xl text-white tracking-wide">
                          {primaryWinner.teamName}
                        </h2>
                      </div>
                    )
                  )}

                  <div className="rounded-2xl border border-white/10 bg-card/80 p-4 max-w-xs mx-auto backdrop-blur">
                    <span className="text-xs uppercase tracking-wider text-muted">
                      Squad Strength Score
                    </span>
                    <div className="font-display text-5xl text-yellow">
                      {counter.toFixed(1)} <span className="text-lg text-muted">/100</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted max-w-sm mx-auto">
                    {result.whyRankedFirst}
                  </p>
                </div>
              )}

              <button
                onClick={handleFinish}
                className="mt-6 rounded-xl bg-orange px-8 py-3 font-display text-xl tracking-wider text-black shadow-lg hover:brightness-110 transition"
              >
                View Full Results Dashboard &rarr;
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
