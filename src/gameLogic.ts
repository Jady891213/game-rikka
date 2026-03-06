export type TileData = {
  id: string;
  top: number;
  bottom: number;
  isStar: boolean;
};

export type WinResult = {
  type: string;
  score: number;
  stars: number;
};

export type ExtendedRules = {
  riichi: boolean;
  threeColors: boolean;
  threePairs: boolean;
  radiance: boolean;
  peerless: boolean;
};

export function generateDeck(): TileData[] {
  const deck: TileData[] = [];
  let idCounter = 0;

  // 21 combinations, 2 copies each = 42 tiles
  for (let i = 1; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      const isStar = i === j;
      deck.push({ id: `tile_${idCounter++}`, top: i, bottom: j, isStar });
      deck.push({ id: `tile_${idCounter++}`, top: i, bottom: j, isStar });
    }
  }

  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export function isTenpai(hand: TileData[], rules?: ExtendedRules): boolean {
  if (hand.length !== 5) return false;
  for (let i = 1; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      const testTile: TileData = { id: 'test', top: i, bottom: j, isStar: i === j };
      if (checkWin([...hand, testTile], true, rules)) {
        return true;
      }
    }
  }
  return false;
}

export function checkWin(hand: TileData[], isPassive: boolean = false, rules?: ExtendedRules): WinResult | null {
  if (hand.length !== 6) return null;

  let bestWin: WinResult | null = null;
  const r = rules || { riichi: true, threeColors: true, threePairs: true, radiance: true, peerless: true };

  const updateBest = (type: string, score: number, stars: number) => {
    if (!bestWin || score > bestWin.score) {
      bestWin = { type, score, stars };
    }
  };

  // 64 combinations of flips
  for (let i = 0; i < 64; i++) {
    const tops: number[] = [];
    const bottoms: number[] = [];
    let stars = 0;
    
    for (let j = 0; j < 6; j++) {
      const flip = (i >> j) & 1;
      tops.push(flip ? hand[j].bottom : hand[j].top);
      bottoms.push(flip ? hand[j].top : hand[j].bottom);
      if (hand[j].isStar) stars++;
    }

    const allBottomsSame = bottoms.every(b => b === bottoms[0]);
    const sortedTops = [...tops].sort((a, b) => a - b);
    const is1to6 = sortedTops.join(',') === '1,2,3,4,5,6';

    // 无双 (Peerless)
    if (r.peerless && stars === 6 && is1to6) {
      updateBest('无双', 9, 0);
    }

    // 六华 (Rikka)
    if (allBottomsSame && is1to6) {
      updateBest('六华', 7, 0); // 6 base + 1 star bonus = 7
    }

    // 辉光 (Radiance)
    if (r.radiance && stars === 6) {
      updateBest('辉光', 5, 6);
    }

    // 三对 (Three Pairs)
    if (r.threePairs) {
      const pairs = [];
      const used = new Set();
      for (let x = 0; x < 6; x++) {
        if (used.has(x)) continue;
        for (let y = x + 1; y < 6; y++) {
          if (!used.has(y) && tops[x] === tops[y] && bottoms[x] === bottoms[y]) {
            pairs.push([x, y]);
            used.add(x);
            used.add(y);
            break;
          }
        }
      }
      if (pairs.length === 3) {
        updateBest('三对', 5 + stars, stars);
      }
    }

    // 三连 (Sanren)
    const checkGroup = (indices: number[]) => {
      const b = bottoms[indices[0]];
      if (bottoms[indices[1]] !== b || bottoms[indices[2]] !== b) return false;
      const t = [tops[indices[0]], tops[indices[1]], tops[indices[2]]].sort((a, b) => a - b);
      return t[0] + 1 === t[1] && t[1] + 1 === t[2];
    };

    const splits = [
      [[0,1,2], [3,4,5]],
      [[0,1,3], [2,4,5]],
      [[0,1,4], [2,3,5]],
      [[0,1,5], [2,3,4]],
      [[0,2,3], [1,4,5]],
      [[0,2,4], [1,3,5]],
      [[0,2,5], [1,3,4]],
      [[0,3,4], [1,2,5]],
      [[0,3,5], [1,2,4]],
      [[0,4,5], [1,2,3]],
    ];

    for (const [g1, g2] of splits) {
      if (checkGroup(g1) && checkGroup(g2)) {
        updateBest('三连', 3 + stars, stars);
      }
    }

    // 三色 (Three Colors)
    if (r.threeColors && isPassive) {
      const uniqueColors = new Set([...tops, ...bottoms]);
      if (uniqueColors.size === 3) {
        updateBest('三色', 3 + stars, stars); // Assuming 3 points base
      }
    }

    // 一色 (Isshoku)
    if (allBottomsSame) {
      updateBest('一色', 1 + stars, stars);
    }
  }

  return bestWin;
}
