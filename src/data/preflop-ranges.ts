// Preflop GTO ranges for 100BB cash game (6-max)
// Values: 1.0 = always, 0.5 = mixed (50%), 0.0 = never
// Source: GTO approximations based on standard solver outputs

export type Action = "open" | "call_open" | "3bet" | "fold";

export interface RangeData {
  [combo: string]: number; // 0.0 to 1.0
}

export interface PositionRanges {
  open: RangeData;
  "3bet_vs_ep"?: RangeData;
  "3bet_vs_co"?: RangeData;
  "3bet_vs_btn"?: RangeData;
  "3bet_vs_sb"?: RangeData;
  "call_open_vs_ep"?: RangeData;
  "call_open_vs_co"?: RangeData;
  "call_open_vs_btn"?: RangeData;
  "call_open_vs_sb"?: RangeData;
  [key: string]: RangeData | undefined;
}

// ── UTG (Under the Gun) ─────────────────────────────────────────────────────
const UTG: PositionRanges = {
  open: {
    // Premiums
    AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, "99": 1, "88": 1,
    AKs: 1, AKo: 1, AQs: 1, AQo: 1, AJs: 1, ATs: 1,
    KQs: 1, KJs: 1, KTs: 1,
    QJs: 1, QTs: 1,
    JTs: 1, J9s: 0.5,
    T9s: 0.75, T8s: 0.5,
    "98s": 0.75, "97s": 0.5,
    "87s": 0.75, "86s": 0.5,
    "76s": 0.75, "75s": 0.5,
    "65s": 0.5, "54s": 0.5,
    AJo: 0.5, ATo: 0.25,
    KQo: 0.75, KJo: 0.5,
    "77": 0.75, "66": 0.5, "55": 0.5, "44": 0.25,
  },
};

// ── HJ (Hijack) ──────────────────────────────────────────────────────────────
const HJ: PositionRanges = {
  open: {
    AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, "99": 1, "88": 1, "77": 1, "66": 0.75,
    "55": 0.5, "44": 0.5, "33": 0.25,
    AKs: 1, AKo: 1, AQs: 1, AQo: 1, AJs: 1, AJo: 1, ATs: 1, ATo: 0.75,
    A9s: 0.75, A8s: 0.5, A5s: 0.75, A4s: 0.5, A3s: 0.5,
    KQs: 1, KQo: 1, KJs: 1, KJo: 0.75, KTs: 1, KTo: 0.5,
    K9s: 0.5, K8s: 0.25,
    QJs: 1, QJo: 0.75, QTs: 1, QTo: 0.5, Q9s: 0.75,
    JTs: 1, JTo: 0.5, J9s: 0.75, J8s: 0.5,
    T9s: 1, T8s: 0.75, T7s: 0.5,
    "98s": 1, "97s": 0.75, "96s": 0.5,
    "87s": 1, "86s": 0.75, "85s": 0.5,
    "76s": 1, "75s": 0.75,
    "65s": 0.75, "64s": 0.5,
    "54s": 0.75, "53s": 0.5,
  },
};

// ── CO (Cutoff) ──────────────────────────────────────────────────────────────
const CO: PositionRanges = {
  open: {
    AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, "99": 1, "88": 1, "77": 1,
    "66": 1, "55": 0.75, "44": 0.75, "33": 0.5, "22": 0.5,
    AKs: 1, AKo: 1, AQs: 1, AQo: 1, AJs: 1, AJo: 1, ATs: 1, ATo: 1,
    A9s: 1, A9o: 0.5, A8s: 1, A8o: 0.25, A7s: 0.75, A6s: 0.75,
    A5s: 1, A4s: 1, A3s: 0.75, A2s: 0.75,
    KQs: 1, KQo: 1, KJs: 1, KJo: 1, KTs: 1, KTo: 0.75,
    K9s: 1, K9o: 0.25, K8s: 0.75, K7s: 0.5, K6s: 0.5,
    QJs: 1, QJo: 1, QTs: 1, QTo: 0.75, Q9s: 1, Q8s: 0.75,
    JTs: 1, JTo: 0.75, J9s: 1, J8s: 0.75, J7s: 0.5,
    T9s: 1, T8s: 1, T7s: 0.75,
    "98s": 1, "97s": 1, "96s": 0.75,
    "87s": 1, "86s": 0.75, "85s": 0.5,
    "76s": 1, "75s": 0.75, "74s": 0.5,
    "65s": 1, "64s": 0.75,
    "54s": 1, "53s": 0.75,
    "43s": 0.5,
  },
};

