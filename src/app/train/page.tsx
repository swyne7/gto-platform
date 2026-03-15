"use client";

import { useState, useEffect, useCallback } from "react";
import HandGrid from "@/components/range/HandGrid";
import { RANGES } from "@/data/preflop-ranges";
import type { RangeData } from "@/data/preflop-ranges";
import {
  generateSpot,
  scoreDecision,
  getStreakFromStorage,
  saveStreakToStorage,
} from "@/lib/training";
import type { TrainingSpot, DecisionResult } from "@/lib/training";


type Phase = "question" | "feedback";

interface SessionStats {
  total: number;
  correct: number;
  streak: number;
}

const POSITION_COLOR: Record<string, string> = {
  UTG: "#ef4444",
  HJ:  "#f97316",
  CO:  "#eab308",
  BTN: "#22c55e",
  SB:  "#3b82f6",
  BB:  "#8b5cf6",
};

export default function TrainPage() {
  const [spot, setSpot] = useState<TrainingSpot | null>(null);
  const [phase, setPhase] = useState<Phase>("question");
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [stats, setStats] = useState<SessionStats>({ total: 0, correct: 0, streak: 0 });

  const loadNewSpot = useCallback(() => {
    setSpot(generateSpot());
    setPhase("question");
    setResult(null);
  }, []);

  useEffect(() => {
    const savedStreak = getStreakFromStorage();
    setStats((s) => ({ ...s, streak: savedStreak }));
    loadNewSpot();
  }, [loadNewSpot]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase === "question") {
        if (e.key === "y" || e.key === "1") handleDecision("yes");
        if (e.key === "n" || e.key === "2") handleDecision("no");
      } else {
        if (e.key === " " || e.key === "Enter") loadNewSpot();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  function handleDecision(choice: "yes" | "no") {
    if (!spot || phase !== "question") return;
    const res = scoreDecision(spot, choice);
    setResult(res);
    setPhase("feedback");

    setStats((prev) => {
      const newTotal = prev.total + 1;
      const newCorrect = prev.correct + (res.correct ? 1 : 0);
      // Only count non-mixed spots for streak
      const streakIncrement = spot.correctAction !== "mixed" && res.correct ? 1 : 0;
      const newStreak = prev.streak + streakIncrement;
      saveStreakToStorage(newStreak);
      return { total: newTotal, correct: newCorrect, streak: newStreak };
    });
  }

  const range: RangeData = spot
    ? (RANGES[spot.position]?.[spot.action] ?? {})
    : {};

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Preflop Trainer
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            100BB cash game · 6-max
          </p>
        </div>

        {/* Session stats */}
        <div className="flex gap-4">
          {[
            { label: "Hands",    value: stats.total },
            { label: "Accuracy", value: accuracy !== null ? `${accuracy}%` : "—" },
            { label: "Streak",   value: stats.streak },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="text-center rounded-xl px-4 py-2 border"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</p>
              <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-6 flex-wrap">
        {/* Hand grid (shows correct range after answer) */}
        <div
          className="rounded-xl border p-5"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <p className="text-xs font-medium mb-3 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            {spot ? `${spot.position} · ${spot.actionLabel}` : "Loading..."}
            {phase === "question" && (
              <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
                Revealed after answer
              </span>
            )}
          </p>
          <HandGrid
            range={phase === "feedback" ? range : {}}
            highlightCombo={spot?.hand ?? null}
            size="md"
          />
        </div>

        {/* Decision panel */}
        <div className="flex-1 min-w-64 flex flex-col gap-4">
          {spot && (
            <>
              {/* The hand */}
              <div
                className="rounded-xl border p-6 text-center"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-4"
                  style={{
                    background: `${POSITION_COLOR[spot.position]}22`,
                    color: POSITION_COLOR[spot.position],
                    border: `1px solid ${POSITION_COLOR[spot.position]}44`,
                  }}
                >
                  {spot.position}
                </div>
                <div
                  className="text-5xl font-black mb-2 tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {spot.handLabel}
                </div>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {spot.hand}
                </p>
              </div>

              {/* Question */}
              {phase === "question" && (
                <div
                  className="rounded-xl border p-5"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <p className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                    Do you <span style={{ color: "var(--accent-green)" }}>{spot.actionLabel}</span>?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDecision("yes")}
                      className="flex-1 py-3 rounded-xl text-sm font-bold transition-all hover:brightness-110 active:scale-95"
                      style={{ background: "var(--accent-green)", color: "#000" }}
                    >
                      Yes  <span className="opacity-60 text-xs ml-1">[Y]</span>
                    </button>
                    <button
                      onClick={() => handleDecision("no")}
                      className="flex-1 py-3 rounded-xl text-sm font-bold transition-all hover:brightness-110 active:scale-95"
                      style={{ background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                    >
                      No  <span className="opacity-60 text-xs ml-1">[N]</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Feedback */}
              {phase === "feedback" && result && (
                <div
                  className="rounded-xl border p-5"
                  style={{
                    background: "var(--surface)",
                    borderColor: result.correct ? "var(--accent-green)" : "var(--accent-red)",
                    borderWidth: 1.5,
                  }}
                >
                  {/* Result header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {result.correct ? "✓" : "✗"}
                      </span>
                      <span
                        className="text-base font-bold"
                        style={{ color: result.correct ? "var(--accent-green)" : "var(--accent-red)" }}
                      >
                        {result.correct ? "Correct" : "Mistake"}
                      </span>
                    </div>
                    <span
                      className="text-sm font-semibold px-2 py-1 rounded-lg"
                      style={{
                        background: result.correct ? "#22c55e22" : "#ef444422",
                        color: result.correct ? "var(--accent-green)" : "var(--accent-red)",
                      }}
                    >
                      {result.evFeedback}
                    </span>
                  </div>

                  {/* GTO frequency bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span style={{ color: "var(--text-secondary)" }}>GTO frequency</span>
                      <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                        {Math.round(result.gtoFrequency * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round(result.gtoFrequency * 100)}%`,
                          background:
                            result.gtoFrequency >= 0.85 ? "var(--accent-green)"
                            : result.gtoFrequency <= 0.15 ? "var(--accent-red)"
                            : "var(--accent-yellow)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Explanation */}
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {result.explanation}
                  </p>

                  {/* Next hand */}
                  <button
                    onClick={loadNewSpot}
                    className="w-full mt-4 py-3 rounded-xl text-sm font-bold transition-all hover:brightness-110 active:scale-95"
                    style={{ background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                  >
                    Next Hand  <span className="opacity-60 text-xs ml-1">[Space]</span>
                  </button>
                </div>
              )}

              {/* Keyboard hint */}
              {phase === "question" && (
                <p className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>
                  Press Y / N or click the buttons
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
