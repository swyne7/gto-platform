"use client";

import { calculatePotOdds, calculateMDF } from "@/lib/analyzer";
import type { PostflopAction, BoardCard } from "@/lib/analyzer";
import HoleCardsDisplay from "@/components/analyze/HoleCardsDisplay";

const ACTIONS: { value: PostflopAction; label: string }[] = [
  { value: "check", label: "Check" },
  { value: "bet",   label: "Bet" },
  { value: "call",  label: "Call" },
  { value: "raise", label: "Raise" },
  { value: "fold",  label: "Fold" },
];

const SIZING_PRESETS = [
  { label: "¼ pot", mult: 0.25 },
  { label: "⅓ pot", mult: 0.33 },
  { label: "½ pot", mult: 0.5  },
  { label: "⅔ pot", mult: 0.67 },
  { label: "¾ pot", mult: 0.75 },
  { label: "Pot",   mult: 1.0  },
  { label: "1.5×",  mult: 1.5  },
];

interface Props {
  board: BoardCard[];
  potAfterPreflopBB: number;
  effectiveStackBB: number;
  heroAction: PostflopAction | null;
  heroSizingBB: number | undefined;
  villainBetSizingBB: number | undefined;
  heroCard1?: BoardCard | null;
  heroCard2?: BoardCard | null;
  onChange: (update: {
    heroAction?: PostflopAction;
    heroSizingBB?: number;
    villainBetSizingBB?: number;
  }) => void;
  onAnalyze: () => void;
  onBack: () => void;
}

function CardDisplay({ card }: { card: BoardCard }) {
  const isRed = card.suit === "h" || card.suit === "d";
  const symbols: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
  return (
    <span
      className="inline-flex items-center justify-center w-9 h-12 rounded-lg text-sm font-black border"
      style={{
        background: "var(--surface-2)",
        borderColor: "var(--border)",
        color: isRed ? "#ef4444" : "var(--text-primary)",
      }}
    >
      {card.rank}{symbols[card.suit]}
    </span>
  );
}

export default function ActionWizard({
  board, potAfterPreflopBB, effectiveStackBB,
  heroAction, heroSizingBB, villainBetSizingBB,
  heroCard1, heroCard2,
  onChange, onAnalyze, onBack,
}: Props) {
  const needsSizing = heroAction === "bet" || heroAction === "raise";
  const potOdds = villainBetSizingBB && villainBetSizingBB > 0
    ? calculatePotOdds(villainBetSizingBB, potAfterPreflopBB)
    : null;
  const mdf = villainBetSizingBB && villainBetSizingBB > 0
    ? calculateMDF(villainBetSizingBB, potAfterPreflopBB)
    : null;

  const canAnalyze =
    heroAction !== null &&
    (!needsSizing || (heroSizingBB != null && heroSizingBB > 0));

  const street = board.length === 3 ? "Flop" : board.length === 4 ? "Turn" : "River";

  return (
    <div className="flex flex-col gap-6">

      {/* Hole cards + hand evaluation */}
      {heroCard1 && heroCard2 && (
        <HoleCardsDisplay card1={heroCard1} card2={heroCard2} board={board} />
      )}

      {/* Board display */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
          {street} · {potAfterPreflopBB}bb pot · {effectiveStackBB}bb effective
        </p>
        <div className="flex gap-2">
          {board.map((card, i) => <CardDisplay key={i} card={card} />)}
        </div>
      </div>

      {/* Villain bet (optional) */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
          Are you facing a bet?
        </p>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="Villain bet size in BB (leave empty if hero acts first)"
            value={villainBetSizingBB ?? ""}
            onChange={e => onChange({ villainBetSizingBB: parseFloat(e.target.value) || undefined })}
            className="flex-1 px-3 py-2.5 rounded-xl text-sm border outline-none"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
          {villainBetSizingBB && villainBetSizingBB > 0 && (
            <button
              onClick={() => onChange({ villainBetSizingBB: undefined })}
              className="px-3 py-2.5 rounded-xl text-xs"
              style={{ background: "var(--border)", color: "var(--text-secondary)" }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Live pot odds display */}
        {potOdds !== null && mdf !== null && (
          <div className="flex gap-3 mt-2">
            <div
              className="flex-1 rounded-lg p-2.5 border text-center"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Pot Odds</p>
              <p className="text-base font-bold" style={{ color: "var(--accent-yellow)" }}>{potOdds}%</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>equity needed</p>
            </div>
            <div
              className="flex-1 rounded-lg p-2.5 border text-center"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>MDF</p>
              <p className="text-base font-bold" style={{ color: "var(--accent-blue)" }}>{mdf}%</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>min defend freq</p>
            </div>
          </div>
        )}
      </div>

      {/* Hero action */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
          Your Action
        </p>
        <div className="flex gap-2">
          {ACTIONS.map(({ value, label }) => {
            // Hide call/fold/raise if not facing a bet
            if (!villainBetSizingBB && (value === "call" || value === "fold")) return null;
            return (
              <button
                key={value}
                onClick={() => onChange({ heroAction: value, heroSizingBB: undefined })}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors"
                style={{
                  background: heroAction === value ? "var(--accent-blue)" : "var(--surface-2)",
                  color: heroAction === value ? "#fff" : "var(--text-secondary)",
                  border: `1px solid ${heroAction === value ? "var(--accent-blue)" : "var(--border)"}`,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sizing input */}
      {needsSizing && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
            {heroAction === "bet" ? "Bet" : "Raise to"} Size (BB)
          </p>
          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {SIZING_PRESETS.map(({ label, mult }) => {
              const sizeBB = parseFloat((potAfterPreflopBB * mult).toFixed(1));
              return (
                <button
                  key={label}
                  onClick={() => onChange({ heroSizingBB: sizeBB })}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: heroSizingBB === sizeBB ? "var(--accent-yellow)" : "var(--surface-2)",
                    color: heroSizingBB === sizeBB ? "#000" : "var(--text-secondary)",
                  }}
                >
                  {label} ({sizeBB}bb)
                </button>
              );
            })}
          </div>
          <input
            type="number"
            placeholder="Custom size in BB"
            value={heroSizingBB ?? ""}
            onChange={e => onChange({ heroSizingBB: parseFloat(e.target.value) || undefined })}
            className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
        </div>
      )}

      {/* Nav */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl text-sm font-bold border"
          style={{ background: "transparent", borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          ← Back
        </button>
        <button
          onClick={onAnalyze}
          disabled={!canAnalyze}
          className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
          style={{
            background: canAnalyze ? "var(--accent-green)" : "var(--surface-2)",
            color: canAnalyze ? "#000" : "var(--text-secondary)",
            cursor: canAnalyze ? "pointer" : "not-allowed",
          }}
        >
          Analyze Hand →
        </button>
      </div>
    </div>
  );
}