// ── BTN (Button) ─────────────────────────────────────────────────────────────
const BTN: PositionRanges = {
  open: {
    AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, "99": 1, "88": 1, "77": 1,
    "66": 1, "55": 1, "44": 1, "33": 1, "22": 1,
    AKs: 1, AKo: 1, AQs: 1, AQo: 1, AJs: 1, AJo: 1, ATs: 1, ATo: 1,
    A9s: 1, A9o: 0.75, A8s: 1, A8o: 0.5, A7s: 1, A7o: 0.5,
    A6s: 1, A6o: 0.25, A5s: 1, A5o: 0.5, A4s: 1, A4o: 0.25,
    A3s: 1, A2s: 1,
    KQs: 1, KQo: 1, KJs: 1, KJo: 1, KTs: 1, KTo: 1,
    K9s: 1, K9o: 0.75, K8s: 1, K8o: 0.25, K7s: 1, K6s: 0.75,
    K5s: 0.75, K4s: 0.5, K3s: 0.5, K2s: 0.5,
    QJs: 1, QJo: 1, QTs: 1, QTo: 1, Q9s: 1, Q9o: 0.5,
    Q8s: 1, Q7s: 0.75, Q6s: 0.75, Q5s: 0.5,
    JTs: 1, JTo: 1, J9s: 1, J9o: 0.5, J8s: 1, J7s: 0.75, J6s: 0.5,
    T9s: 1, T9o: 0.75, T8s: 1, T8o: 0.5, T7s: 1, T6s: 0.75,
    "98s": 1, "98o": 0.5, "97s": 1, "96s": 1, "95s": 0.5,
    "87s": 1, "87o": 0.5, "86s": 1, "85s": 0.75,
    "76s": 1, "76o": 0.25, "75s": 1, "74s": 0.75,
    "65s": 1, "64s": 0.75, "63s": 0.5,
    "54s": 1, "53s": 0.75, "52s": 0.5,
    "43s": 0.75, "42s": 0.5,
    "32s": 0.5,
  },
};

// ── SB (Small Blind) ─────────────────────────────────────────────────────────
const SB: PositionRanges = {
  open: {
    AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, "99": 1, "88": 1, "77": 1,
    "66": 1, "55": 1, "44": 1, "33": 1, "22": 1,
    AKs: 1, AKo: 1, AQs: 1, AQo: 1, AJs: 1, AJo: 1, ATs: 1, ATo: 1,
    A9s: 1, A9o: 1, A8s: 1, A8o: 0.75, A7s: 1, A7o: 0.5,
    A6s: 1, A6o: 0.5, A5s: 1, A5o: 0.5, A4s: 1, A4o: 0.25,
    A3s: 1, A3o: 0.25, A2s: 1,
    KQs: 1, KQo: 1, KJs: 1, KJo: 1, KTs: 1, KTo: 1,
    K9s: 1, K9o: 0.75, K8s: 1, K8o: 0.5, K7s: 1, K7o: 0.25,
    K6s: 1, K5s: 0.75, K4s: 0.75, K3s: 0.5, K2s: 0.5,
    QJs: 1, QJo: 1, QTs: 1, QTo: 1, Q9s: 1, Q9o: 0.5,
    Q8s: 1, Q7s: 0.75, Q6s: 0.5, Q5s: 0.5,
    JTs: 1, JTo: 1, J9s: 1, J9o: 0.5, J8s: 1, J7s: 0.75, J6s: 0.5,
    T9s: 1, T9o: 0.75, T8s: 1, T8o: 0.5, T7s: 1, T6s: 0.5,
    "98s": 1, "98o": 0.5, "97s": 1, "96s": 0.75,
    "87s": 1, "87o": 0.5, "86s": 0.75, "85s": 0.5,
    "76s": 1, "76o": 0.25, "75s": 0.75, "74s": 0.5,
    "65s": 1, "64s": 0.75, "63s": 0.5,
    "54s": 1, "53s": 0.75, "52s": 0.5,
    "43s": 0.75, "42s": 0.5, "32s": 0.5,
  },
  "3bet_vs_btn": {
    AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 0.5,
    AKs: 1, AKo: 1, AQs: 1, AQo: 0.75, AJs: 0.75,
    KQs: 0.5, A5s: 1, A4s: 1, A3s: 0.75, A2s: 0.5,
    "76s": 0.5, "65s": 0.5, "54s": 0.5,
  },
};

