"use client";

import { useState } from "react";
import { classifyTexture } from "@/lib/analyzer";
import type { BoardCard, Rank, Suit, TextureLabel } from "@/lib/analyzer";

export const RANKS: Rank[] = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
export const SUITS: { value: Suit; symbol: string; color: string }[] = [
  { value: "s", symbol: "♠", color: "var(--text-primary)" },
  { value: "h", symbol: "♥", color: "#ef4444" },
  { value: "d", symbol: "♦", color: "#ef4444" },
  { value: "c", symbol: "♣", color: "var(--text-primary)" },
];

export const TEXTURE_COLORS: Record<TextureLabel, string> = {
  dry:      "#6b7280",
  paired:   "#f59e0b",
  wet:      "#3b82f6",
  dynamic:  "#8b5cf6",
  monotone: "#14b8a6",
};

const DEFAULT_POTS: Record<string, number> = {
  single_raised_ip: 6.5, single_raised_oop: 6.5,
  three_bet_ip: 20.5, three_bet_oop: 20.5,
};

interface CardPickerProps {
  value: BoardCard | null;
  onChange: (card: BoardCard | null) => void;
  usedCards: BoardCard[];
  label: string;
}

export function CardPicker({ value, onChange, usedCards, label }: CardPickerProps) {
  const [pickingRank, setPickingRank] = useState<Rank | null>(null);

  const isUsed = (rank: Rank, suit: Suit) =>
    usedCards.some(c => c.rank === rank && c.suit === suit);

  function handleRank(rank: Rank) {
    setPickingRank(rank === pickingRank ? null : rank);
  }

  function handleSuit(suit: Suit) {
    if (!pickingRank) return;
    if (isUsed(pickingRank, suit)) return;
    onChange({ rank: pickingRank, suit });
    setPickingRank(null);
  }

  const suitInfo = SUITS.find(s => s.value === value?.suit);

  return (
    <div
      className="rounded-xl border p-3 flex flex-col gap-2"
      style={{ background: "var(--surface-2)", borderColor: value ? "var(--accent-blue)" : "var(--border)", minWidth: 120 }}
    >
      <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</p>

      {value ? (
        <div className="flex items-center justify-between">
          <span className="text-2xl font-black" style={{ color: suitInfo?.color }}>
            {value.rank}{suitInfo?.symbol}
          </span>
          <button
            onClick={() => { onChange(null); setPickingRank(null); }}
            className="text-xs px-2 py-1 rounded"
            style={{ background: "var(--border)", color: "var(--text-secondary)" }}
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {pickingRank ? `${pickingRank} — pick suit` : "Pick rank"}
        </div>
      )}

      {!value && (
        <>
          <div className="flex flex-wrap gap-1">
            {RANKS.map(r => (
              <button
                key={r}
                onClick={() => handleRank(r)}
                className="w-7 h-7 rounded text-xs font-bold transition-colors"
                style={{
                  background: pickingRank === r ? "var(--accent-blue)" : "var(--surface)",
                  color: pickingRank === r ? "#fff" : "var(--text-primary)",
                }}
              >
                {r}
              </button>
            ))}
          </div>
          {pickingRank && (
            <div className="flex gap-2">
              {SUITS.map(({ value: sv, symbol, color }) => {
                const used = isUsed(pickingRank, sv);
                return (
                  <button
                    key={sv}
                    onClick={() => handleSuit(sv)}
                    disabled={used}
                    className="flex-1 py-1.5 rounded-lg text-base font-bold"
                    style={{
                      background: "var(--surface)",
                      color: used ? "var(--border)" : color,
                      cursor: used ? "not-allowed" : "pointer",
                      opacity: used ? 0.4 : 1,
                    }}
                  >
                    {symbol}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface Props {
  board: BoardCard[];
  blockedCards?: BoardCard[];
  effectiveStackBB: number;
  potAfterPreflopBB: number;
  preflopScenario: string;
  onChange: (update: { board?: BoardCard[]; effectiveStackBB?: number; potAfterPreflopBB?: number }) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function BoardBuilder({
  board, blockedCards = [], effectiveStackBB, potAfterPreflopBB, preflopScenario,
  onChange, onNext, onBack,
}: Props) {
  const hasFlop = board.length >= 3;
  const texture = hasFlop ? classifyTexture(board.slice(0, 3)) : null;

  function updateCard(index: number, card: BoardCard | null) {
    const next = [...board];
    if (card) {
      next[index] = card;
    } else {
      next.splice(index);
    }
    onChange({ board: next });
  }

  const canNext = hasFlop && effectiveStackBB > 0 && potAfterPreflopBB > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
            Effective Stack (BB)
          </p>
          <input
            type="number"
            value={effectiveStackBB}
            onChange={e => onChange({ effectiveStackBB: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2.5 rounded-xl text-sm font-medium border outline-none"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
            Pot After Preflop (BB)
          </p>
          <input
            type="number"
            value={potAfterPreflopBB || DEFAULT_POTS[preflopScenario] || 6.5}
            onChange={e => onChange({ potAfterPreflopBB: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2.5 rounded-xl text-sm font-medium border outline-none"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* Flop only — turn/river handled per-street in the wizard */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
          Flop Cards
        </p>
        <div className="flex gap-3 flex-wrap">
          {[0, 1, 2].map(i => (
            <CardPicker
              key={i}
              label={`Card ${i + 1}`}
              value={board[i] ?? null}
              onChange={card => updateCard(i, card)}
              usedCards={[...blockedCards, ...board.filter((_, idx) => idx !== i)]}
            />
          ))}
        </div>
        {texture && (
          <div className="flex items-center gap-2 mt-3">
            <span
              className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide"
              style={{
                background: `${TEXTURE_COLORS[texture.label]}22`,
                color: TEXTURE_COLORS[texture.label],
                border: `1px solid ${TEXTURE_COLORS[texture.label]}44`,
              }}
            >
              {texture.label}
            </span>
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {texture.description}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl text-sm font-bold border"
          style={{ background: "transparent", borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!canNext}
          className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
          style={{
            background: canNext ? "var(--accent-green)" : "var(--surface-2)",
            color: canNext ? "#000" : "var(--text-secondary)",
            cursor: canNext ? "pointer" : "not-allowed",
          }}
        >
          Next: Flop Action →
        </button>
      </div>
    </div>
  );
}
