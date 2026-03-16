import { RANGES } from "@/data/preflop-ranges";
import type { RangeData } from "@/data/preflop-ranges";
import type { Position } from "@/lib/training";

// ── Card types ────────────────────────────────────────────────────────────────

export type Rank = "A"|"K"|"Q"|"J"|"T"|"9"|"8"|"7"|"6"|"5"|"4"|"3"|"2";
export type Suit = "s"|"h"|"d"|"c";

export interface BoardCard {
  rank: Rank;
  suit: Suit;
}

export type Street = "flop" | "turn" | "river";
export type PostflopAction = "check" | "bet" | "call" | "raise" | "fold";

export type PreflopScenario =
  | "single_raised_ip"
  | "single_raised_oop"
  | "three_bet_ip"
  | "three_bet_oop";

export interface HandState {
  heroPosition: Position;
  villainPosition: Position;
  heroHand: string;
  preflopScenario: PreflopScenario;
  effectiveStackBB: number;
  potAfterPreflopBB: number;
  board: BoardCard[];
  heroAction: PostflopAction;
  heroSizingBB?: number;
  villainBetSizingBB?: number;
}

// ── Board texture ─────────────────────────────────────────────────────────────

export type TextureLabel = "dry" | "paired" | "monotone" | "wet" | "dynamic";

export interface BoardTexture {
  label: TextureLabel;
  isPaired: boolean;
  isMonotone: boolean;
  isTwoTone: boolean;
  hasFlushDraw: boolean;
  hasStraightDraw: boolean;
  connectedness: number;
  highCardRank: Rank;
  description: string;
}

export type RangeAdvantage =
  | "hero_strong"
  | "hero_slight"
  | "neutral"
  | "villain_slight"
  | "villain_strong";

export interface RangeAnalysis {
  advantage: RangeAdvantage;
  heroTopPairPlusPct: number;
  villainTopPairPlusPct: number;
  heroNutsPct: number;
  villainNutsPct: number;
  explanation: string;
}

export type DecisionGrade =
  | "gto_line"
  | "good"
  | "acceptable"
  | "mistake"
  | "blunder";

export interface CoachingPoint {
  category: "texture" | "range" | "spr" | "sizing" | "position" | "equity";
  severity: "info" | "warning" | "error";
  text: string;
}

export interface AnalysisResult {
  spr: number;
  potOdds: number | null;
  mdf: number | null;
  texture: BoardTexture;
  rangeAnalysis: RangeAnalysis;
  grade: DecisionGrade;
  heroActionLabel: string;
  recommendedAction: PostflopAction;
  recommendedSizingBB?: number;
  coachingPoints: CoachingPoint[];
  summary: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RANK_VALUE: Record<Rank, number> = {
  A: 14, K: 13, Q: 12, J: 11, T: 10,
  "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2,
};

const RANKS_ORDER: Rank[] = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];

// ── Core calculations ─────────────────────────────────────────────────────────

export function calculateSPR(effectiveStackBB: number, potBB: number): number {
  if (potBB === 0) return 99;
  return Math.round((effectiveStackBB / potBB) * 10) / 10;
}

export function calculatePotOdds(callAmountBB: number, potBeforeCallBB: number): number {
  const totalPot = potBeforeCallBB + callAmountBB;
  return Math.round((callAmountBB / totalPot) * 100);
}

export function calculateMDF(betSizingBB: number, potBeforeBetBB: number): number {
  return Math.round((potBeforeBetBB / (potBeforeBetBB + betSizingBB)) * 100);
}

// ── Board texture classifier ──────────────────────────────────────────────────

