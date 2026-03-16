"use client";

import { useState, useCallback } from "react";
import HandInput from "@/components/analyze/HandInput";
import BoardBuilder from "@/components/analyze/BoardBuilder";
import SingleCardPicker from "@/components/analyze/SingleCardPicker";
import ActionWizard from "@/components/analyze/ActionWizard";
import StreetResultCard from "@/components/analyze/StreetResultCard";
import HandSummary from "@/components/analyze/HandSummary";
import { runAnalysis, calculateNewPot } from "@/lib/analyzer";
import type { BoardCard, PostflopAction, AnalysisResult, HandState, PreflopScenario } from "@/lib/analyzer";
import type { Position } from "@/lib/training";
import { SUIT_SYMBOL, SUIT_COLOR, evaluateHand } from "@/lib/handEvaluator";

// ── Phase machine ─────────────────────────────────────────────────────────────
type Phase =
  | "setup"
  | "flop_board"
  | "flop_action"
  | "flop_result"
  | "turn_card"
  | "turn_action"
  | "turn_result"
  | "river_card"
  | "river_action"
  | "river_result"
  | "summary";

interface StreetState {
  villainBetSizingBB?: number;
  heroAction: PostflopAction | null;
  heroSizingBB?: number;
  potAtStart: number;
  result?: AnalysisResult;
}

interface FullDraft {
  heroPosition: Position | null;
  villainPosition: Position | null;
  heroHand: string;
  heroCard1: BoardCard | null;
  heroCard2: BoardCard | null;
  preflopScenario: PreflopScenario;
  effectiveStackBB: number;
  potAfterPreflopBB: number;
  flopCards: BoardCard[];
  turnCard: BoardCard | null;
  riverCard: BoardCard | null;
  flop: StreetState;
  turn: StreetState;
  river: StreetState;
}

const DEFAULT_DRAFT: FullDraft = {
  heroPosition: null,
  villainPosition: null,
  heroHand: "",
  heroCard1: null,
  heroCard2: null,
  preflopScenario: "single_raised_ip",
  effectiveStackBB: 100,
  potAfterPreflopBB: 6.5,
  flopCards: [],
  turnCard: null,
  riverCard: null,
  flop:  { heroAction: null, potAtStart: 6.5 },
  turn:  { heroAction: null, potAtStart: 0 },
  river: { heroAction: null, potAtStart: 0 },
};

// ── Progress bar ──────────────────────────────────────────────────────────────
const PROGRESS_STEPS = ["Setup", "Flop", "Turn", "River", "Summary"] as const;

function phaseToProgress(phase: Phase): number {
  if (phase === "setup" || phase === "flop_board")  return 0;
  if (phase === "flop_action" || phase === "flop_result") return 1;
  if (phase === "turn_card" || phase === "turn_action" || phase === "turn_result") return 2;
  if (phase === "river_card" || phase === "river_action" || phase === "river_result") return 3;
  return 4;
}

function HoleCardBanner({ card1, card2, heroHand }: { card1: BoardCard; card2: BoardCard; heroHand: string }) {
  function CardFace({ card }: { card: BoardCard }) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-lg font-black text-sm border"
        style={{
          width: 40, height: 52,
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: SUIT_COLOR[card.suit],
          flexShrink: 0,
        }}
      >
        {card.rank}{SUIT_SYMBOL[card.suit]}
      </span>
    );
  }
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-xl border mb-5"
      style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
    >
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
        Your hand
      </span>
      <div className="flex gap-1.5">
        <CardFace card={card1} />
        <CardFace card={card2} />
      </div>
      <span className="text-sm font-black" style={{ color: "var(--accent-green)" }}>{heroHand}</span>
    </div>
  );
}

