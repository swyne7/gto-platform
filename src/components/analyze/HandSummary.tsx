"use client";

import type { AnalysisResult, BoardCard, DecisionGrade } from "@/lib/analyzer";
import StreetResultCard from "@/components/analyze/StreetResultCard";
import { useState } from "react";
import HoleCardsDisplay from "@/components/analyze/HoleCardsDisplay";

interface StreetResult {
  streetName: "Flop" | "Turn" | "River";
  board: BoardCard[];
  potAtStart: number;
  result: AnalysisResult;
}

const GRADE_WEIGHT: Record<DecisionGrade, number> = {
  gto_line: 0, good: 0, acceptable: 0, mistake: 1, blunder: 3,
};

const GRADE_CONFIG: Record<DecisionGrade, { label: string; color: string }> = {
  gto_line:   { label: "GTO Line",    color: "#22c55e" },
  good:       { label: "Good Play",   color: "#86efac" },
  acceptable: { label: "Acceptable",  color: "#3b82f6" },
  mistake:    { label: "Mistake",     color: "#f59e0b" },
  blunder:    { label: "Major Error", color: "#ef4444" },
};

interface Props {
  streets: StreetResult[];
  heroHand: string;
  heroCard1?: BoardCard | null;
  heroCard2?: BoardCard | null;
  onReset: () => void;
}

export default function HandSummary({ streets, heroHand, heroCard1, heroCard2, onReset }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Flop: true, Turn: true, River: true,
  });

  // Overall hand grade = worst street grade
  const totalWeight = streets.reduce((sum, s) => sum + GRADE_WEIGHT[s.result.grade], 0);
  let overallGrade: DecisionGrade;
  if (totalWeight === 0)       overallGrade = "gto_line";
  else if (totalWeight <= 1)   overallGrade = "good";
  else if (totalWeight <= 2)   overallGrade = "acceptable";
  else if (totalWeight <= 4)   overallGrade = "mistake";
  else                         overallGrade = "blunder";

  const overallConfig = GRADE_CONFIG[overallGrade];

  // Count mistakes
  const mistakeStreets = streets.filter(s =>
    s.result.grade === "mistake" || s.result.grade === "blunder"
  );
  const goodStreets = streets.filter(s =>
    s.result.grade === "gto_line" || s.result.grade === "good"
  );

  // Build overall summary text
  let overallText = "";
  if (mistakeStreets.length === 0) {
    overallText = `Well played hand overall. You made correct or near-correct decisions on all ${streets.length} street${streets.length > 1 ? "s" : ""} with ${heroHand}.`;
  } else if (mistakeStreets.length === 1) {
    overallText = `Mostly solid hand. One significant deviation on the ${mistakeStreets[0].streetName.toLowerCase()} — expand that street below for coaching details.`;
  } else {
    const streetNames = mistakeStreets.map(s => s.streetName.toLowerCase()).join(" and ");
    overallText = `Multiple deviations this hand — on the ${streetNames}. Review each street's coaching notes to identify the patterns in your mistakes.`;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Overall grade card */}
      <div
        className="rounded-xl border p-5"
        style={{ background: `${overallConfig.color}18`, borderColor: overallConfig.color }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
              Full Hand Report
            </p>
            <p className="text-xl font-black" style={{ color: overallConfig.color }}>
              {overallConfig.label}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Hand</p>
            <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{heroHand}</p>
          </div>
        </div>

        {/* Street grade pills */}
        <div className="flex gap-2 flex-wrap mb-3">
          {streets.map(s => {
            const cfg = GRADE_CONFIG[s.result.grade];
            return (
              <span
                key={s.streetName}
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}44` }}
              >
                {s.streetName}: {cfg.label}
              </span>
            );
          })}
        </div>

        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {overallText}
        </p>

        {/* Hole cards on final board */}
        {heroCard1 && heroCard2 && streets.length > 0 && (
          <div className="mt-3">
            <HoleCardsDisplay
              card1={heroCard1}
              card2={heroCard2}
              board={streets[streets.length - 1].board}
            />
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="rounded-xl border p-3 text-center"
          style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
        >
          <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Streets Played</p>
          <p className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{streets.length}</p>
        </div>
        <div
          className="rounded-xl border p-3 text-center"
          style={{ background: "var(--surface-2)", borderColor: "#22c55e" }}
        >
          <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Good Decisions</p>
          <p className="text-2xl font-black" style={{ color: "#22c55e" }}>{goodStreets.length}</p>
        </div>
        <div
          className="rounded-xl border p-3 text-center"
          style={{ background: "var(--surface-2)", borderColor: mistakeStreets.length > 0 ? "#f59e0b" : "var(--border)" }}
        >
          <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Mistakes</p>
          <p className="text-2xl font-black" style={{ color: mistakeStreets.length > 0 ? "#f59e0b" : "var(--text-secondary)" }}>
            {mistakeStreets.length}
          </p>
        </div>
      </div>

      {/* Per-street results */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          Street-by-Street Breakdown
        </p>
        {streets.map(s => (
          <StreetResultCard
            key={s.streetName}
            streetName={s.streetName}
            board={s.board}
            result={s.result}
            potAtStart={s.potAtStart}
            heroCard1={heroCard1}
            heroCard2={heroCard2}
            isExpanded={!!expanded[s.streetName]}
            onToggleExpand={() =>
              setExpanded(prev => ({ ...prev, [s.streetName]: !prev[s.streetName] }))
            }
          />
        ))}
      </div>

      <button
        onClick={onReset}
        className="py-3 rounded-xl text-sm font-bold border transition-all hover:brightness-110"
        style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
      >
        Analyze Another Hand
      </button>
    </div>
  );
}