export function classifyTexture(board: BoardCard[]): BoardTexture {
  if (board.length < 3) {
    return {
      label: "dry", isPaired: false, isMonotone: false, isTwoTone: false,
      hasFlushDraw: false, hasStraightDraw: false, connectedness: 0,
      highCardRank: "A", description: "Incomplete board",
    };
  }

  const flop = board.slice(0, 3);
  const ranks = flop.map(c => c.rank);
  const suits = flop.map(c => c.suit);
  const rankValues = flop.map(c => RANK_VALUE[c.rank]).sort((a, b) => b - a);

  // Paired check
  const rankSet = new Set(ranks);
  const isPaired = rankSet.size < 3;

  // Suit analysis
  const suitCounts: Record<string, number> = {};
  for (const s of suits) suitCounts[s] = (suitCounts[s] ?? 0) + 1;
  const maxSuitCount = Math.max(...Object.values(suitCounts));
  const isMonotone = maxSuitCount === 3;
  const isTwoTone = maxSuitCount === 2;
  const hasFlushDraw = isTwoTone; // two-tone = flush draw possible

  // Straight draw — check if top 3 ranks span ≤ 4
  const spread = rankValues[0] - rankValues[2];
  const hasStraightDraw = !isPaired && spread <= 4;

  // Connectedness score
  let connectedness = 0;
  if (isTwoTone) connectedness += 3;
  if (isMonotone) connectedness += 2;
  if (hasStraightDraw) connectedness += 4;
  if (spread <= 2) connectedness += 2; // very connected e.g. 987

  // High card
  const highCardRank = RANKS_ORDER.find(r => ranks.includes(r)) ?? "A";

  // Label
  let label: TextureLabel;
  if (isPaired) label = "paired";
  else if (isMonotone) label = "monotone";
  else if (connectedness >= 7) label = "dynamic";
  else if (connectedness >= 4) label = "wet";
  else label = "dry";

  // Human description
  const suitDesc = isMonotone ? "monotone" : isTwoTone ? "two-tone" : "rainbow";
  const connDesc = hasStraightDraw ? "connected" : spread <= 6 ? "semi-connected" : "disconnected";
  const pairDesc = isPaired ? "paired, " : "";
  const description = `${pairDesc}${connDesc}, ${suitDesc}`;

  return {
    label, isPaired, isMonotone, isTwoTone,
    hasFlushDraw, hasStraightDraw, connectedness,
    highCardRank, description,
  };
}

// ── Range advantage estimation ────────────────────────────────────────────────

// Maps preflop scenario + positions to range keys
function getRangeKey(
  role: "hero" | "villain",
  state: HandState
): { position: Position; key: string } {
  const { heroPosition, villainPosition, preflopScenario } = state;

  if (role === "hero") {
    switch (preflopScenario) {
      case "single_raised_ip":  return { position: heroPosition, key: "open" };
      case "single_raised_oop": return { position: heroPosition, key: "call_open_vs_btn" };
      case "three_bet_ip":      return { position: heroPosition, key: "3bet_vs_btn" };
      case "three_bet_oop":     return { position: heroPosition, key: "call_open_vs_btn" };
    }
  } else {
    switch (preflopScenario) {
      case "single_raised_ip":  return { position: villainPosition, key: "call_open_vs_btn" };
      case "single_raised_oop": return { position: villainPosition, key: "open" };
      case "three_bet_ip":      return { position: villainPosition, key: "open" };
      case "three_bet_oop":     return { position: villainPosition, key: "3bet_vs_btn" };
    }
  }
}

function countRangeConnections(range: RangeData, boardRank: Rank): { pairPlus: number; total: number; nuts: number } {
  let pairPlus = 0;
  let nuts = 0;
  let total = 0;

  for (const [combo, freq] of Object.entries(range)) {
    if (freq === 0) continue;
    total += freq;

    const isPair = combo.length === 2 && combo[0] === combo[1];
    if (isPair) {
      // Overpair or set potential
      if (RANK_VALUE[combo[0] as Rank] >= RANK_VALUE[boardRank]) {
        pairPlus += freq;
        if (RANK_VALUE[combo[0] as Rank] > RANK_VALUE[boardRank] + 1) nuts += freq;
      }
      continue;
    }

    const r1 = combo[0] as Rank;
    const r2 = combo[1] as Rank;
    const hitsTop = r1 === boardRank || r2 === boardRank;
    const hitsNut = r1 === boardRank && RANK_VALUE[r2] >= 10; // top pair with good kicker

    if (hitsTop) pairPlus += freq;
    if (hitsNut) nuts += freq;
  }

  return { pairPlus, total, nuts };
}