// ── BB (Big Blind) ───────────────────────────────────────────────────────────
const BB: PositionRanges = {
  // BB doesn't open — it defends/3bets vs opens
  open: {}, // placeholder — BB never opens
  "3bet_vs_btn": {
    AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 0.75, "99": 0.5,
    AKs: 1, AKo: 1, AQs: 1, AQo: 0.75, AJs: 0.75, ATs: 0.5,
    KQs: 0.5, A5s: 1, A4s: 1, A3s: 0.75, A2s: 0.5,
    "98s": 0.5, "87s": 0.5, "76s": 0.75, "65s": 0.75, "54s": 0.5,
  },
  "3bet_vs_co": {
    AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 0.5,
    AKs: 1, AKo: 1, AQs: 1, AQo: 0.5, AJs: 0.5,
    A5s: 0.75, A4s: 0.75,
    "76s": 0.5, "65s": 0.5,
  },
  "call_open_vs_btn": {
    // Pairs
    "99": 1, "88": 1, "77": 1, "66": 1, "55": 1, "44": 1, "33": 1, "22": 1,
    // Broadway
    AJo: 1, ATo: 1, A9o: 1, A8o: 0.75, A7o: 0.5, A6o: 0.5, A5o: 0.75, A4o: 0.5,
    KQo: 1, KJo: 1, KTo: 1, K9o: 0.75, K8o: 0.5,
    QJo: 1, QTo: 0.75, Q9o: 0.5,
    JTo: 0.75, J9o: 0.5,
    T9o: 0.5,
    // Suited hands
    AJs: 1, ATs: 1, A9s: 1, A8s: 1, A7s: 1, A6s: 1, A5s: 1, A4s: 1, A3s: 0.75, A2s: 0.75,
    KQs: 1, KJs: 1, KTs: 1, K9s: 1, K8s: 1, K7s: 0.75, K6s: 0.75, K5s: 0.5,
    QJs: 1, QTs: 1, Q9s: 1, Q8s: 0.75, Q7s: 0.5,
    JTs: 1, J9s: 1, J8s: 0.75, J7s: 0.5,
    T9s: 1, T8s: 1, T7s: 0.75,
    "98s": 1, "97s": 1, "96s": 0.75,
    "87s": 1, "86s": 0.75,
    "76s": 1, "75s": 0.75,
    "65s": 1, "64s": 0.5,
    "54s": 0.75, "53s": 0.5,
  },
};

export const RANGES: Record<string, PositionRanges> = {
  UTG,
  HJ,
  CO,
  BTN,
  SB,
  BB,
};

// All 169 unique starting hands in standard 13x13 grid order
export const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"] as const;

export function getComboKey(row: number, col: number): string {
  const r1 = RANKS[row];
  const r2 = RANKS[col];
  if (row === col) return `${r1}${r1}`; // pair
  if (row < col) return `${r1}${r2}s`;  // suited (top-right)
  return `${r2}${r1}o`;                 // offsuit (bottom-left)
}

export function isSuited(row: number, col: number): boolean {
  return row < col;
}

export function isPair(row: number, col: number): boolean {
  return row === col;
}
