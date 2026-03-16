"use client";

import type { AnalysisResult, BoardCard, DecisionGrade } from "@/lib/analyzer";
import { TEXTURE_COLORS } from "@/components/analyze/BoardBuilder";
import HoleCardsDisplay from "@/components/analyze/HoleCardsDisplay";

const GRADE_CONFIG: Record<DecisionGrade, { label: string; color: string; bg: string }> = {
  gto_line:   { label: "GTO Line",   color: "#22c55e", bg: "#22c55e18" },
  good:       { label: "Good",       color: "#86efac", bg: "#86efac18" },
  acceptable: { label: "Acceptable", color: "#3b82f6", bg: "#3b82f618" },
  mistake:    { label: "Mistake",    color: "#f59e0b", bg: "#f59e0b18" },
  blunder:    { label: "Major Error",color: "#ef4444", bg: "#ef444418" },
};

const SEVERITY_COLORS: Record<string, string> = {
  info:    "var(--accent-blue)",
  warning: "var(--accent-yellow)",
  error:   "var(--accent-red)",
};

function BoardDisplay({ board }: { board: BoardCard[] }) {
  const sym: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
  const isRed = (s: string) => s === "h" || s === "d";
  return (
    <div className="flex gap-1.5">
      {board.map((c, i) => (
        <span
          key={i}
          className="text-sm font-black"
          style={{ color: isRed(c.suit) ? "#ef4444" : "var(--text-primary)" }}
        >
          {c.rank}{sym[c.suit]}
        </span>
      ))}
    </div>
  );
}

interface Props {
  streetName: "Flop" | "Turn" | "River";
  board: BoardCard[];
  result: AnalysisResult;
  potAtStart: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  heroCard1?: BoardCard | null;
  heroCard2?: BoardCard | null;
  // Navigation options — only shown when this is the current/last result
  showNav?: boolean;
  onAddTurn?: () => void;
  onAddRiver?: () => void;
  onViewSummary?: () => void;
}

export default function StreetResultCard({
  streetName, board, result, potAtStart,
  isExpanded, onToggleExpand,
  heroCard1, heroCard2,
  showNav, onAddTurn, onAddRiver, onViewSummary,
}: Props) {
  const { grade, heroActionLabel, recommendedAction, recommendedSizingBB,
          coachingPoints, texture, spr } = result;
  const gradeConfig = GRADE_CONFIG[grade];

  const recLabel = recommendedAction === "bet" && recommendedSizingBB
    ? `Bet ${recommendedSizingBB.toFixed(1)}bb`
    : recommendedAction === "raise" && recommendedSizingBB
    ? `Raise to ${recommendedSizingBB.toFixed(1)}bb`
    : recommendedAction.charAt(0).toUpperCase() + recommendedAction.slice(1);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: gradeConfig.color, background: "var(--surface)" }}
    >
      {/* Header row — always visible */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        style={{ background: gradeConfig.bg }}
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
            style={{ background: gradeConfig.bg, color: gradeConfig.color, border: `1px solid ${gradeConfig.color}44` }}
          >
            {streetName}
          </span>
          <BoardDisplay board={board} />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {potAtStart}bb pot
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded"
            style={{ color: gradeConfig.color }}
          >
            {gradeConfig.label}
          </span>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {isExpanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-4 py-4 flex flex-col gap-4 border-t" style={{ borderColor: "var(--border)" }}>
          {/* Hole cards + hand evaluation */}
          {heroCard1 && heroCard2 && (
            <HoleCardsDisplay card1={heroCard1} card2={heroCard2} board={board} />
          )}

          {/* Metrics row */}
          <div className="flex gap-3 flex-wrap">
            <div
              className="rounded-lg px-3 py-2 border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>SPR</p>
              <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{spr}</p>
            </div>
            <div
              className="rounded-lg px-3 py-2 border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Texture</p>
              <p
                className="text-base font-bold capitalize"
                style={{ color: TEXTURE_COLORS[texture.label] }}
              >
                {texture.label}
              </p>
            </div>
            <div
              className="rounded-lg px-3 py-2 border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Range edge</p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
                {result.rangeAnalysis.advantage.replace(/_/g, " ")}
              </p>
            </div>
          </div>

          {/* Decision comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-xl p-3 border"
              style={{ background: "var(--surface-2)", borderColor: gradeConfig.color }}
            >
              <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Your play</p>
              <p className="text-sm font-bold" style={{ color: gradeConfig.color }}>{heroActionLabel}</p>
            </div>
            <div
              className="rounded-xl p-3 border"
              style={{ background: "var(--surface-2)", borderColor: "#22c55e" }}
            >
              <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Recommended</p>
              <p className="text-sm font-bold" style={{ color: "#22c55e" }}>{recLabel}</p>
            </div>
          </div>

          {/* Coaching points */}
          {coachingPoints.length > 0 && (
            <div className="flex flex-col gap-2">
              {coachingPoints.slice(0, 2).map((pt, i) => (
                <div
                  key={i}
                  className="flex gap-2 p-2.5 rounded-lg border-l-2"
                  style={{ background: "var(--surface-2)", borderLeftColor: SEVERITY_COLORS[pt.severity] }}
                >
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {pt.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {result.summary}
          </p>
        </div>
      )}

      {/* Navigation buttons — only on the active/last street */}
      {showNav && (
        <div
          className="flex gap-2 px-4 py-3 border-t flex-wrap"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          {onAddTurn && (
            <button
              onClick={onAddTurn}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-colors"
              style={{ background: "var(--accent-blue)", color: "#fff" }}
            >
              + Add Turn
            </button>
          )}
          {onAddRiver && (
            <button
              onClick={onAddRiver}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-colors"
              style={{ background: "var(--accent-blue)", color: "#fff" }}
            >
              + Add River
            </button>
          )}
          {onViewSummary && (
            <button
              onClick={onViewSummary}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-colors"
              style={{ background: "var(--accent-green)", color: "#000" }}
            >
              View Full Hand Summary →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