export function estimateRangeAdvantage(state: HandState, texture: BoardTexture): RangeAnalysis {
  const heroKey = getRangeKey("hero", state);
  const villainKey = getRangeKey("villain", state);

  const heroRange: RangeData = RANGES[heroKey.position]?.[heroKey.key] ?? {};
  const villainRange: RangeData = RANGES[villainKey.position]?.[villainKey.key] ?? {};

  const heroStats = countRangeConnections(heroRange, texture.highCardRank);
  const villainStats = countRangeConnections(villainRange, texture.highCardRank);

  const heroPct = heroStats.total > 0 ? Math.round((heroStats.pairPlus / heroStats.total) * 100) : 0;
  const villainPct = villainStats.total > 0 ? Math.round((villainStats.pairPlus / villainStats.total) * 100) : 0;
  const heroNutsPct = heroStats.total > 0 ? Math.round((heroStats.nuts / heroStats.total) * 100) : 0;
  const villainNutsPct = villainStats.total > 0 ? Math.round((villainStats.nuts / villainStats.total) * 100) : 0;

  const diff = heroPct - villainPct;
  let advantage: RangeAdvantage;
  if (diff > 15)       advantage = "hero_strong";
  else if (diff > 5)   advantage = "hero_slight";
  else if (diff < -15) advantage = "villain_strong";
  else if (diff < -5)  advantage = "villain_slight";
  else                 advantage = "neutral";

  // Paired board adjustment — callers benefit more from low/mid pairs
  if (texture.isPaired && (state.preflopScenario === "single_raised_oop" || state.preflopScenario === "three_bet_oop")) {
    if (advantage === "hero_strong") advantage = "hero_slight";
    else if (advantage === "hero_slight") advantage = "neutral";
  }

  const advantageText: Record<RangeAdvantage, string> = {
    hero_strong:    "Hero has a significant range advantage on this board",
    hero_slight:    "Hero has a slight range advantage",
    neutral:        "Ranges are roughly even on this board",
    villain_slight: "Villain has a slight range advantage",
    villain_strong: "Villain has a significant range advantage on this board",
  };

  return {
    advantage,
    heroTopPairPlusPct: heroPct,
    villainTopPairPlusPct: villainPct,
    heroNutsPct,
    villainNutsPct,
    explanation: advantageText[advantage],
  };
}

// ── Decision evaluation ───────────────────────────────────────────────────────

