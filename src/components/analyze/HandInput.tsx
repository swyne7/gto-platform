"use client";

import HandGrid from "@/components/range/HandGrid";
import { CardPicker } from "@/components/analyze/BoardBuilder";
import { cardsToComboKey } from "@/lib/handEvaluator";
import { RANGES } from "@/data/preflop-ranges";
import type { RangeData } from "@/data/preflop-ranges";
import type { Position } from "@/lib/training";
import type { PreflopScenario } from "@/lib/analyzer";
import type { BoardCard } from "@/lib/analyzer";

const POSITIONS: Position[] = ["UTG", "UTG+1", "UTG+2", "LJ", "HJ", "CO", "BTN", "SB", "BB"];

const SCENARIO_OPTIONS: { value: PreflopScenario; label: string; desc: string }[] = [
  { value: "single_raised_ip",  label: "SRP — Hero IP",      desc: "You opened or called in position" },
  { value: "single_raised_oop", label: "SRP — Hero OOP",     desc: "You defended BB or called OOP" },
  { value: "three_bet_ip",      label: "3-bet pot — Hero IP", desc: "You 3-bet or called a 3-bet in position" },
  { value: "three_bet_oop",     label: "3-bet pot — Hero OOP",desc: "You faced a 3-bet out of position" },
];

interface Props {
  heroHand: string;
  heroCard1: BoardCard | null;
  heroCard2: BoardCard | null;
  heroPosition: Position | null;
  villainPosition: Position | null;
  preflopScenario: PreflopScenario;
  onHeroHand: (hand: string) => void;
  onHeroCards: (c1: BoardCard | null, c2: BoardCard | null) => void;
  onHeroPosition: (pos: Position) => void;
  onVillainPosition: (pos: Position) => void;
  onScenario: (s: PreflopScenario) => void;
  onNext: () => void;
}

export default function HandInput({
  heroHand, heroCard1, heroCard2, heroPosition, villainPosition, preflopScenario,
  onHeroHand, onHeroCards, onHeroPosition, onVillainPosition, onScenario, onNext,
}: Props) {
  const hintRange: RangeData = heroPosition
    ? (RANGES[heroPosition]?.["open"] ?? {})
    : {};

  const usedCards: BoardCard[] = [
    ...(heroCard1 ? [heroCard1] : []),
    ...(heroCard2 ? [heroCard2] : []),
  ];

  function handleCard1(card: BoardCard | null) {
    const c2 = heroCard2;
    onHeroCards(card, c2);
    if (card && c2) onHeroHand(cardsToComboKey(card, c2));
  }

  function handleCard2(card: BoardCard | null) {
    const c1 = heroCard1;
    onHeroCards(c1, card);
    if (c1 && card) onHeroHand(cardsToComboKey(c1, card));
  }

  const canNext = !!heroCard1 && !!heroCard2 && !!heroPosition && !!villainPosition;

  return (
    <div className="flex flex-col gap-6">
      {/* Positions */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
            Your Position (Hero)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {POSITIONS.map(pos => (
              <button
                key={pos}
                onClick={() => onHeroPosition(pos)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  background: heroPosition === pos ? "var(--accent-green)" : "var(--surface-2)",
                  color: heroPosition === pos ? "#000" : "var(--text-secondary)",
                }}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
            Villain Position
          </p>
          <div className="flex flex-wrap gap-1.5">
            {POSITIONS.map(pos => (
              <button
                key={pos}
                onClick={() => onVillainPosition(pos)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  background: villainPosition === pos ? "var(--accent-blue)" : "var(--surface-2)",
                  color: villainPosition === pos ? "#fff" : "var(--text-secondary)",
                }}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preflop scenario */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
          Preflop Scenario
        </p>
        <div className="grid grid-cols-2 gap-2">
          {SCENARIO_OPTIONS.map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => onScenario(value)}
              className="p-3 rounded-xl border text-left transition-colors"
              style={{
                background: preflopScenario === value ? "var(--surface-2)" : "transparent",
                borderColor: preflopScenario === value ? "var(--accent-blue)" : "var(--border)",
              }}
            >
              <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{label}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Exact hole cards */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            Your Hole Cards
          </p>
          {heroHand && (
            <span className="text-lg font-black" style={{ color: "var(--accent-green)" }}>
              {heroHand}
            </span>
          )}
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
          Pick both cards with exact suits. The grid below shows your position range as a guide.
        </p>
        <div className="flex gap-3 flex-wrap mb-4">
          <CardPicker
            label="Card 1"
            value={heroCard1}
            onChange={handleCard1}
            usedCards={usedCards.filter(c => c !== heroCard1)}
          />
          <CardPicker
            label="Card 2"
            value={heroCard2}
            onChange={handleCard2}
            usedCards={usedCards.filter(c => c !== heroCard2)}
          />
        </div>
        <HandGrid
          range={hintRange}
          highlightCombo={heroHand || null}
          size="sm"
        />
      </div>

      {/* Next */}
      <button
        onClick={onNext}
        disabled={!canNext}
        className="py-3 rounded-xl text-sm font-bold transition-all"
        style={{
          background: canNext ? "var(--accent-green)" : "var(--surface-2)",
          color: canNext ? "#000" : "var(--text-secondary)",
          cursor: canNext ? "pointer" : "not-allowed",
        }}
      >
        Next: Set Up the Board →
      </button>
    </div>
  );
}
