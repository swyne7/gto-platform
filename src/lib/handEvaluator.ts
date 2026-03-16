import type { BoardCard, Rank, Suit } from "@/lib/analyzer";

// ── Rank values ───────────────────────────────────────────────────────────────

const RANK_VALUE: Record<Rank, number> = {
  A: 14, K: 13, Q: 12, J: 11, T: 10,
  "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2,
};

const VALUE_RANK: Record<number, string> = {
  14: "Ace", 13: "King", 12: "Queen", 11: "Jack", 10: "Ten",
  9: "Nine", 8: "Eight", 7: "Seven", 6: "Six", 5: "Five", 4: "Four", 3: "Three", 2: "Two",
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type HandRank =
  | "straight_flush" | "quads" | "full_house" | "flush"
  | "straight" | "trips" | "two_pair"
  | "top_pair" | "second_pair" | "bottom_pair" | "overpair" | "underpair"
  | "high_card";

export interface MadeHand {
  rank: HandRank;
  label: string;   // "Top pair"
  detail: string;  // "Aces with king kicker"
}

export interface Draw {
  label: string;       // "Nut flush draw"
  outs: number;
  isBackdoor: boolean;
}

export interface HandEvaluation {
  madeHand: MadeHand;
  draws: Draw[];
  totalOuts: number;
  waysToWin: string[];    // human-readable list: ["Top pair", "Flush draw (9 outs)"]
  handStrength: "strong" | "medium" | "marginal" | "drawing" | "weak";
  equityHint: string;     // rough hint e.g. "~65% vs one pair hands"
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function v(rank: Rank): number { return RANK_VALUE[rank]; }
function rn(val: number): string { return VALUE_RANK[val] ?? String(val); }

function groupByRank(cards: BoardCard[]): Map<number, BoardCard[]> {
  const map = new Map<number, BoardCard[]>();
  for (const c of cards) {
    const val = v(c.rank);
    if (!map.has(val)) map.set(val, []);
    map.get(val)!.push(c);
  }
  return map;
}

function groupBySuit(cards: BoardCard[]): Map<Suit, BoardCard[]> {
  const map = new Map<Suit, BoardCard[]>();
  for (const c of cards) {
    if (!map.has(c.suit)) map.set(c.suit, []);
    map.get(c.suit)!.push(c);
  }
  return map;
}

function hasStraightHigh(values: number[]): number | null {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  // Add low ace
  if (unique.includes(14)) unique.push(1);

  for (let i = 0; i <= unique.length - 5; i++) {
    const window = unique.slice(i, i + 5);
    if (window[0] - window[4] === 4 && new Set(window).size === 5) {
      return window[0];
    }
  }
  return null;
}

// ── Main evaluator ────────────────────────────────────────────────────────────

export function evaluateHand(
  hole1: BoardCard,
  hole2: BoardCard,
  board: BoardCard[],
): HandEvaluation {
  const allCards = [hole1, hole2, ...board];
  const rankGroups = groupByRank(allCards);
  const suitGroups = groupBySuit(allCards);
  const allVals = allCards.map(c => v(c.rank));
  const boardVals = board.map(c => v(c.rank)).sort((a, b) => b - a);
  const h1v = v(hole1.rank);
  const h2v = v(hole2.rank);
  const isPocketPair = h1v === h2v;

  // ── Made hand detection ───────────────────────────────────────────────────

  let madeHand: MadeHand = { rank: "high_card", label: "High card", detail: `${rn(Math.max(h1v, h2v))} high` };

  // Straight flush
  for (const [, sCards] of suitGroups) {
    if (sCards.length >= 5) {
      const sVals = sCards.map(c => v(c.rank));
      const sfHigh = hasStraightHigh(sVals);
      if (sfHigh !== null) {
        madeHand = {
          rank: "straight_flush",
          label: sfHigh === 14 ? "Royal flush" : "Straight flush",
          detail: `${rn(sfHigh)}-high`,
        };
      }
    }
  }

  // Quads
  for (const [val, cards] of rankGroups) {
    if (cards.length >= 4) {
      madeHand = {
        rank: "quads",
        label: "Four of a kind",
        detail: `${rn(val)}s`,
      };
    }
  }

  // Full house
  const trips: number[] = [];
  const pairs: number[] = [];
  for (const [val, cards] of rankGroups) {
    if (cards.length >= 3) trips.push(val);
    else if (cards.length === 2) pairs.push(val);
  }
  if (trips.length >= 2) {
    trips.sort((a, b) => b - a);
    madeHand = { rank: "full_house", label: "Full house", detail: `${rn(trips[0])}s full of ${rn(trips[1])}s` };
  } else if (trips.length === 1 && pairs.length >= 1) {
    pairs.sort((a, b) => b - a);
    madeHand = { rank: "full_house", label: "Full house", detail: `${rn(trips[0])}s full of ${rn(pairs[0])}s` };
  }

  // Flush
  for (const [suit, sCards] of suitGroups) {
    if (sCards.length >= 5) {
      const topCards = sCards.sort((a, b) => v(b.rank) - v(a.rank)).slice(0, 5);
      const isNut = topCards[0].rank === "A";
      madeHand = {
        rank: "flush",
        label: isNut ? "Nut flush" : "Flush",
        detail: `${rn(v(topCards[0].rank))}-high ${suit === "s" ? "spades" : suit === "h" ? "hearts" : suit === "d" ? "diamonds" : "clubs"}`,
      };
    }
  }

  // Straight
  const straightHigh = hasStraightHigh(allVals);
  if (straightHigh !== null && !["straight_flush", "quads", "full_house", "flush"].includes(madeHand.rank)) {
    madeHand = { rank: "straight", label: "Straight", detail: `${rn(straightHigh)}-high` };
  }

  // Trips
  if (trips.length >= 1 && !["straight_flush", "quads", "full_house", "flush", "straight"].includes(madeHand.rank)) {
    const topTrip = Math.max(...trips);
    const isSet = isPocketPair && h1v === topTrip;
    madeHand = {
      rank: "trips",
      label: isSet ? "Set" : "Trips",
      detail: `${rn(topTrip)}s`,
    };
  }

  // Two pair
  if (pairs.length >= 2 && !["straight_flush", "quads", "full_house", "flush", "straight", "trips"].includes(madeHand.rank)) {
    pairs.sort((a, b) => b - a);
    madeHand = {
      rank: "two_pair",
      label: "Two pair",
      detail: `${rn(pairs[0])}s and ${rn(pairs[1])}s`,
    };
  }

  // One pair — classify by board position
  if (pairs.length === 1 && !["straight_flush", "quads", "full_house", "flush", "straight", "trips", "two_pair"].includes(madeHand.rank)) {
    const pairVal = pairs[0];
    const sortedBoard = [...boardVals].sort((a, b) => b - a);

    let rank: HandRank;
    let label: string;

    if (isPocketPair) {
      if (h1v > (sortedBoard[0] ?? 0)) {
        rank = "overpair";
        label = `Overpair — ${rn(h1v)}s`;
      } else {
        rank = "underpair";
        label = `Underpair — ${rn(h1v)}s`;
      }
    } else {
      // Hole card pairs with board
      const pairSource = h1v === pairVal ? hole1 : hole2;
      const kicker = h1v === pairVal ? h2v : h1v;
      void pairSource;

      if (sortedBoard.length > 0 && pairVal === sortedBoard[0]) {
        rank = "top_pair";
        label = `Top pair — ${rn(pairVal)}s, ${rn(kicker)} kicker`;
      } else if (sortedBoard.length > 1 && pairVal === sortedBoard[sortedBoard.length - 1]) {
        rank = "bottom_pair";
        label = `Bottom pair — ${rn(pairVal)}s`;
      } else {
        rank = "second_pair";
        label = `Second pair — ${rn(pairVal)}s`;
      }
    }

    madeHand = { rank, label, detail: label };
  }

  // ── Draw detection (flop/turn only) ────────────────────────────────────────
  const draws: Draw[] = [];
  const isRiver = board.length === 5;

  if (!isRiver && board.length >= 3) {
    // Flush draws
    for (const [suit, sCards] of suitGroups) {
      const holeContrib = [hole1, hole2].filter(c => c.suit === suit).length;
      if (sCards.length === 4 && holeContrib >= 1) {
        const topCard = sCards.sort((a, b) => v(b.rank) - v(a.rank))[0];
        const isNut = topCard.rank === "A" && [hole1, hole2].some(c => c.suit === suit && c.rank === "A");
        draws.push({
          label: isNut ? "Nut flush draw" : "Flush draw",
          outs: 9,
          isBackdoor: false,
        });
      }
      if (sCards.length === 3 && holeContrib >= 1 && board.length === 3) {
        draws.push({ label: "Backdoor flush draw", outs: 2, isBackdoor: true });
      }
    }

    // Straight draws — look at all unique rank values
    const uniqueVals = [...new Set(allVals)].sort((a, b) => b - a);
    if (allVals.includes(14)) uniqueVals.push(1); // low ace

    // OESD / gutshot detection
    let bestStraightDraw = 0; // 8 = OESD, 4 = gutshot
    let bestDrawLabel = "";

    for (let high = 14; high >= 5; high--) {
      const window = [high, high - 1, high - 2, high - 3, high - 4];
      const hits = window.filter(w => uniqueVals.includes(w)).length;
      const heroHits = window.filter(w => h1v === w || h2v === w || (w === 1 && (h1v === 14 || h2v === 14))).length;

      if (hits === 4 && heroHits >= 1) {
        // 4 to a straight — check if OESD or gutshot
        const missingIdx = window.findIndex(w => !uniqueVals.includes(w));
        const isOESD = missingIdx === 0 || missingIdx === 4;
        if (isOESD && bestStraightDraw < 8) {
          bestStraightDraw = 8;
          bestDrawLabel = `Open-ended straight draw`;
        } else if (!isOESD && bestStraightDraw < 4) {
          bestStraightDraw = 4;
          bestDrawLabel = `Gutshot straight draw`;
        }
      }
      // Backdoor (3 to a straight) on flop
      if (hits === 3 && heroHits >= 1 && board.length === 3 && bestStraightDraw === 0) {
        bestStraightDraw = 2;
        bestDrawLabel = "Backdoor straight draw";
      }
    }

    if (bestStraightDraw > 0) {
      draws.push({
        label: bestDrawLabel,
        outs: bestStraightDraw,
        isBackdoor: bestDrawLabel.startsWith("Backdoor"),
      });
    }

    // Overcards (when no pair)
    if (madeHand.rank === "high_card" && !isPocketPair && board.length >= 3) {
      const overcards = [h1v, h2v].filter(hv => hv > (boardVals[0] ?? 0));
      if (overcards.length === 2) {
        draws.push({ label: "Two overcards", outs: 6, isBackdoor: false });
      } else if (overcards.length === 1) {
        draws.push({ label: "One overcard", outs: 3, isBackdoor: false });
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  const mainOuts = draws.filter(d => !d.isBackdoor).reduce((s, d) => s + d.outs, 0);
  const totalOuts = draws.reduce((s, d) => s + d.outs, 0);

  const strongHands: HandRank[] = ["straight_flush", "quads", "full_house", "flush", "straight", "trips", "two_pair"];
  const mediumHands: HandRank[] = ["top_pair", "overpair", "second_pair"];
  const marginalHands: HandRank[] = ["bottom_pair", "underpair"];

  let handStrength: HandEvaluation["handStrength"];
  if (strongHands.includes(madeHand.rank)) handStrength = "strong";
  else if (mediumHands.includes(madeHand.rank)) handStrength = "medium";
  else if (marginalHands.includes(madeHand.rank)) handStrength = "marginal";
  else if (mainOuts >= 8) handStrength = "drawing";
  else handStrength = "weak";

  // Ways to win
  const waysToWin: string[] = [madeHand.label];
  for (const draw of draws) {
    if (!draw.isBackdoor || draws.length === 1) {
      waysToWin.push(`${draw.label} (${draw.outs} outs)`);
    }
  }
  if (draws.some(d => d.isBackdoor)) {
    const bd = draws.filter(d => d.isBackdoor).map(d => d.label.replace("Backdoor ", "")).join(" + ");
    waysToWin.push(`Backdoor ${bd}`);
  }

  // Equity hint
  let equityHint = "";
  if (madeHand.rank === "straight_flush" || madeHand.rank === "quads") equityHint = "~99% vs most holdings";
  else if (madeHand.rank === "full_house" || madeHand.rank === "flush") equityHint = "~90%+ vs one pair";
  else if (madeHand.rank === "straight") equityHint = "~85% vs one pair";
  else if (madeHand.rank === "trips") equityHint = "~85% vs one pair";
  else if (madeHand.rank === "two_pair") equityHint = "~75% vs one pair";
  else if (madeHand.rank === "top_pair" || madeHand.rank === "overpair") {
    if (mainOuts >= 9) equityHint = "~60% (strong draw backup)";
    else equityHint = "~65% vs weaker pairs";
  } else if (madeHand.rank === "second_pair" || madeHand.rank === "bottom_pair") {
    equityHint = mainOuts >= 9 ? "~50% (draw + pair)" : "~40% vs overpairs";
  } else if (mainOuts >= 15) equityHint = `~${Math.min(54, Math.round(mainOuts * 2))}% (combo draw)`;
  else if (mainOuts >= 9) equityHint = `~${Math.round(mainOuts * 2)}% (strong draw)`;
  else if (mainOuts >= 4) equityHint = `~${Math.round(mainOuts * 2)}% (draw)`;
  else equityHint = "~30% or less";

  return { madeHand, draws, totalOuts, waysToWin, handStrength, equityHint };
}

// ── Derive combo key from two exact cards ─────────────────────────────────────

export function cardsToComboKey(c1: BoardCard, c2: BoardCard): string {
  const v1 = RANK_VALUE[c1.rank];
  const v2 = RANK_VALUE[c2.rank];
  const [high, low] = v1 >= v2 ? [c1, c2] : [c2, c1];
  if (high.rank === low.rank) return `${high.rank}${high.rank}`;
  const suited = high.suit === low.suit;
  return `${high.rank}${low.rank}${suited ? "s" : "o"}`;
}

// ── Card display helper ───────────────────────────────────────────────────────

export const SUIT_SYMBOL: Record<Suit, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
export const SUIT_COLOR: Record<Suit, string> = {
  s: "var(--text-primary)", h: "#ef4444", d: "#ef4444", c: "var(--text-primary)",
};