export function evaluateDecision(
  state: HandState,
  texture: BoardTexture,
  range: RangeAnalysis,
  spr: number,
): {
  grade: DecisionGrade;
  recommendedAction: PostflopAction;
  recommendedSizingBB?: number;
  coachingPoints: CoachingPoint[];
} {
  const { heroAction, heroSizingBB, villainBetSizingBB, potAfterPreflopBB } = state;
  const points: CoachingPoint[] = [];
  let grade: DecisionGrade = "acceptable";
  let recommendedAction: PostflopAction = "check";
  let recommendedSizingBB: number | undefined;

  const heroAdvantage = range.advantage === "hero_strong" || range.advantage === "hero_slight";
  const villainAdvantage = range.advantage === "villain_strong" || range.advantage === "villain_slight";
  const isDry = texture.label === "dry";
  const isWet = texture.label === "wet" || texture.label === "dynamic" || texture.label === "monotone";
  const isIp = state.preflopScenario === "single_raised_ip" || state.preflopScenario === "three_bet_ip";
  const facing = villainBetSizingBB != null && villainBetSizingBB > 0;

  // ── Facing a bet ────────────────────────────────────────────────────────────
  if (facing && villainBetSizingBB) {
    const betPct = villainBetSizingBB / potAfterPreflopBB;

    if (heroAction === "fold") {
      if (heroAdvantage && range.heroTopPairPlusPct > 20) {
        grade = "mistake";
        recommendedAction = "call";
        points.push({ category: "range", severity: "warning",
          text: `You folded with range advantage — villain's range likely includes many bluffs here given board texture.` });
      } else if (range.heroTopPairPlusPct < 10) {
        grade = "acceptable";
        recommendedAction = "fold";
        points.push({ category: "range", severity: "info",
          text: "Fold is reasonable — your range connects poorly with this board and you're facing a bet." });
      } else {
        grade = "good";
        recommendedAction = "fold";
      }
    }

    if (heroAction === "call") {
      if (betPct > 1.0 && !heroAdvantage) {
        grade = "mistake";
        recommendedAction = "fold";
        points.push({ category: "sizing", severity: "warning",
          text: `Villain bet ${Math.round(betPct * 100)}% pot — this is a polarized sizing. Without range advantage, calling is thin.` });
      } else if (spr < 2) {
        grade = "gto_line";
        recommendedAction = "call";
        points.push({ category: "spr", severity: "info",
          text: `SPR of ${spr} — shallow stack, you're almost pot-committed. Calling is correct.` });
      } else {
        grade = "good";
        recommendedAction = "call";
      }
    }

    if (heroAction === "raise") {
      if (heroAdvantage && spr < 5) {
        grade = "gto_line";
        recommendedAction = "raise";
        recommendedSizingBB = Math.round(villainBetSizingBB * 3);
        points.push({ category: "spr", severity: "info",
          text: `Low SPR + range advantage — raising to build the pot with your strong hands is correct.` });
      } else if (isWet && heroAdvantage) {
        grade = "good";
        recommendedAction = "raise";
        recommendedSizingBB = Math.round(villainBetSizingBB * 2.5);
        points.push({ category: "texture", severity: "info",
          text: "Raising on a wet board charges draws and builds the pot with your made hands." });
      } else if (!heroAdvantage && isDry) {
        grade = "blunder";
        recommendedAction = "call";
        points.push({ category: "range", severity: "error",
          text: "Raising into villain's range advantage on a dry board is a blunder — villain's strong range calls all raises and folds nothing." });
      } else {
        grade = "acceptable";
        recommendedAction = "raise";
        recommendedSizingBB = Math.round(villainBetSizingBB * 3);
      }
    }
  } else {
    // ── Hero acts first (check or bet) ────────────────────────────────────────

    if (heroAction === "check") {
      if (heroAdvantage && isDry && isIp) {
        grade = "mistake";
        recommendedAction = "bet";
        recommendedSizingBB = Math.round(potAfterPreflopBB * 0.5);
        points.push({ category: "range", severity: "warning",
          text: `Checking back with range advantage on a dry board misses value. Betting ~50% pot charges villain's weak hands.` });
      } else if (heroAdvantage && isWet && !isIp) {
        grade = "acceptable";
        recommendedAction = "check";
        points.push({ category: "position", severity: "info",
          text: "OOP on a wet board, checking to control pot size is reasonable even with range advantage." });
      } else if (villainAdvantage) {
        grade = "good";
        recommendedAction = "check";
        points.push({ category: "range", severity: "info",
          text: "Checking is correct — villain has range advantage and will call bets with strong hands while you have few bluffs." });
      } else {
        grade = "acceptable";
        recommendedAction = "check";
      }
    }

    if (heroAction === "bet" && heroSizingBB) {
      const sizingPct = heroSizingBB / potAfterPreflopBB;

      if (heroAdvantage && isDry && sizingPct >= 0.25 && sizingPct <= 0.75) {
        grade = "gto_line";
        recommendedAction = "bet";
        recommendedSizingBB = heroSizingBB;
        points.push({ category: "texture", severity: "info",
          text: `Textbook c-bet: range advantage + dry board. Small-to-medium sizing extracts value from weaker pairs and top pairs with worse kickers.` });
      } else if (heroAdvantage && isWet && sizingPct >= 0.5) {
        grade = "good";
        recommendedAction = "bet";
        recommendedSizingBB = heroSizingBB;
        points.push({ category: "texture", severity: "info",
          text: "Larger sizing on a wet board is correct — you're charging flush and straight draws." });
      } else if (villainAdvantage && isDry && sizingPct > 0.5) {
        grade = "mistake";
        recommendedAction = "check";
        points.push({ category: "range", severity: "warning",
          text: "Betting large into villain's range advantage on a dry board — villain calls with hands that beat you and folds hands you were ahead of." });
      } else if (sizingPct > 1.25 && isDry) {
        grade = "blunder";
        recommendedAction = "bet";
        recommendedSizingBB = Math.round(potAfterPreflopBB * 0.5);
        points.push({ category: "sizing", severity: "error",
          text: `Overbet of ${Math.round(sizingPct * 100)}% pot on a dry board is rarely correct — bluffcatchers call and you're only called by better.` });
      } else if (villainAdvantage && sizingPct <= 0.33) {
        grade = "acceptable";
        recommendedAction = "bet";
        recommendedSizingBB = heroSizingBB;
        points.push({ category: "range", severity: "info",
          text: "Small probing bet is acceptable even with slight range disadvantage — low risk, cheap information." });
      } else {
        grade = "acceptable";
        recommendedAction = "bet";
        recommendedSizingBB = heroSizingBB;
      }
    }
  }

  // ── Universal coaching points ─────────────────────────────────────────────
  if (spr < 2) {
    points.push({ category: "spr", severity: "info",
      text: `SPR of ${spr} — very shallow. Top pair or better is typically a commitment hand at this depth.` });
  } else if (spr > 10) {
    points.push({ category: "spr", severity: "info",
      text: `Deep SPR of ${spr} — drawing hands gain value. Exercise caution with one-pair hands on dynamic boards.` });
  }

  if (texture.isMonotone) {
    points.push({ category: "texture", severity: "warning",
      text: "Monotone board — a large chunk of villain's range has flush equity. Any bet faces strong implied odds." });
  }

  if (texture.label === "dynamic") {
    points.push({ category: "texture", severity: "info",
      text: "Highly dynamic board — ranges will diverge rapidly on turns. Equity realization is key." });
  }

  return { grade, recommendedAction, recommendedSizingBB, coachingPoints: points.slice(0, 4) };
}

