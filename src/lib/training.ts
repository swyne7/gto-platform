import { RANGES, getComboKey } from "@/data/preflop-ranges";
import type { RangeData } from "@/data/preflop-ranges";

export type Position = "UTG" | "UTG+1" | "UTG+2" | "LJ" | "HJ" | "CO" | "BTN" | "SB" | "BB";
export type TrainingAction = "open" | "3bet_vs_btn" | "3bet_vs_co" | "call_open_vs_btn";

export interface TrainingSpot {
  position: Position;
  action: TrainingAction;
  hand: string;           // e.g. "AKs"
  handLabel: string;      // display version e.g. "A♠K♠"
  gtoFrequency: number;   // 0.0 to 1.0
  correctAction: "yes" | "no" | "mixed";
  actionLabel: string;    // "Open Raise", "3-Bet vs BTN", etc.
}

export interface DecisionResult {
  userChoice: "yes" | "no";
  correct: boolean;
  gtoFrequency: number;
  evFeedback: string;
  explanation: string;
}

const ACTION_LABELS: Record<string, string> = {
  open:              "Open Raise",
  "3bet_vs_btn":    "3-Bet vs BTN",
  "3bet_vs_co":     "3-Bet vs CO",
  call_open_vs_btn: "Call vs BTN Open",
};

// Weighted spot selection — favor common positions
const SPOT_POOL: Array<{ position: Position; action: TrainingAction }> = [
  { position: "BTN",    action: "open" },
  { position: "BTN",    action: "open" },
  { position: "CO",     action: "open" },
  { position: "CO",     action: "open" },
  { position: "UTG",    action: "open" },
  { position: "UTG+1",  action: "open" },
  { position: "UTG+2",  action: "open" },
  { position: "LJ",     action: "open" },
  { position: "HJ",     action: "open" },
  { position: "SB",     action: "open" },
  { position: "SB",     action: "3bet_vs_btn" },
  { position: "BB",     action: "3bet_vs_btn" },
  { position: "BB",     action: "call_open_vs_btn" },
];

function randomHand(): { row: number; col: number; combo: string } {
  const row = Math.floor(Math.random() * 13);
  const col = Math.floor(Math.random() * 13);
  return { row, col, combo: getComboKey(row, col) };
}

function formatHandLabel(combo: string): string {
  const isPair = combo.length === 2;
  if (isPair) {
    const r = combo[0];
    return `${r}♠${r}♥`;
  }
  const suited = combo.endsWith("s");
  const r1 = combo[0];
  const r2 = combo[1];
  if (suited) return `${r1}♠${r2}♠`;
  return `${r1}♠${r2}♥`;
}

export function generateSpot(): TrainingSpot {
  const spotTemplate = SPOT_POOL[Math.floor(Math.random() * SPOT_POOL.length)];
  const { position, action } = spotTemplate;

  const rangeData: RangeData =
    (RANGES[position] as Record<string, RangeData>)[action] ?? {};

  // Pick a random hand — bias toward edge cases (mixed strategy hands) for interest
  let hand: string;
  let attempts = 0;
  do {
    const { combo } = randomHand();
    hand = combo;
    attempts++;
    // After many attempts, accept anything
  } while (attempts < 20 && rangeData[hand] === undefined && Math.random() > 0.3);

  const freq = rangeData[hand] ?? 0;

  // Determine correct action category
  let correctAction: "yes" | "no" | "mixed";
  if (freq >= 0.85)       correctAction = "yes";
  else if (freq <= 0.15)  correctAction = "no";
  else                    correctAction = "mixed";

  return {
    position,
    action,
    hand,
    handLabel: formatHandLabel(hand),
    gtoFrequency: freq,
    correctAction,
    actionLabel: ACTION_LABELS[action] ?? action,
  };
}

export function scoreDecision(spot: TrainingSpot, userChoice: "yes" | "no"): DecisionResult {
  const { gtoFrequency, correctAction, actionLabel, hand, position } = spot;
  const freqPct = Math.round(gtoFrequency * 100);

  let correct: boolean;
  let evFeedback: string;
  let explanation: string;

  if (correctAction === "yes") {
    correct = userChoice === "yes";
    if (correct) {
      evFeedback = "+EV ✓";
      explanation = `${hand} is a clear ${actionLabel} from ${position}. GTO plays this ${freqPct}% of the time.`;
    } else {
      const evLoss = (gtoFrequency * 0.5).toFixed(2);
      evFeedback = `−${evLoss}bb`;
      explanation = `GTO always ${actionLabel.toLowerCase()}s ${hand} from ${position} (${freqPct}%). Folding here loses EV.`;
    }
  } else if (correctAction === "no") {
    correct = userChoice === "no";
    if (correct) {
      evFeedback = "Correct fold ✓";
      explanation = `${hand} is outside the ${position} ${actionLabel.toLowerCase()} range. GTO folds this ${100 - freqPct}% of the time.`;
    } else {
      const evLoss = ((1 - gtoFrequency) * 0.4).toFixed(2);
      evFeedback = `−${evLoss}bb`;
      explanation = `${hand} is not in the ${position} ${actionLabel.toLowerCase()} range (GTO: ${freqPct}%). Playing it costs EV.`;
    }
  } else {
    // Mixed strategy — both answers get partial credit
    correct = true; // neither is "wrong" for a mixed spot
    const mixedAction = gtoFrequency >= 0.5 ? "leans toward playing" : "leans toward folding";
    evFeedback = "Mixed spot";
    explanation = `${hand} from ${position} is a mixed strategy hand. GTO ${actionLabel.toLowerCase()}s ${freqPct}% — it ${mixedAction}. Both actions are close to neutral EV.`;
  }

  return { userChoice, correct, gtoFrequency, evFeedback, explanation };
}

export function getStreakFromStorage(): number {
  if (typeof window === "undefined") return 0;
  try {
    const data = localStorage.getItem("gto_streak");
    if (!data) return 0;
    const { streak, lastDate } = JSON.parse(data);
    const today = new Date().toDateString();
    if (lastDate === today) return streak;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (lastDate === yesterday) return streak;
    return 0; // streak broken
  } catch {
    return 0;
  }
}

export function saveStreakToStorage(streak: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("gto_streak", JSON.stringify({
    streak,
    lastDate: new Date().toDateString(),
  }));
}
