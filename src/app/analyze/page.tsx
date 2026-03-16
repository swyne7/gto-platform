"use client";

import { useState, useCallback } from "react";
import HandInput from "@/components/analyze/HandInput";
import BoardBuilder from "@/components/analyze/BoardBuilder";
import ActionWizard from "@/components/analyze/ActionWizard";
import AnalysisPanel from "@/components/analyze/AnalysisPanel";
import { runAnalysis } from "@/lib/analyzer";
import type { BoardCard, PostflopAction, AnalysisResult, HandState, PreflopScenario } from "@/lib/analyzer";
import type { Position } from "@/lib/training";

type Step = 1 | 2 | 3 | 4;

interface Draft {
  heroPosition: Position | null;
  villainPosition: Position | null;
  heroHand: string;
  preflopScenario: PreflopScenario;
  effectiveStackBB: number;
  potAfterPreflopBB: number;
  board: BoardCard[];
  heroAction: PostflopAction | null;
  heroSizingBB: number | undefined;
  villainBetSizingBB: number | undefined;
}

const STEP_LABELS = ["Hand Setup", "Board", "Your Action", "Analysis"];

const DEFAULT_DRAFT: Draft = {
  heroPosition: null,
  villainPosition: null,
  heroHand: "",
  preflopScenario: "single_raised_ip",
  effectiveStackBB: 100,
  potAfterPreflopBB: 6.5,
  board: [],
  heroAction: null,
  heroSizingBB: undefined,
  villainBetSizingBB: undefined,
};

export default function AnalyzePage() {
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  function updateDraft(partial: Partial<Draft>) {
    setDraft(prev => ({ ...prev, ...partial }));
  }

  const handleAnalyze = useCallback(() => {
    if (!draft.heroPosition || !draft.villainPosition || !draft.heroHand || !draft.heroAction) return;
    const state: HandState = {
      heroPosition: draft.heroPosition,
      villainPosition: draft.villainPosition,
      heroHand: draft.heroHand,
      preflopScenario: draft.preflopScenario,
      effectiveStackBB: draft.effectiveStackBB,
      potAfterPreflopBB: draft.potAfterPreflopBB,
      board: draft.board,
      heroAction: draft.heroAction,
      heroSizingBB: draft.heroSizingBB,
      villainBetSizingBB: draft.villainBetSizingBB,
    };
    setResult(runAnalysis(state));
    setStep(4);
  }, [draft]);

  function reset() {
    setDraft(DEFAULT_DRAFT);
    setResult(null);
    setStep(1);
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Hand Analyzer
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Enter a hand to get GTO coaching, range analysis, and decision feedback.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEP_LABELS.map((label, i) => {
          const s = (i + 1) as Step;
          const active = s === step;
          const done = s < step;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: done ? "var(--accent-green)" : active ? "var(--accent-blue)" : "var(--surface-2)",
                    color: done || active ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  {done ? "✓" : s}
                </div>
                <span
                  className="text-xs font-medium hidden sm:block"
                  style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)" }}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className="w-6 h-px" style={{ background: done ? "var(--accent-green)" : "var(--border)" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {step === 1 && (
          <HandInput
            heroHand={draft.heroHand}
            heroPosition={draft.heroPosition}
            villainPosition={draft.villainPosition}
            preflopScenario={draft.preflopScenario}
            onHeroHand={hand => updateDraft({ heroHand: hand })}
            onHeroPosition={pos => updateDraft({ heroPosition: pos })}
            onVillainPosition={pos => updateDraft({ villainPosition: pos })}
            onScenario={s => updateDraft({
              preflopScenario: s,
              potAfterPreflopBB: s.includes("three_bet") ? 20.5 : 6.5,
            })}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <BoardBuilder
            board={draft.board}
            effectiveStackBB={draft.effectiveStackBB}
            potAfterPreflopBB={draft.potAfterPreflopBB}
            preflopScenario={draft.preflopScenario}
            onChange={updateDraft}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <ActionWizard
            board={draft.board}
            potAfterPreflopBB={draft.potAfterPreflopBB}
            effectiveStackBB={draft.effectiveStackBB}
            heroAction={draft.heroAction}
            heroSizingBB={draft.heroSizingBB}
            villainBetSizingBB={draft.villainBetSizingBB}
            onChange={updateDraft}
            onAnalyze={handleAnalyze}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && result && draft.heroPosition && draft.villainPosition && draft.heroHand && draft.heroAction && (
          <AnalysisPanel
            result={result}
            state={{
              heroPosition: draft.heroPosition,
              villainPosition: draft.villainPosition,
              heroHand: draft.heroHand,
              preflopScenario: draft.preflopScenario,
              effectiveStackBB: draft.effectiveStackBB,
              potAfterPreflopBB: draft.potAfterPreflopBB,
              board: draft.board,
              heroAction: draft.heroAction,
              heroSizingBB: draft.heroSizingBB,
              villainBetSizingBB: draft.villainBetSizingBB,
            }}
            onReset={reset}
          />
        )}
      </div>
    </div>
  );
}
