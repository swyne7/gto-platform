"use client";

import type { AnalysisResult, HandState, TextureLabel, RangeAdvantage, DecisionGrade, CoachingPoint } from "@/lib/analyzer";

const TEXTURE_CONFIG: Record<TextureLabel, { color: string; emoji: string }> = {
  dry:      { color: "#6b7280", emoji: "🏜" },
  paired:   { color: "#f59e0b", emoji: "♊" },
  wet:      { color: "#3b82f6", emoji: "💧" },
  dynamic:  { color: "#8b5cf6", emoji: "⚡" },
  monotone: { color: "#14b8a6", emoji: "🎨" },
};

const ADVANTAGE_CONFIG: Record<RangeAdvantage, { label: string; color: string }> = {
  hero_strong:    { label: "Hero — Strong Advantage", color: "#22c55e" },
  hero_slight:    { label: "Hero — Slight Advantage",  color: "#86efac" },
  neutral:        { label: "Neutral",                   color: "#6b7280" },
  villain_slight: { label: "Villain — Slight Advantage",color: "#fbbf24" },
  villain_strong: { label: "Villain — Strong Advantage",color: "#ef4444" },
};

const GRADE_CONFIG: Record<DecisionGrade, { label: string; color: string; bg: string }> = {
  gto_line:   { label: "GTO Line",     color: "#22c55e", bg: "#22c55e22" },
  good:       { label: "Good Play",    color: "#86efac", bg: "#86efac22" },
  acceptable: { label: "Acceptable",   color: "#3b82f6", bg: "#3b82f622" },
  mistake:    { label: "Mistake",      color: "#f59e0b", bg: "#f59e0b22" },
  blunder:    { label: "Major Error",  color: "#ef4444", bg: "#ef444422" },
};

const CATEGORY_ICONS: Record<string, string> = {
  texture:  "🃏",
  range:    "📊",
  spr:      "📐",
  sizing:   "🎯",
  position: "📍",
  equity:   "📈",
};

const SEVERITY_COLORS: Record<string, string> = {
  info:    "var(--accent-blue)",
  warning: "var(--accent-yellow)",
  error:   "var(--accent-red)",
};

function MetricBadge({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div
      className="rounded-xl border p-3 flex flex-col gap-1"
      style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
    >
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="text-xl font-black" style={{ color: color ?? "var(--text-primary)" }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{sub}</p>}
    </div>
  );
}

function RangeBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

interface Props {
  result: AnalysisResult;
  state: HandState;
  onReset: () => void;
}

export default function AnalysisPanel({ result, state, onReset }: Props) {
  const {
    spr, potOdds, mdf, texture, rangeAnalysis,
    grade, heroActionLabel, recommendedAction, recommendedSizingBB,
    coachingPoints, summary,
  } = result;

  const gradeConfig = GRADE_CONFIG[grade];
  const textureConfig = TEXTURE_CONFIG[texture.label];
  const advantageConfig = ADVANTAGE_CONFIG[rangeAnalysis.advantage];

  const sprLabel = spr < 3 ? "Shallow" : spr < 7 ? "Medium" : "Deep";
  const sprColor = spr < 3 ? "var(--accent-red)" : spr < 7 ? "var(--accent-yellow)" : "var(--accent-green)";

  const recLabel = recommendedAction === "bet" && recommendedSizingBB
    ? `Bet ${recommendedSizingBB.toFixed(1)}bb`
    : recommendedAction === "raise" && recommendedSizingBB
    ? `Raise to ${recommendedSizingBB.toFixed(1)}bb`
    : recommendedAction.charAt(0).toUpperCase() + recommendedAction.slice(1);

  const boardStr = state.board.map(c => {
    const sym: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
    return `${c.rank}${sym[c.suit]}`;
  }).join(" ");

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div
        className="rounded-xl border p-4 flex items-center justify-between"
        style={{ background: gradeConfig.bg, borderColor: gradeConfig.color }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-black" style={{ color: gradeConfig.color }}>
              {gradeConfig.label}
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {state.heroPosition} vs {state.villainPosition} · Board: {boardStr}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Your action</p>
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{heroActionLabel}</p>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricBadge label="SPR" value={String(spr)} sub={sprLabel} color={sprColor} />
        <div
          className="rounded-xl border p-3 flex flex-col gap-1"
          style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Board Texture</p>
          <p className="text-base font-black capitalize" style={{ color: textureConfig.color }}>
            {textureConfig.emoji} {texture.label}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{texture.description}</p>
        </div>
        {potOdds !== null && (
          <MetricBadge label="Pot Odds" value={`${potOdds}%`} sub="equity needed" color="var(--accent-yellow)" />
        )}
        {mdf !== null && (
          <MetricBadge label="MDF" value={`${mdf}%`} sub="min defend freq" color="var(--accent-blue)" />
        )}
        {potOdds === null && (
          <MetricBadge label="Pot Size" value={`${state.potAfterPreflopBB}bb`} sub="after preflop" />
        )}
        {mdf === null && (
          <MetricBadge label="Stack" value={`${state.effectiveStackBB}bb`} sub="effective" />
        )}
      </div>

      {/* Range advantage */}
      <div
        className="rounded-xl border p-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            Range Analysis
          </p>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: `${advantageConfig.color}22`, color: advantageConfig.color }}
          >
            {advantageConfig.label}
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <RangeBar label="Hero top pair+" pct={rangeAnalysis.heroTopPairPlusPct} color="#22c55e" />
          <RangeBar label="Villain top pair+" pct={rangeAnalysis.villainTopPairPlusPct} color="#ef4444" />
          <RangeBar label="Hero nuts (sets / two pair+)" pct={rangeAnalysis.heroNutsPct} color="#86efac" />
          <RangeBar label="Villain nuts" pct={rangeAnalysis.villainNutsPct} color="#fca5a5" />
        </div>
        <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>
          {rangeAnalysis.explanation}
        </p>
      </div>

      {/* Recommended vs actual */}
      <div
        className="rounded-xl border p-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
          Decision Comparison
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-xl p-3 border"
            style={{ background: "var(--surface-2)", borderColor: gradeConfig.color }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Your Play</p>
            <p className="text-base font-bold" style={{ color: gradeConfig.color }}>{heroActionLabel}</p>
          </div>
          <div
            className="rounded-xl p-3 border"
            style={{ background: "var(--surface-2)", borderColor: "#22c55e" }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Recommended</p>
            <p className="text-base font-bold" style={{ color: "#22c55e" }}>{recLabel}</p>
          </div>
        </div>
      </div>

      {/* Coaching points */}
      {coachingPoints.length > 0 && (
        <div
          className="rounded-xl border p-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
            Coaching Notes
          </p>
          <div className="flex flex-col gap-2">
            {coachingPoints.map((point: CoachingPoint, i: number) => (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-xl border-l-2"
                style={{
                  background: "var(--surface-2)",
                  borderLeftColor: SEVERITY_COLORS[point.severity],
                }}
              >
                <span className="text-base flex-shrink-0">{CATEGORY_ICONS[point.category] ?? "•"}</span>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {point.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div
        className="rounded-xl border p-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
          Summary
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
          {summary}
        </p>
      </div>

      {/* Reset */}
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
