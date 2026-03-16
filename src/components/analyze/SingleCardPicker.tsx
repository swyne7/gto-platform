"use client";

import { CardPicker } from "@/components/analyze/BoardBuilder";
import type { BoardCard } from "@/lib/analyzer";

interface Props {
  streetName: "Turn" | "River";
  card: BoardCard | null;
  usedCards: BoardCard[];
  potAtStart: number;
  onPotChange: (pot: number) => void;
  onChange: (card: BoardCard | null) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function SingleCardPicker({
  streetName, card, usedCards, potAtStart, onPotChange, onChange, onNext, onBack,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
          {streetName} Card
        </p>
        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
          Pick rank then suit.
        </p>
        <CardPicker
          label={`${streetName} card`}
          value={card}
          onChange={onChange}
          usedCards={usedCards}
        />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
          Pot at Start of {streetName} (BB)
        </p>
        <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
          Pre-filled from previous street. Adjust if needed.
        </p>
        <input
          type="number"
          value={potAtStart}
          onChange={e => onPotChange(parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2.5 rounded-xl text-sm font-medium border outline-none"
          style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
        />
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
          disabled={!card}
          className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
          style={{
            background: card ? "var(--accent-green)" : "var(--surface-2)",
            color: card ? "#000" : "var(--text-secondary)",
            cursor: card ? "pointer" : "not-allowed",
          }}
        >
          Next: {streetName} Action →
        </button>
      </div>
    </div>
  );
}