function StepIndicator({ phase }: { phase: Phase }) {
  const active = phaseToProgress(phase);
  return (
    <div className="flex items-center gap-2 mb-6">
      {PROGRESS_STEPS.map((label, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: done ? "var(--accent-green)" : current ? "var(--accent-blue)" : "var(--surface-2)",
                  color: done || current ? "#fff" : "var(--text-secondary)",
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className="text-xs font-medium hidden sm:block"
                style={{ color: current ? "var(--text-primary)" : "var(--text-secondary)" }}
              >
                {label}
              </span>
            </div>
            {i < PROGRESS_STEPS.length - 1 && (
              <div
                className="w-6 h-px"
                style={{ background: done ? "var(--accent-green)" : "var(--border)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AnalyzePage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [draft, setDraft] = useState<FullDraft>(DEFAULT_DRAFT);

  function updateDraft(partial: Partial<FullDraft>) {
    setDraft(prev => ({ ...prev, ...partial }));
  }

  function updateStreet(street: "flop" | "turn" | "river", partial: Partial<StreetState>) {
    setDraft(prev => ({ ...prev, [street]: { ...prev[street], ...partial } }));
  }

  // Hole cards — blocked everywhere on the board
  const holeCards: BoardCard[] = [
    ...(draft.heroCard1 ? [draft.heroCard1] : []),
    ...(draft.heroCard2 ? [draft.heroCard2] : []),
  ];

  // All used cards across the hand (to prevent duplicates)
  const allUsedCards: BoardCard[] = [
    ...holeCards,
    ...draft.flopCards,
    ...(draft.turnCard ? [draft.turnCard] : []),
    ...(draft.riverCard ? [draft.riverCard] : []),
  ];

  // ── Analysis runners ────────────────────────────────────────────────────────
  const analyzeStreet = useCallback((street: "flop" | "turn" | "river") => {
    if (!draft.heroPosition || !draft.villainPosition || !draft.heroHand) return;
    const streetData = draft[street];
    if (!streetData.heroAction) return;

    const board = street === "flop"
      ? draft.flopCards
      : street === "turn"
      ? [...draft.flopCards, ...(draft.turnCard ? [draft.turnCard] : [])]
      : [...draft.flopCards, ...(draft.turnCard ? [draft.turnCard] : []), ...(draft.riverCard ? [draft.riverCard] : [])];

    const state: HandState = {
      heroPosition: draft.heroPosition,
      villainPosition: draft.villainPosition,
      heroHand: draft.heroHand,
      preflopScenario: draft.preflopScenario,
      effectiveStackBB: draft.effectiveStackBB,
      potAfterPreflopBB: streetData.potAtStart,
      board,
      heroAction: streetData.heroAction,
      heroSizingBB: streetData.heroSizingBB,
      villainBetSizingBB: streetData.villainBetSizingBB,
    };

    const handEvalResult = draft.heroCard1 && draft.heroCard2
      ? evaluateHand(draft.heroCard1, draft.heroCard2, board)
      : null;

    const result = runAnalysis(state, handEvalResult);
    updateStreet(street, { result });

    // Calculate pot for next street
    const newPot = calculateNewPot(
      streetData.potAtStart,
      streetData.heroAction,
      streetData.heroSizingBB,
      streetData.villainBetSizingBB,
    );

    if (street === "flop") {
      updateStreet("turn", { potAtStart: newPot });
      setPhase("flop_result");
    } else if (street === "turn") {
      updateStreet("river", { potAtStart: newPot });
      setPhase("turn_result");
    } else {
      setPhase("river_result");
    }
  }, [draft]);

  function reset() {
    setDraft(DEFAULT_DRAFT);
    setPhase("setup");
  }

  // ── Completed street results for display ────────────────────────────────────
  const completedStreets = [
    draft.flop.result ? {
      streetName: "Flop" as const,
      board: draft.flopCards,
      potAtStart: draft.flop.potAtStart,
      result: draft.flop.result,
    } : null,
    draft.turn.result ? {
      streetName: "Turn" as const,
      board: [...draft.flopCards, ...(draft.turnCard ? [draft.turnCard] : [])],
      potAtStart: draft.turn.potAtStart,
      result: draft.turn.result,
    } : null,
    draft.river.result ? {
      streetName: "River" as const,
      board: [...draft.flopCards, ...(draft.turnCard ? [draft.turnCard] : []), ...(draft.riverCard ? [draft.riverCard] : [])],
      potAtStart: draft.river.potAtStart,
      result: draft.river.result,
    } : null,
  ].filter(Boolean) as { streetName: "Flop"|"Turn"|"River"; board: BoardCard[]; potAtStart: number; result: AnalysisResult }[];

  const [expandedStreets, setExpandedStreets] = useState<Record<string, boolean>>({});
  function toggleStreet(name: string) {
    setExpandedStreets(prev => ({ ...prev, [name]: !prev[name] }));
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Hand Analyzer
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Analyze each street individually, then get a full hand summary.
        </p>
      </div>

      <StepIndicator phase={phase} />

      {/* ── Completed street results above current input ── */}
      {completedStreets.length > 0 && phase !== "summary" && (
        <div className="flex flex-col gap-3 mb-4">
          {completedStreets.map((s, i) => {
            const isLast = i === completedStreets.length - 1;
            const showNav = isLast && (
              phase === "flop_result" ||
              phase === "turn_result" ||
              phase === "river_result"
            );
            return (
              <StreetResultCard
                key={s.streetName}
                streetName={s.streetName}
                board={s.board}
                result={s.result}
                potAtStart={s.potAtStart}
                heroCard1={draft.heroCard1}
                heroCard2={draft.heroCard2}
                isExpanded={!!expandedStreets[s.streetName] || isLast}
                onToggleExpand={() => toggleStreet(s.streetName)}
                showNav={showNav}
                onAddTurn={showNav && phase === "flop_result" ? () => setPhase("turn_card") : undefined}
                onAddRiver={showNav && phase === "turn_result" ? () => setPhase("river_card") : undefined}
                onViewSummary={showNav ? () => setPhase("summary") : undefined}
              />
            );
          })}
        </div>
      )}

      {/* ── Active input panel ── */}
      {phase !== "summary" && (
        <div
          className="rounded-2xl border p-6"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          {/* Persistent hole card banner — shown on every step after setup */}
          {phase !== "setup" && draft.heroCard1 && draft.heroCard2 && (
            <HoleCardBanner card1={draft.heroCard1} card2={draft.heroCard2} heroHand={draft.heroHand} />
          )}

          {/* SETUP */}
          {phase === "setup" && (
            <HandInput
              heroHand={draft.heroHand}
              heroCard1={draft.heroCard1}
              heroCard2={draft.heroCard2}
              heroPosition={draft.heroPosition}
              villainPosition={draft.villainPosition}
              preflopScenario={draft.preflopScenario}
              onHeroHand={hand => updateDraft({ heroHand: hand })}
              onHeroCards={(c1, c2) => updateDraft({ heroCard1: c1, heroCard2: c2 })}
              onHeroPosition={pos => updateDraft({ heroPosition: pos })}
              onVillainPosition={pos => updateDraft({ villainPosition: pos })}
              onScenario={s => updateDraft({
                preflopScenario: s,
                potAfterPreflopBB: s.includes("three_bet") ? 20.5 : 6.5,
                flop: { ...draft.flop, potAtStart: s.includes("three_bet") ? 20.5 : 6.5 },
              })}
              onNext={() => setPhase("flop_board")}
            />
          )}

          {/* FLOP BOARD */}
          {phase === "flop_board" && (
            <BoardBuilder
              board={draft.flopCards}
              blockedCards={holeCards}
              effectiveStackBB={draft.effectiveStackBB}
              potAfterPreflopBB={draft.potAfterPreflopBB}
              preflopScenario={draft.preflopScenario}
              onChange={u => {
                if (u.board !== undefined) updateDraft({ flopCards: u.board });
                if (u.effectiveStackBB !== undefined) updateDraft({ effectiveStackBB: u.effectiveStackBB });
                if (u.potAfterPreflopBB !== undefined) {
                  updateDraft({ potAfterPreflopBB: u.potAfterPreflopBB });
                  updateStreet("flop", { potAtStart: u.potAfterPreflopBB });
                }
              }}
              onNext={() => setPhase("flop_action")}
              onBack={() => setPhase("setup")}
            />
          )}

          {/* FLOP ACTION */}
          {phase === "flop_action" && (
            <ActionWizard
              board={draft.flopCards}
              potAfterPreflopBB={draft.flop.potAtStart}
              effectiveStackBB={draft.effectiveStackBB}
              heroAction={draft.flop.heroAction}
              heroSizingBB={draft.flop.heroSizingBB}
              villainBetSizingBB={draft.flop.villainBetSizingBB}
              heroCard1={draft.heroCard1}
              heroCard2={draft.heroCard2}
              onChange={u => updateStreet("flop", u)}
              onAnalyze={() => analyzeStreet("flop")}
              onBack={() => setPhase("flop_board")}
            />
          )}

          {/* TURN CARD */}
          {phase === "turn_card" && (
            <SingleCardPicker
              streetName="Turn"
              card={draft.turnCard}
              usedCards={allUsedCards.filter(c => c !== draft.turnCard)}
              potAtStart={draft.turn.potAtStart}
              onPotChange={pot => updateStreet("turn", { potAtStart: pot })}
              onChange={card => updateDraft({ turnCard: card })}
              onNext={() => setPhase("turn_action")}
              onBack={() => setPhase("flop_result")}
            />
          )}

          {/* TURN ACTION */}
          {phase === "turn_action" && (
            <ActionWizard
              board={[...draft.flopCards, ...(draft.turnCard ? [draft.turnCard] : [])]}
              potAfterPreflopBB={draft.turn.potAtStart}
              effectiveStackBB={draft.effectiveStackBB}
              heroAction={draft.turn.heroAction}
              heroSizingBB={draft.turn.heroSizingBB}
              villainBetSizingBB={draft.turn.villainBetSizingBB}
              heroCard1={draft.heroCard1}
              heroCard2={draft.heroCard2}
              onChange={u => updateStreet("turn", u)}
              onAnalyze={() => analyzeStreet("turn")}
              onBack={() => setPhase("turn_card")}
            />
          )}

          {/* RIVER CARD */}
          {phase === "river_card" && (
            <SingleCardPicker
              streetName="River"
              card={draft.riverCard}
              usedCards={allUsedCards.filter(c => c !== draft.riverCard)}
              potAtStart={draft.river.potAtStart}
              onPotChange={pot => updateStreet("river", { potAtStart: pot })}
              onChange={card => updateDraft({ riverCard: card })}
              onNext={() => setPhase("river_action")}
              onBack={() => setPhase("turn_result")}
            />
          )}

          {/* RIVER ACTION */}
          {phase === "river_action" && (
            <ActionWizard
              board={[...draft.flopCards, ...(draft.turnCard ? [draft.turnCard] : []), ...(draft.riverCard ? [draft.riverCard] : [])]}
              potAfterPreflopBB={draft.river.potAtStart}
              effectiveStackBB={draft.effectiveStackBB}
              heroAction={draft.river.heroAction}
              heroSizingBB={draft.river.heroSizingBB}
              villainBetSizingBB={draft.river.villainBetSizingBB}
              heroCard1={draft.heroCard1}
              heroCard2={draft.heroCard2}
              onChange={u => updateStreet("river", u)}
              onAnalyze={() => analyzeStreet("river")}
              onBack={() => setPhase("river_card")}
            />
          )}
        </div>
      )}

      {/* ── Full hand summary ── */}
      {phase === "summary" && (
        <HandSummary
          streets={completedStreets}
          heroHand={draft.heroHand}
          heroCard1={draft.heroCard1}
          heroCard2={draft.heroCard2}
          onReset={reset}
        />
      )}
    </div>
  );
}
