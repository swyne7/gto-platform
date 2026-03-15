"use client";

import { useState, useMemo } from "react";
import HandGrid from "@/components/range/HandGrid";
import { RANGES, getComboKey } from "@/data/preflop-ranges";
import type { RangeData } from "@/data/preflop-ranges";

const POSITIONS = ["UTG", "HJ", "CO", "BTN", "SB", "BB"] as const;

const ACTION_OPTIONS: Record<string, string[]> = {
  UTG: ["open"],
  HJ:  ["open"],
  CO:  ["open"],
  BTN: ["open"],
  SB:  ["open", "3bet_vs_btn"],
  BB:  ["3bet_vs_btn", "3bet_vs_co", "call_open_vs_btn"],
};

const ACTION_LABELS: Record<string, string> = {
  open:              "Open Raise",
  "3bet_vs_btn":    "3-Bet vs BTN",
  "3bet_vs_co":     "3-Bet vs CO",
  "3bet_vs_ep":     "3-Bet vs EP",
  "3bet_vs_sb":     "3-Bet vs SB",
  call_open_vs_btn: "Call Open vs BTN",
  call_open_vs_co:  "Call Open vs CO",
};

function comboCount(range: RangeData): number {
  let count = 0;
  for (const [combo, freq] of Object.entries(range)) {
    if (freq === 0) continue;
    const isPair = combo.length === 2 && combo[0] === combo[1];
    const isSuited = combo.endsWith("s") && !isPair;
    count += (isPair ? 6 : isSuited ? 4 : 12) * freq;
  }
  return Math.round(count);
}

export default function RangesPage() {
  const [position, setPosition] = useState<string>("BTN");
  const [action, setAction] = useState<string>("open");
  const [hoveredCombo, setHoveredCombo] = useState<string | null>(null);

  const actions = ACTION_OPTIONS[position] ?? ["open"];
  const currentAction = actions.includes(action) ? action : actions[0];

  const range: RangeData = RANGES[position]?.[currentAction] ?? {};

  const combos = comboCount(range);

  // Stat: how many unique combos in range
  const handCount = useMemo(() => {
    let total = 0;
    for (let r = 0; r < 13; r++) {
      for (let c = 0; c < 13; c++) {
        const combo = getComboKey(r, c);
        if ((range[combo] ?? 0) >= 0.5) total++;
      }
    }
    return total;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAction, position]);

  const hoveredFreq = hoveredCombo ? Math.round((range[hoveredCombo] ?? 0) * 100) : null;

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Range Viewer
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          100BB cash game · 6-max · GTO opening ranges
        </p>
      </div>

      {/* Controls */}
      <div
        className="rounded-xl border p-4 mb-6 flex flex-wrap gap-6 items-center"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Position selector */}
        <div>
          <p className="text-xs mb-2 font-medium uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            Position
          </p>
          <div className="flex gap-1">
            {POSITIONS.map((pos) => (
              <button
                key={pos}
                onClick={() => {
                  setPosition(pos);
                  setAction(ACTION_OPTIONS[pos][0]);
                }}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  background: position === pos ? "var(--accent-green)" : "var(--surface-2)",
                  color: position === pos ? "#000" : "var(--text-secondary)",
                }}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        {/* Action selector */}
        <div>
          <p className="text-xs mb-2 font-medium uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            Action
          </p>
          <div className="flex gap-1">
            {actions.map((a) => (
              <button
                key={a}
                onClick={() => setAction(a)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  background: currentAction === a ? "var(--accent-blue)" : "var(--surface-2)",
                  color: currentAction === a ? "#fff" : "var(--text-secondary)",
                }}
              >
                {ACTION_LABELS[a] ?? a}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="ml-auto flex gap-6">
          <div>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Combos</p>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{combos}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Hand types</p>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{handCount}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Range %</p>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              {((combos / 1326) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-6 flex-wrap">
        {/* Grid */}
        <div
          className="rounded-xl border p-5"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <HandGrid
            range={range}
            highlightCombo={hoveredCombo}
            onComboClick={setHoveredCombo}
            size="md"
          />
        </div>

        {/* Side panel */}
        <div className="flex-1 min-w-52 flex flex-col gap-3">
          {hoveredCombo ? (
            <div
              className="rounded-xl border p-5"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <p className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                {hoveredCombo}
              </p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {ACTION_LABELS[currentAction] ?? currentAction}
              </p>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1.5">
                  <span style={{ color: "var(--text-secondary)" }}>Frequency</span>
                  <span className="font-bold" style={{ color: "var(--accent-green)" }}>
                    {hoveredFreq}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${hoveredFreq}%`,
                      background: hoveredFreq === 100
                        ? "var(--accent-green)"
                        : hoveredFreq === 0
                        ? "var(--border)"
                        : "var(--accent-yellow)",
                    }}
                  />
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                  {hoveredFreq === 100
                    ? "Always play this action"
                    : hoveredFreq === 0
                    ? "Never — fold"
                    : `Mixed: play ${hoveredFreq}% of the time`}
                </p>
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl border p-5"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                Click any cell
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Select a hand on the grid to see its exact GTO frequency.
              </p>
            </div>
          )}

          {/* Position notes */}
          <div
            className="rounded-xl border p-5"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
              {position} Notes
            </p>
            <ul className="text-xs space-y-1.5" style={{ color: "var(--text-secondary)" }}>
              {position === "UTG" && <>
                <li>• Tightest opening range (~14%)</li>
                <li>• 5 players left to act</li>
                <li>• Value-heavy — avoid weak offsuit hands</li>
                <li>• Suited connectors play well for balance</li>
              </>}
              {position === "HJ" && <>
                <li>• Slightly wider than UTG (~18%)</li>
                <li>• Add more suited aces and connectors</li>
                <li>• 4 players left to act</li>
              </>}
              {position === "CO" && <>
                <li>• Wide opening range (~25%)</li>
                <li>• 3 players left to act</li>
                <li>• Add all suited gappers and Ax suited</li>
              </>}
              {position === "BTN" && <>
                <li>• Widest range (~45%) — best position</li>
                <li>• Only SB and BB left</li>
                <li>• Can open almost any two suited cards</li>
                <li>• Position advantage on all streets</li>
              </>}
              {position === "SB" && <>
                <li>• Wide range (~40%) — only BB left</li>
                <li>• But OOP postflop — be selective</li>
                <li>• 3-bet or fold vs most opens</li>
              </>}
              {position === "BB" && <>
                <li>• Already invested 1BB — wide defense</li>
                <li>• Use MDF: defend ~55% vs 3x open</li>
                <li>• Mix calls and 3-bets with strong hands</li>
              </>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
