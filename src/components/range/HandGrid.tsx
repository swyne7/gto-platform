"use client";

import clsx from "clsx";
import { RANKS, getComboKey, isSuited, isPair } from "@/data/preflop-ranges";
import type { RangeData } from "@/data/preflop-ranges";

interface Props {
  range: RangeData;
  highlightCombo?: string | null;
  onComboClick?: (combo: string) => void;
  size?: "sm" | "md" | "lg";
}

// Returns a CSS background for a cell based on frequency + hand type
function cellBackground(freq: number, row: number, col: number): string {
  if (freq === 0) return "#1a1d27"; // surface — fold

  const suited   = isSuited(row, col);
  const pair     = isPair(row, col);

  // Color palette
  const colors = {
    pair:    { r: 139, g: 92,  b: 246 }, // purple
    suited:  { r: 34,  g: 197, b: 94  }, // green
    offsuit: { r: 59,  g: 130, b: 246 }, // blue
    fold:    { r: 26,  g: 29,  b: 39  }, // dark
  };

  const base = pair ? colors.pair : suited ? colors.suited : colors.offsuit;
  const fold = colors.fold;

  // Blend base color with fold color based on frequency
  const r = Math.round(fold.r + (base.r - fold.r) * freq);
  const g = Math.round(fold.g + (base.g - fold.g) * freq);
  const b = Math.round(fold.b + (base.b - fold.b) * freq);

  return `rgb(${r},${g},${b})`;
}

const SIZE_CONFIG = {
  sm: { cell: 24, text: "text-[8px]" },
  md: { cell: 36, text: "text-[10px]" },
  lg: { cell: 44, text: "text-xs"    },
};

export default function HandGrid({ range, highlightCombo, onComboClick, size = "md" }: Props) {
  const { cell, text } = SIZE_CONFIG[size];

  return (
    <div className="inline-block">
      {/* Column headers */}
      <div className="flex" style={{ marginLeft: cell + 2 }}>
        {RANKS.map((r) => (
          <div
            key={r}
            className={clsx("flex items-center justify-center font-bold", text)}
            style={{ width: cell, height: cell / 1.5, color: "var(--text-secondary)" }}
          >
            {r}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      {RANKS.map((rowRank, row) => (
        <div key={rowRank} className="flex items-center">
          {/* Row header */}
          <div
            className={clsx("flex items-center justify-center font-bold", text)}
            style={{ width: cell, height: cell, color: "var(--text-secondary)" }}
          >
            {rowRank}
          </div>

          {RANKS.map((colRank, col) => {
            const combo  = getComboKey(row, col);
            const freq   = range[combo] ?? 0;
            const bg     = cellBackground(freq, row, col);
            const isHighlighted = combo === highlightCombo;

            return (
              <div
                key={combo}
                title={`${combo}: ${Math.round(freq * 100)}%`}
                onClick={() => onComboClick?.(combo)}
                className={clsx(
                  "relative flex items-center justify-center transition-all",
                  onComboClick && "cursor-pointer hover:brightness-125",
                  isHighlighted && "ring-2 ring-yellow-400 z-10"
                )}
                style={{
                  width: cell,
                  height: cell,
                  background: bg,
                  border: "1px solid rgba(0,0,0,0.3)",
                  borderRadius: 2,
                }}
              >
                {size !== "sm" && (
                  <span
                    className={clsx("font-medium select-none leading-none", text)}
                    style={{ color: freq > 0.2 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)" }}
                  >
                    {combo}
                  </span>
                )}
                {/* Frequency bar at bottom of cell */}
                {freq > 0 && freq < 1 && (
                  <div
                    className="absolute bottom-0 left-0 right-0"
                    style={{
                      height: 2,
                      background: "rgba(255,255,255,0.6)",
                      width: `${freq * 100}%`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-xs" style={{ color: "var(--text-secondary)" }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgb(34,197,94)" }} />
          <span>Suited</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgb(59,130,246)" }} />
          <span>Offsuit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgb(139,92,246)" }} />
          <span>Pair</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "#1a1d27", border: "1px solid #2e3348" }} />
          <span>Fold</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm relative overflow-hidden" style={{ background: "#1a1d27", border: "1px solid #2e3348" }}>
            <div className="absolute bottom-0 left-0" style={{ width: "50%", height: 2, background: "rgba(255,255,255,0.6)" }} />
          </div>
          <span>Mixed</span>
        </div>
      </div>
    </div>
  );
}