// ── Summary builder ───────────────────────────────────────────────────────────

export function buildSummary(
  grade: DecisionGrade,
  state: HandState,
  texture: BoardTexture,
  spr: number,
  recommended: PostflopAction,
  recommendedSizing?: number,
): string {
  const gradeText: Record<DecisionGrade, string> = {
    gto_line:   "GTO line",
    good:       "Good play",
    acceptable: "Reasonable play",
    mistake:    "Slight mistake",
    blunder:    "Significant error",
  };

  const boardDesc = `${texture.highCardRank}-high ${texture.description} board`;
  const sprDesc = spr < 3 ? "shallow SPR" : spr > 8 ? "deep SPR" : `SPR ${spr}`;
  const actionDesc = state.heroAction === "bet" && state.heroSizingBB
    ? `betting ${state.heroSizingBB.toFixed(1)}bb`
    : state.heroAction === "raise" && state.heroSizingBB
    ? `raising to ${state.heroSizingBB.toFixed(1)}bb`
    : state.heroAction;

  if (grade === "gto_line" || grade === "good") {
    return `${gradeText[grade]}. On a ${boardDesc} with ${sprDesc}, ${actionDesc} is the correct approach.`;
  }

  const recDesc = recommended === "bet" && recommendedSizing
    ? `betting ~${recommendedSizing.toFixed(1)}bb`
    : recommended === "raise" && recommendedSizing
    ? `raising to ~${recommendedSizing.toFixed(1)}bb`
    : recommended;

  return `${gradeText[grade]}. On a ${boardDesc} with ${sprDesc}, ${recDesc} is the stronger line than ${actionDesc}.`;
}

// ── Action label formatter ────────────────────────────────────────────────────

export function formatActionLabel(
  action: PostflopAction,
  sizingBB: number | undefined,
  potBB: number,
): string {
  if ((action === "bet" || action === "raise") && sizingBB) {
    const pct = Math.round((sizingBB / potBB) * 100);
    return `${action === "bet" ? "Bet" : "Raise to"} ${sizingBB.toFixed(1)}bb (${pct}% pot)`;
  }
  const labels: Record<PostflopAction, string> = {
    check: "Check", bet: "Bet", call: "Call", raise: "Raise", fold: "Fold",
  };
  return labels[action];
}

// ── Pot progression between streets ──────────────────────────────────────────

export function calculateNewPot(
  currentPot: number,
  heroAction: PostflopAction,
  heroSizingBB: number | undefined,
  villainBetSizingBB: number | undefined,
): number {
  if (heroAction === "fold") return currentPot;
  if (heroAction === "check") return currentPot;
  if (heroAction === "call" && villainBetSizingBB) {
    return Math.round((currentPot + villainBetSizingBB * 2) * 10) / 10;
  }
  if (heroAction === "bet" && heroSizingBB) {
    // Assume villain calls for pot estimation
    return Math.round((currentPot + heroSizingBB * 2) * 10) / 10;
  }
  if (heroAction === "raise" && heroSizingBB && villainBetSizingBB) {
    return Math.round((currentPot + villainBetSizingBB + heroSizingBB) * 10) / 10;
  }
  return currentPot;
}

// ── Full analysis runner ──────────────────────────────────────────────────────

export function runAnalysis(state: HandState): AnalysisResult {
  const texture = classifyTexture(state.board);
  const spr = calculateSPR(state.effectiveStackBB, state.potAfterPreflopBB);
  const potOdds = state.villainBetSizingBB
    ? calculatePotOdds(state.villainBetSizingBB, state.potAfterPreflopBB)
    : null;
  const mdf = state.villainBetSizingBB
    ? calculateMDF(state.villainBetSizingBB, state.potAfterPreflopBB)
    : null;
  const rangeAnalysis = estimateRangeAdvantage(state, texture);
  const { grade, recommendedAction, recommendedSizingBB, coachingPoints } =
    evaluateDecision(state, texture, rangeAnalysis, spr);
  const summary = buildSummary(grade, state, texture, spr, recommendedAction, recommendedSizingBB);

  return {
    spr, potOdds, mdf, texture, rangeAnalysis,
    grade,
    heroActionLabel: formatActionLabel(state.heroAction, state.heroSizingBB, state.potAfterPreflopBB),
    recommendedAction, recommendedSizingBB,
    coachingPoints,
    summary,
  };
}
