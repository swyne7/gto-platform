import { RANGES } from "@/data/preflop-ranges";
import type { RangeData } from "@/data/preflop-ranges";
import type { Position } from "@/lib/training";
import type { HandEvaluation, HandRank } from "@/lib/handEvaluator";

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

  const rankSet = new Set(ranks);
  const isPaired = rankSet.size < 3;

  const suitCounts: Record<string, number> = {};
  for (const s of suits) suitCounts[s] = (suitCounts[s] ?? 0) + 1;
  const maxSuitCount = Math.max(...Object.values(suitCounts));
  const isMonotone = maxSuitCount === 3;
  const isTwoTone = maxSuitCount === 2;
  const hasFlushDraw = isTwoTone;

  const spread = rankValues[0] - rankValues[2];
  const hasStraightDraw = !isPaired && spread <= 4;

  let connectedness = 0;
  if (isTwoTone) connectedness += 3;
  if (isMonotone) connectedness += 2;
  if (hasStraightDraw) connectedness += 4;
  if (spread <= 2) connectedness += 2;

  const highCardRank = RANKS_ORDER.find(r => ranks.includes(r)) ?? "A";

  let label: TextureLabel;
  if (isPaired) label = "paired";
  else if (isMonotone) label = "monotone";
  else if (connectedness >= 7) label = "dynamic";
  else if (connectedness >= 4) label = "wet";
  else label = "dry";

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

