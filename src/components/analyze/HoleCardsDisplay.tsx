"use client";

import { evaluateHand, SUIT_SYMBOL, SUIT_COLOR } from "@/lib/handEvaluator";
import type { BoardCard } from "@/lib/analyzer";

const STRENGTH_COLOR: Record<string, string> = {
  strong:  "#22c55e",
  medium:  "#86efac",
  marginal: "#f59e0b",
  drawing: "#3b82f6",
  weak:    "#6b7280",
};

interface Props {
  card1: BoardCard;
  card2: BoardCard;
  board: BoardCard[];
}

function CardFace({ card }: { card: BoardCard }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border-2 font-black"
      style={{
        width: 52,
        height: 72,
        background: "var(--surface)",
        borderColor: SUIT_COLOR[card.suit] === "var(--text-primary)" ? "var(--border)" : "#ef444433",
        color: SUIT_COLOR[card.suit],
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>{card.rank}</span>
      <span style={{ fontSize: 18, lineHeight: 1 }}>{SUIT_SYMBOL[card.suit]}</span>
    </div>
  );
}

export default function HoleCardsDisplay({ card1, card2, board }: Props) {
  if (board.length < 3) return null;

  const ev = evaluateHand(card1, card2, board);
  const strengthColor = STRENGTH_COLOR[ev.handStrength];

  return (
    <div
      className="rounded-xl border p-3 flex flex-col gap-3"
      style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
    >
      <div className="flex items-start gap-4">
        {/* Cards */}
        <div className="flex gap-2 shrink-0">
          <CardFace card={card1} />
          <CardFace card={card2} />
        </div>

        {/* Hand strength + made hand */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{
                background: `${strengthColor}22`,
                color: strengthColor,
                border: `1px solid ${strengthColor}44`,
              }}
            >
              {ev.handStrength}
            </span>
          </div>
          <p className="text-sm font-black" style={{ color: "var(--text-primary)" }}>
            {ev.madeHand.label}
          </p>
          {ev.madeHand.detail !== ev.madeHand.label && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {ev.madeHand.detail}
            </p>
          )}
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {ev.equityHint}
          </p>
        </div>
      </div>

      {/* Ways to win */}
      {ev.waysToWin.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
            All ways to win
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ev.waysToWin.map((way, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{
                  background: i === 0 ? `${strengthColor}18` : "var(--surface)",
                  color: i === 0 ? strengthColor : "var(--text-secondary)",
                  borderColor: i === 0 ? `${strengthColor}44` : "var(--border)",
                }}
              >
                {way}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
