"use client";

import { useState, useEffect } from "react";
import { calculatePotOdds, calculateMDF } from "@/lib/analyzer";
import type { PostflopAction, BoardCard } from "@/lib/analyzer";
import HoleCardsDisplay from "@/components/analyze/HoleCardsDisplay";

const VILLAIN_BET_PRESETS = [
  { label: "¼ pot", mult: 0.25 },
  { label: "⅓ pot", mult: 0.33 },
  { label: "½ pot", mult: 0.5  },
  { label: "⅔ pot", mult: 0.67 },
  { label: "¾ pot", mult: 0.75 },
  { label: "Pot",   mult: 1.0  },
  { label: "1.5×",  mult: 1.5  },
];

const HERO_BET_PRESETS = [
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
    heroAction?: PostflopAction | null;
    heroSizingBB?: number;
    villainBetSizingBB?: number | null;
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
  // Track whether the user has explicitly chosen "facing a bet" or "check to me"
  // null = not yet chosen
  const [facingBet, setFacingBet] = useState<boolean | null>(
    villainBetSizingBB != null && villainBetSizingBB > 0 ? true
    : villainBetSizingBB === 0 ? false
    : null
  );

  // Keep facingBet in sync if parent resets state (e.g. navigating back/forward)
  useEffect(() => {
    if (villainBetSizingBB == null && facingBet === true) setFacingBet(null);
  }, [villainBetSizingBB]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectCheckToMe() {
    setFacingBet(false);
    // Clear villain bet and any call/fold action the hero had selected
    const resetAction = heroAction === "call" || heroAction === "fold" || heroAction === "raise"
      ? null : heroAction;
    onChange({ villainBetSizingBB: null, heroAction: resetAction ?? undefined, heroSizingBB: undefined });
  }

  function selectFacingBet() {
    setFacingBet(true);
    // Clear check/bet actions that don't apply when facing a bet
    const resetAction = heroAction === "check" || heroAction === "bet"
      ? null : heroAction;
    onChange({ heroAction: resetAction ?? undefined, heroSizingBB: undefined });
  }

  const facing = facingBet === true;
  const needsSizing = heroAction === "bet" || heroAction === "raise";

  const potOdds = facing && villainBetSizingBB && villainBetSizingBB > 0
    ? calculatePotOdds(villainBetSizingBB, potAfterPreflopBB)
    : null;
  const mdf = facing && villainBetSizingBB && villainBetSizingBB > 0
    ? calculateMDF(villainBetSizingBB, potAfterPreflopBB)
    : null;

  const betAmountSet = facing ? (villainBetSizingBB != null && villainBetSizingBB > 0) : true;

  const canAnalyze =
    facingBet !== null &&
    heroAction !== null &&
    betAmountSet &&
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

      {/* ── Step 1: Facing a bet? ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
          Are you facing a bet?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={selectCheckToMe}
            className="py-3 rounded-xl text-sm font-bold border transition-colors"
            style={{
              background: facingBet === false ? "var(--surface-2)" : "transparent",
              borderColor: facingBet === false ? "var(--accent-green)" : "var(--border)",
              color: facingBet === false ? "var(--accent-green)" : "var(--text-secondary)",
            }}
          >
            ✓ Check to me
          </button>
          <button
            onClick={selectFacingBet}
            className="py-3 rounded-xl text-sm font-bold border transition-colors"
            style={{
              background: facingBet === true ? "var(--surface-2)" : "transparent",
              borderColor: facingBet === true ? "var(--accent-yellow)" : "var(--border)",
              color: facingBet === true ? "var(--accent-yellow)" : "var(--text-secondary)",
            }}
          >
            ↑ Facing a bet
          </button>
        </div>
      </div>

      {/* ── Step 2 (if facing a bet): villain bet amount ── */}
      {facingBet === true && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
            Villain bet size (BB)
          </p>
          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {VILLAIN_BET_PRESETS.map(({ label, mult }) => {
              const sizeBB = parseFloat((potAfterPreflopBB * mult).toFixed(1));
              return (
                <button
                  key={label}
                  onClick={() => onChange({ villainBetSizingBB: sizeBB })}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: villainBetSizingBB === sizeBB ? "var(--accent-yellow)" : "var(--surface-2)",
                    color: villainBetSizingBB === sizeBB ? "#000" : "var(--text-secondary)",
                  }}
                >
                  {label} ({sizeBB}bb)
                </button>
              );
            })}
          </div>
          <input
            type="number"
            placeholder="Custom villain bet in BB"
            value={villainBetSizingBB ?? ""}
            onChange={e => onChange({ villainBetSizingBB: parseFloat(e.target.value) || undefined })}
            className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          />

          {/* Live pot odds + MDF */}
          {potOdds !== null && mdf !== null && (
            <div className="flex gap-3 mt-3">
              <div
                className="flex-1 rounded-lg p-2.5 border text-center"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
              >
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Pot Odds</p>
                <p className="text-base font-bold" style={{ color: "var(--accent-yellow)" }}>{potOdds}%</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>equity needed to call</p>
              </div>
              <div
                className="flex-1 rounded-lg p-2.5 border text-center"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
              >
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>MDF</p>
                <p className="text-base font-bold" style={{ color: "var(--accent-blue)" }}>{mdf}%</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>min defend frequency</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Hero action (only shown once facing-bet choice is made) ── */}
      {facingBet !== null && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
            Your Action
          </p>
          <div className="flex gap-2">
            {!facing && (
              <>
                {(["check", "bet"] as PostflopAction[]).map(value => (
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
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </>
            )}
            {facing && (
              <>
                {(["call", "raise", "fold"] as PostflopAction[]).map(value => (
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
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Hero sizing (bet or raise) ── */}
      {needsSizing && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
            {heroAction === "bet" ? "Your Bet" : "Raise to"} Size (BB)
          </p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {HERO_BET_PRESETS.map(({ label, mult }) => {
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
          Analyze Street →
        </button>
      </div>
    </div>
  );
}