function getRangeKey(
  role: "hero" | "villain",
  state: HandState
): { position: Position; key: string } {
  const { heroPosition, villainPosition, preflopScenario } = state;

  if (role === "hero") {
    switch (preflopScenario) {
      case "single_raised_ip":  return { position: heroPosition, key: "open" };
      case "single_raised_oop": return { position: heroPosition, key: "call" };
      case "three_bet_ip":      return { position: heroPosition, key: "3bet" };
      case "three_bet_oop":     return { position: heroPosition, key: "call" };
    }
  } else {
    switch (preflopScenario) {
      case "single_raised_ip":  return { position: villainPosition, key: "call" };
      case "single_raised_oop": return { position: villainPosition, key: "open" };
      case "three_bet_ip":      return { position: villainPosition, key: "open" };
      case "three_bet_oop":     return { position: villainPosition, key: "3bet" };
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
      if (RANK_VALUE[combo[0] as Rank] >= RANK_VALUE[boardRank]) {
        pairPlus += freq;
        if (RANK_VALUE[combo[0] as Rank] > RANK_VALUE[boardRank] + 1) nuts += freq;
      }
      continue;
    }

    const r1 = combo[0] as Rank;
    const r2 = combo[1] as Rank;
    const hitsTop = r1 === boardRank || r2 === boardRank;
    const hitsNut = r1 === boardRank && RANK_VALUE[r2] >= 10;

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
// Primary driver: hero's actual hand strength (from hand evaluator)
// Secondary: position, SPR, texture, range advantage

const MONSTER_RANKS: string[] = ["straight_flush", "quads", "full_house", "flush", "straight"];
const VERY_STRONG_RANKS: string[] = ["trips", "two_pair"];
const MEDIUM_STRONG_RANKS: string[] = ["top_pair", "overpair"];
const MEDIUM_RANKS: string[] = ["second_pair"];
const MARGINAL_RANKS: string[] = ["bottom_pair", "underpair"];

export function evaluateDecision(
  state: HandState,
  texture: BoardTexture,
  range: RangeAnalysis,
  spr: number,
  handEval: HandEvaluation | null,
): {
  grade: DecisionGrade;
  recommendedAction: PostflopAction;
  recommendedSizingBB?: number;
  coachingPoints: CoachingPoint[];
} {
  const { heroAction, heroSizingBB, villainBetSizingBB, potAfterPreflopBB, preflopScenario } = state;
  const points: CoachingPoint[] = [];
  let grade: DecisionGrade = "acceptable";
  let recommendedAction: PostflopAction = "check";
  let recommendedSizingBB: number | undefined;

  const isIp = preflopScenario === "single_raised_ip" || preflopScenario === "three_bet_ip";
  const isDry = texture.label === "dry" || texture.label === "paired";
  const isWet = texture.label === "wet" || texture.label === "dynamic" || texture.label === "monotone";
  const facing = villainBetSizingBB != null && villainBetSizingBB > 0;
  const betPct = facing && villainBetSizingBB ? villainBetSizingBB / potAfterPreflopBB : 0;
  const sizingPct = heroSizingBB ? heroSizingBB / potAfterPreflopBB : 0;
  const heroAdvantage = range.advantage === "hero_strong" || range.advantage === "hero_slight";
  const villainAdvantage = range.advantage === "villain_strong" || range.advantage === "villain_slight";

  // Hand-strength flags
  const handRank = handEval?.madeHand.rank ?? null;
  const draws = handEval?.draws ?? [];
  const mainDrawOuts = draws.filter(d => !d.isBackdoor).reduce((s, d) => s + d.outs, 0);
  const hasNutFlushDraw = draws.some(d => d.label === "Nut flush draw");
  const hasFlushDraw = draws.some(d => !d.isBackdoor && d.label.toLowerCase().includes("flush draw"));
  const hasOESD = draws.some(d => !d.isBackdoor && d.outs >= 8);
  const hasStrongDraw = mainDrawOuts >= 8;
  const hasComboNutDraw = hasNutFlushDraw && hasOESD;

  const isMonster = handRank !== null && MONSTER_RANKS.includes(handRank);
  const isVeryStrong = handRank !== null && VERY_STRONG_RANKS.includes(handRank);
  const isMediumStrong = handRank !== null && MEDIUM_STRONG_RANKS.includes(handRank);
  const isMedium = handRank !== null && MEDIUM_RANKS.includes(handRank);
  const isMarginal = handRank !== null && MARGINAL_RANKS.includes(handRank);
  const isWeak = handRank === "high_card";

  const handLabel = handEval?.madeHand.label ?? "your hand";

  // Standard reference bet sizes
  const smallBet = parseFloat((potAfterPreflopBB * 0.33).toFixed(1));
  const medBet   = parseFloat((potAfterPreflopBB * 0.5 ).toFixed(1));
  const largeBet = parseFloat((potAfterPreflopBB * 0.75).toFixed(1));

  if (facing && villainBetSizingBB) {
    // ════════════════════════════════════════════════════════════════════════
    // FACING A BET
    // ════════════════════════════════════════════════════════════════════════
    const stdRaise  = parseFloat((villainBetSizingBB * 3  ).toFixed(1));
    const bigRaise  = parseFloat((villainBetSizingBB * 4  ).toFixed(1));

    if (isMonster) {
      // ── Full house / flush / straight / quads / SF ───────────────────────
      // Always raise. Calling loses value. Folding is a blunder.
      if (heroAction === "fold") {
        grade = "blunder";
        recommendedAction = "raise";
        recommendedSizingBB = stdRaise;
        points.push({ category: "equity", severity: "error",
          text: `Folding ${handLabel} is a critical error. Monsters never fold — raise to extract maximum value from villain's calling range.` });
      } else if (heroAction === "call") {
        grade = "mistake";
        recommendedAction = "raise";
        recommendedSizingBB = stdRaise;
        points.push({ category: "equity", severity: "warning",
          text: `Calling with ${handLabel} leaves significant value on the table. Raising to 3× builds the pot while villain is still putting money in with weaker hands.` });
      } else {
        // raise
        if (heroSizingBB && heroSizingBB < villainBetSizingBB * 2.2) {
          grade = "acceptable";
          recommendedAction = "raise";
          recommendedSizingBB = stdRaise;
          points.push({ category: "sizing", severity: "info",
            text: `Raising is correct with ${handLabel}, but go larger (3–4×). A min-raise lets villain continue too cheaply.` });
        } else {
          grade = "gto_line";
          recommendedAction = "raise";
          recommendedSizingBB = heroSizingBB;
          points.push({ category: "equity", severity: "info",
            text: `Correct. Raising ${handLabel} for maximum value is the GTO line.` });
        }
      }

    } else if (isVeryStrong) {
      // ── Trips / two pair ─────────────────────────────────────────────────
      if (heroAction === "fold") {
        grade = betPct > 1.5 ? "mistake" : "blunder";
        recommendedAction = "raise";
        recommendedSizingBB = stdRaise;
        points.push({ category: "equity", severity: "error",
          text: `Folding ${handLabel} is a serious mistake. You have a strong made hand — raise to extract value and protect against draws.` });
      } else if (heroAction === "call") {
        // Calling is acceptable, but raising is better on wet boards
        if (isWet) {
          grade = "acceptable";
          recommendedAction = "raise";
          recommendedSizingBB = stdRaise;
          points.push({ category: "texture", severity: "info",
            text: `Calling is okay, but raising ${handLabel} on a wet board is stronger — you protect your hand and build the pot before draws complete.` });
        } else {
          grade = "good";
          recommendedAction = "call";
          points.push({ category: "equity", severity: "info",
            text: `Calling ${handLabel} is fine on this dry board. Trapping villain who may barrel again is valid.` });
        }
      } else {
        // raise
        grade = "gto_line";
        recommendedAction = "raise";
        recommendedSizingBB = heroSizingBB ?? stdRaise;
        points.push({ category: "equity", severity: "info",
          text: `Raising ${handLabel} is the GTO line — maximize pot size and charge draws.` });
      }

    } else if (isMediumStrong) {
      // ── Top pair / overpair ───────────────────────────────────────────────
      if (heroAction === "fold") {
        if (betPct > 1.2 && spr > 5) {
          grade = "acceptable";
          recommendedAction = "fold";
          points.push({ category: "sizing", severity: "info",
            text: `Folding ${handLabel} to a large overbet is defensible at deep SPR — villain's polarized range has many hands that beat you.` });
        } else {
          grade = "mistake";
          recommendedAction = "call";
          points.push({ category: "equity", severity: "warning",
            text: `Folding ${handLabel} to a ${Math.round(betPct * 100)}% pot bet is too tight. You have strong equity and are ahead of most of villain's bluffing range.` });
        }
      } else if (heroAction === "call") {
        grade = "good";
        recommendedAction = "call";
        points.push({ category: "equity", severity: "info",
          text: `Calling with ${handLabel} is correct — strong equity, ahead of villain's bluffs and weaker pairs.` });
      } else {
        // raise
        if (isWet && spr < 7) {
          grade = "good";
          recommendedAction = "raise";
          recommendedSizingBB = heroSizingBB ?? stdRaise;
          points.push({ category: "texture", severity: "info",
            text: `Raising ${handLabel} on a wet board for protection is a strong play — denies free equity to draws.` });
        } else if (isDry && betPct < 0.4) {
          grade = "acceptable";
          recommendedAction = "call";
          points.push({ category: "range", severity: "info",
            text: `Raising ${handLabel} on a dry board vs a small bet is marginal — calling preserves more of villain's bluffing range.` });
        } else {
          grade = "acceptable";
          recommendedAction = "raise";
          recommendedSizingBB = heroSizingBB ?? stdRaise;
        }
      }

    } else if (isMedium) {
      // ── Second pair ───────────────────────────────────────────────────────
      if (heroAction === "fold") {
        grade = betPct > 0.5 ? "acceptable" : "acceptable";
        recommendedAction = betPct > 0.67 ? "fold" : "call";
        if (betPct <= 0.5) {
          points.push({ category: "equity", severity: "info",
            text: `Second pair is a marginal spot. Pot odds may justify a call vs smaller bets, but folding to large sizing is correct.` });
        }
      } else if (heroAction === "call") {
        if (betPct <= 0.5) {
          grade = "acceptable";
          recommendedAction = "call";
          points.push({ category: "equity", severity: "info",
            text: `Calling second pair vs a small bet is fine — pot odds justify it and you may improve.` });
        } else {
          grade = "acceptable";
          recommendedAction = "fold";
          points.push({ category: "equity", severity: "info",
            text: `Calling second pair vs a large bet is thin — you're likely dominated by much of villain's value range.` });
        }
      } else {
        // raise
        grade = "mistake";
        recommendedAction = "call";
        points.push({ category: "equity", severity: "warning",
          text: `Raising second pair turns a bluff-catcher into a bluff — villain calls/jams with everything that beats you and folds exactly what you beat.` });
      }

    } else if (isMarginal || isWeak) {
      // ── Bottom pair / underpair / high card ───────────────────────────────
      if (heroAction === "fold") {
        if (!hasStrongDraw) {
          grade = "good";
          recommendedAction = "fold";
          points.push({ category: "equity", severity: "info",
            text: `Folding ${handLabel} is correct — too little equity to continue profitably.` });
        } else {
          // Has a strong draw despite weak made hand
          grade = "acceptable";
          recommendedAction = betPct <= 0.4 ? "call" : "fold";
          points.push({ category: "equity", severity: "info",
            text: `You have ${mainDrawOuts} outs despite ${handLabel}. Small bets may be worth calling with draw equity.` });
        }
      } else if (heroAction === "call") {
        if (hasStrongDraw && betPct <= 0.5) {
          grade = "acceptable";
          recommendedAction = "call";
          points.push({ category: "equity", severity: "info",
            text: `Calling with ${mainDrawOuts} draw outs is defensible vs a small bet — draw equity justifies the price.` });
        } else {
          grade = "mistake";
          recommendedAction = "fold";
          points.push({ category: "equity", severity: "warning",
            text: `Calling with ${handLabel} and insufficient draw equity is spewing chips. Fold and find a better spot.` });
        }
      } else {
        // raise
        grade = "blunder";
        recommendedAction = hasStrongDraw ? "call" : "fold";
        points.push({ category: "equity", severity: "error",
          text: `Raising with ${handLabel} is a blunder — you have almost no equity and villain continues with everything that crushes you.` });
      }

    } else {
      // No hand eval — pure draw hand or fallback
      const callEquityApprox = mainDrawOuts > 0 ? mainDrawOuts / 46 : 0;
      const potOddsNeeded = betPct / (1 + betPct);

      if (heroAction === "call") {
        if (hasStrongDraw && callEquityApprox >= potOddsNeeded) {
          grade = "good";
          recommendedAction = "call";
          points.push({ category: "equity", severity: "info",
            text: `${mainDrawOuts} outs — calling is mathematically justified (${Math.round(callEquityApprox * 100)}% equity vs ${Math.round(potOddsNeeded * 100)}% needed).` });
        } else if (heroAdvantage) {
          grade = "acceptable";
          recommendedAction = "call";
        } else {
          grade = "acceptable";
          recommendedAction = "fold";
        }
      } else if (heroAction === "raise") {
        if (hasComboNutDraw) {
          grade = "good";
          recommendedAction = "raise";
          recommendedSizingBB = parseFloat((villainBetSizingBB * 3).toFixed(1));
          points.push({ category: "equity", severity: "info",
            text: `Semi-raising a combo nut draw is strong — fold equity plus draw equity is highly profitable.` });
        } else {
          grade = "acceptable";
          recommendedAction = "call";
        }
      } else {
        grade = heroAdvantage ? "mistake" : "acceptable";
        recommendedAction = heroAdvantage ? "call" : "fold";
      }
    }

  } else {
    // ════════════════════════════════════════════════════════════════════════
    // HERO ACTS FIRST — check or bet
    // ════════════════════════════════════════════════════════════════════════

    if (isMonster) {
      // ── Full house / flush / straight / quads / SF ───────────────────────
      // Slow-playing monsters is a persistent GTO leak — always bet.
      if (heroAction === "check") {
        grade = "mistake";
        recommendedAction = "bet";
        recommendedSizingBB = largeBet;
        points.push({ category: "equity", severity: "warning",
          text: `Checking ${handLabel} is slow-playing — a significant leak. You miss a street of value and give villain free equity. Bet to build the pot.` });
        if (isWet) {
          points.push({ category: "texture", severity: "warning",
            text: `On a wet board especially, checking monsters donates free cards. Villain's draws have 30–40% equity — bet now.` });
        }
      } else if (heroAction === "bet" && heroSizingBB) {
        if (sizingPct < 0.4) {
          grade = "mistake";
          recommendedAction = "bet";
          recommendedSizingBB = largeBet;
          points.push({ category: "sizing", severity: "warning",
            text: `Undersizing with ${handLabel} (${Math.round(sizingPct * 100)}% pot) is a mistake — bet 66–100% to extract full value. Villain calls with worse made hands and draws.` });
        } else if (sizingPct >= 0.5) {
          grade = "gto_line";
          recommendedAction = "bet";
          recommendedSizingBB = heroSizingBB;
          points.push({ category: "equity", severity: "info",
            text: `Value betting ${handLabel} is the GTO line. Good sizing maximizes EV vs villain's continuing range.` });
        } else {
          grade = "good";
          recommendedAction = "bet";
          recommendedSizingBB = heroSizingBB;
        }
      }

    } else if (isVeryStrong) {
      // ── Trips / two pair ─────────────────────────────────────────────────
      if (heroAction === "check") {
        if (isWet && !isIp) {
          grade = "mistake";
          recommendedAction = "bet";
          recommendedSizingBB = medBet;
          points.push({ category: "texture", severity: "warning",
            text: `Checking ${handLabel} OOP on a wet board gives villain free cards to outdraw you. Bet 50% pot to charge draws.` });
        } else if (isWet && isIp) {
          grade = "acceptable";
          recommendedAction = "bet";
          recommendedSizingBB = medBet;
          points.push({ category: "position", severity: "info",
            text: `Checking back ${handLabel} IP can be used as disguise, but betting is more profitable — wet boards demand protection.` });
        } else if (isDry && isIp) {
          grade = "acceptable";
          recommendedAction = "check";
          points.push({ category: "position", severity: "info",
            text: `Slow-playing ${handLabel} IP on a dry board is a minor option — villain can't improve much and may bet on later streets.` });
        } else {
          grade = "mistake";
          recommendedAction = "bet";
          recommendedSizingBB = medBet;
          points.push({ category: "equity", severity: "warning",
            text: `Checking ${handLabel} OOP allows villain a free card. Bet to extract value while you're ahead.` });
        }
      } else if (heroAction === "bet" && heroSizingBB) {
        if (sizingPct >= 0.33 && sizingPct <= 1.0) {
          grade = "gto_line";
          recommendedAction = "bet";
          recommendedSizingBB = heroSizingBB;
          points.push({ category: "equity", severity: "info",
            text: `Value betting ${handLabel} with good sizing is correct — extracts value from worse made hands and charges draws.` });
        } else if (sizingPct < 0.33) {
          grade = "acceptable";
          recommendedAction = "bet";
          recommendedSizingBB = medBet;
          points.push({ category: "sizing", severity: "info",
            text: `Small sizing with ${handLabel} — consider 50–75% pot to extract more value from villain's calling range.` });
        } else {
          grade = "good";
          recommendedAction = "bet";
          recommendedSizingBB = heroSizingBB;
        }
      }

    } else if (isMediumStrong) {
      // ── Top pair / overpair ───────────────────────────────────────────────
      if (heroAction === "check") {
        if (heroAdvantage && isDry && isIp) {
          grade = "mistake";
          recommendedAction = "bet";
          recommendedSizingBB = smallBet;
          points.push({ category: "range", severity: "warning",
            text: `Checking back ${handLabel} IP with range advantage on a dry board misses value. A 1/3 pot bet extracts value from weaker pairs and draws.` });
        } else if (heroAdvantage && isWet) {
          grade = "mistake";
          recommendedAction = "bet";
          recommendedSizingBB = medBet;
          points.push({ category: "texture", severity: "warning",
            text: `Checking ${handLabel} on a wet board lets draws realize equity for free. Bet 50% to charge flush and straight draws.` });
        } else if (!heroAdvantage && isIp && isDry) {
          grade = "acceptable";
          recommendedAction = "check";
          points.push({ category: "position", severity: "info",
            text: `Checking back ${handLabel} IP with villain's range advantage on a dry board is reasonable pot control.` });
        } else if (!heroAdvantage && !isIp) {
          grade = "acceptable";
          recommendedAction = "check";
          points.push({ category: "position", severity: "info",
            text: `OOP against villain's range advantage, checking ${handLabel} to control pot size is a solid line.` });
        } else {
          grade = "acceptable";
          recommendedAction = "bet";
          recommendedSizingBB = smallBet;
        }
      } else if (heroAction === "bet" && heroSizingBB) {
        if (heroAdvantage && sizingPct >= 0.25 && sizingPct <= 0.75) {
          grade = "gto_line";
          recommendedAction = "bet";
          recommendedSizingBB = heroSizingBB;
          points.push({ category: "texture", severity: "info",
            text: `Value bet with ${handLabel} — correct sizing captures value from worse pairs and draws.` });
        } else if (sizingPct > 1.0) {
          grade = "mistake";
          recommendedAction = "bet";
          recommendedSizingBB = medBet;
          points.push({ category: "sizing", severity: "warning",
            text: `Overbet with ${handLabel} — villain's range folds everything weaker and calls/raises with everything stronger. Size down to 50–75%.` });
        } else if (!heroAdvantage && sizingPct > 0.5) {
          grade = "acceptable";
          recommendedAction = "bet";
          recommendedSizingBB = smallBet;
          points.push({ category: "range", severity: "info",
            text: `Betting ${handLabel} into villain's range advantage — a smaller sizing reduces risk when you might not be ahead of villain's calling range.` });
        } else {
          grade = "good";
          recommendedAction = "bet";
          recommendedSizingBB = heroSizingBB;
        }
      }

    } else if (isMedium) {
      // ── Second pair ───────────────────────────────────────────────────────
      if (heroAction === "check") {
        grade = "good";
        recommendedAction = "check";
        points.push({ category: "equity", severity: "info",
          text: `Checking second pair is the standard GTO line — it has showdown value but isn't strong enough to bet for value without risking your equity.` });
      } else if (heroAction === "bet" && heroSizingBB) {
        if (sizingPct <= 0.33 && isDry && isIp) {
          grade = "acceptable";
          recommendedAction = "bet";
          recommendedSizingBB = heroSizingBB;
          points.push({ category: "equity", severity: "info",
            text: `Thin value bet with second pair IP on a dry board — small sizing minimizes risk and may extract value from weaker one-pair hands.` });
        } else {
          grade = "mistake";
          recommendedAction = "check";
          points.push({ category: "equity", severity: "warning",
            text: `Betting second pair for value is generally incorrect — villain calls with hands that beat you and folds exactly the hands you beat.` });
        }
      }

    } else if (isMarginal) {
      // ── Bottom pair / underpair ───────────────────────────────────────────
      if (heroAction === "check") {
        grade = "good";
        recommendedAction = "check";
        points.push({ category: "equity", severity: "info",
          text: `Checking ${handLabel} is correct — marginal hands have showdown value worth preserving. Betting turns this into a bluff with limited upside.` });
      } else if (heroAction === "bet" && heroSizingBB) {
        grade = "mistake";
        recommendedAction = "check";
        points.push({ category: "equity", severity: "warning",
          text: `Betting ${handLabel} for value is a mistake — you're only called by hands that beat you. Check to realize your equity cheaply.` });
      }

    } else if (isWeak) {
      // ── High card / no made hand ──────────────────────────────────────────
      if (heroAction === "check") {
        grade = "good";
        recommendedAction = "check";
        if (hasStrongDraw) {
          points.push({ category: "equity", severity: "info",
            text: `Checking with ${mainDrawOuts} draw outs is fine — you can pick up equity on later streets without building a large pot out of position.` });
        } else {
          points.push({ category: "equity", severity: "info",
            text: `Checking with no made hand and no significant draw is correct — wait for a better spot.` });
        }
      } else if (heroAction === "bet" && heroSizingBB) {
        if (hasStrongDraw && heroAdvantage && sizingPct >= 0.33 && sizingPct <= 0.75) {
          grade = "good";
          recommendedAction = "bet";
          recommendedSizingBB = heroSizingBB;
          points.push({ category: "equity", severity: "info",
            text: `Semi-bluff with ${mainDrawOuts} outs and range advantage — fold equity plus draw equity makes this a profitable play.` });
        } else if (hasNutFlushDraw && sizingPct >= 0.33) {
          grade = "good";
          recommendedAction = "bet";
          recommendedSizingBB = heroSizingBB;
          points.push({ category: "equity", severity: "info",
            text: `Semi-bluffing with the nut flush draw is a strong play — you have 9 outs plus fold equity.` });
        } else if (!hasStrongDraw && villainAdvantage) {
          grade = "blunder";
          recommendedAction = "check";
          points.push({ category: "range", severity: "error",
            text: `Bluffing with no made hand and no draw into villain's range advantage is a blunder — villain's strong range calls wide and you have no equity to fall back on.` });
        } else if (!hasStrongDraw) {
          grade = "mistake";
          recommendedAction = "check";
          points.push({ category: "equity", severity: "warning",
            text: `Bluffing without draw equity or range advantage — you need equity to back up a bluff. Find better spots with more backup outs.` });
        } else {
          grade = "acceptable";
          recommendedAction = "check";
          points.push({ category: "equity", severity: "info",
            text: `Semi-bluff has marginal merit here, but checking to realize equity may be the safer line.` });
        }
      }

    } else {
      // ── No hand evaluation available — range-based fallback ──────────────
      if (heroAction === "check") {
        if (heroAdvantage && isDry && isIp) {
          grade = "mistake";
          recommendedAction = "bet";
          recommendedSizingBB = medBet;
          points.push({ category: "range", severity: "warning",
            text: `Checking with range advantage on a dry board IP misses value.` });
        } else if (villainAdvantage) {
          grade = "good";
          recommendedAction = "check";
        } else {
          grade = "acceptable";
          recommendedAction = "check";
        }
      } else if (heroAction === "bet" && heroSizingBB) {
        if (heroAdvantage && sizingPct >= 0.25 && sizingPct <= 0.75) {
          grade = "gto_line";
          recommendedAction = "bet";
          recommendedSizingBB = heroSizingBB;
        } else if (villainAdvantage && isDry && sizingPct > 0.5) {
          grade = "mistake";
          recommendedAction = "check";
          points.push({ category: "range", severity: "warning",
            text: `Betting large into villain's range advantage on a dry board.` });
        } else {
          grade = "acceptable";
          recommendedAction = "bet";
          recommendedSizingBB = heroSizingBB;
        }
      }
    }
  }

  // ── Universal notes ───────────────────────────────────────────────────────
  if (spr < 2 && !isMonster && !isVeryStrong) {
    points.push({ category: "spr", severity: "info",
      text: `SPR of ${spr} — very shallow stack. Top pair or better is a commitment hand at this depth.` });
  } else if (spr > 10 && isMediumStrong) {
    points.push({ category: "spr", severity: "info",
      text: `Deep SPR of ${spr} — at this depth, one-pair hands lose value. Draws gain significant implied odds vs your holding.` });
  }

  if (texture.isMonotone && !isMonster) {
    points.push({ category: "texture", severity: "warning",
      text: `Monotone board — a large portion of villain's range has flush equity. Every bet you make faces strong implied odds from flush draws.` });
  }

  if (texture.label === "dynamic" && isMediumStrong) {
    points.push({ category: "texture", severity: "info",
      text: `Highly dynamic board — many turns will change the hand rankings. Protect your equity now rather than giving free cards.` });
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
  handEval?: HandEvaluation | null,
): string {
  const gradeText: Record<DecisionGrade, string> = {
    gto_line:   "GTO line",
    good:       "Good play",
    acceptable: "Reasonable play",
    mistake:    "Mistake",
    blunder:    "Major error",
  };

  const boardDesc = `${texture.highCardRank}-high ${texture.description} board`;
  const sprDesc = spr < 3 ? "shallow SPR" : spr > 8 ? "deep SPR" : `SPR ${spr}`;
  const handDesc = handEval ? handEval.madeHand.label : state.heroHand;
  const actionDesc = state.heroAction === "bet" && state.heroSizingBB
    ? `betting ${state.heroSizingBB.toFixed(1)}bb`
    : state.heroAction === "raise" && state.heroSizingBB
    ? `raising to ${state.heroSizingBB.toFixed(1)}bb`
    : state.heroAction;

  if (grade === "gto_line" || grade === "good") {
    return `${gradeText[grade]}. ${handDesc} on a ${boardDesc} with ${sprDesc} — ${actionDesc} is the correct approach.`;
  }

  const recDesc = recommended === "bet" && recommendedSizing
    ? `betting ~${recommendedSizing.toFixed(1)}bb`
    : recommended === "raise" && recommendedSizing
    ? `raising to ~${recommendedSizing.toFixed(1)}bb`
    : recommended;

  return `${gradeText[grade]}. With ${handDesc} on a ${boardDesc} (${sprDesc}), ${recDesc} is the stronger line than ${actionDesc}.`;
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
    return Math.round((currentPot + heroSizingBB * 2) * 10) / 10;
  }
  if (heroAction === "raise" && heroSizingBB && villainBetSizingBB) {
    return Math.round((currentPot + villainBetSizingBB + heroSizingBB) * 10) / 10;
  }
  return currentPot;
}

// ── Full analysis runner ──────────────────────────────────────────────────────

export function runAnalysis(state: HandState, handEval?: HandEvaluation | null): AnalysisResult {
  const texture = classifyTexture(state.board);
  const spr = calculateSPR(state.effectiveStackBB, state.potAfterPreflopBB);
  const potOdds = state.villainBetSizingBB
    ? calculatePotOdds(state.villainBetSizingBB, state.potAfterPreflopBB)
    : null;
  const mdf = state.villainBetSizingBB
    ? calculateMDF(state.villainBetSizingBB, state.potAfterPreflopBB)
    : null;
  const rangeAnalysis = estimateRangeAdvantage(state, texture);
  const eval_ = handEval ?? null;
  const { grade, recommendedAction, recommendedSizingBB, coachingPoints } =
    evaluateDecision(state, texture, rangeAnalysis, spr, eval_);
  const summary = buildSummary(grade, state, texture, spr, recommendedAction, recommendedSizingBB, eval_);

  return {
    spr, potOdds, mdf, texture, rangeAnalysis,
    grade,
    heroActionLabel: formatActionLabel(state.heroAction, state.heroSizingBB, state.potAfterPreflopBB),
    recommendedAction, recommendedSizingBB,
    coachingPoints,
    summary,
  };
}
