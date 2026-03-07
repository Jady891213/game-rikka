/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TileData, generateDeck, checkWin, WinResult, isTenpai, ExtendedRules } from './gameLogic';
import { Tile } from './components/Tile';
import { RefreshCw, Play, Trophy, User, Bot, Book, ChevronDown, ChevronUp, Volume2, VolumeX, X } from 'lucide-react';
import { soundService } from './utils/audio';

type ScoreHistory = {
  round: number;
  type: string;
  score: number;
  isTenpai: boolean;
  isRiichi: boolean;
};

type Player = {
  id: number;
  name: string;
  hand: TileData[];
  score: number;
  isBot: boolean;
  history: ScoreHistory[];
  isRiichi: boolean;
};

type Lang = 'zh' | 'en';

const t = {
  zh: {
    title: '六华 Rikka',
    deck: '牌堆',
    field: '场上',
    log: '活动日志',
    sort: '整理手牌',
    flip: '翻转',
    discard: '打出',
    yourTurn: '你的回合：从牌堆或场上摸一张牌。',
    discardTurn: '请选择一张牌打出。',
    botThinking: '正在思考...',
    roundOver: '回合结束',
    gameOver: '游戏结束！',
    playAgain: '再玩一次',
    nextRound: '下一回合',
    draw: '平局！本回合无人胜出。',
    wins: '胜出',
    tenpaiWinners: '一牌之差（共赢）',
    pts: '分',
    round: '回合',
    showRules: '显示规则',
    hideRules: '隐藏规则',
    rulesTitle: '牌型与计分',
    starBonus: '绚烂奖励：',
    starBonusDesc: '完成牌型后，手牌中每有1个★额外加1分（辉光除外）。',
    extendedRules: '启用拓展规则',
    riichi: '立直',
    threeColors: '三色',
    threePairs: '三对',
    radiance: '辉光',
    peerless: '无双',
    startGame: '开始游戏',
    subtitle: '日系麻将变体，42张牌。匹配花瓣组成胡牌牌型。',
    you: '你',
    bot: '电脑',
  },
  en: {
    title: '六华 Rikka',
    deck: 'Deck',
    field: 'Field',
    log: 'Activity Log',
    sort: 'Sort Hand',
    flip: 'Flip Tile',
    discard: 'Discard',
    yourTurn: 'Your turn: Draw a tile from the deck or field.',
    discardTurn: 'Select a tile to discard.',
    botThinking: 'is thinking...',
    roundOver: 'Round Over',
    gameOver: 'Game Over!',
    playAgain: 'Play Again',
    nextRound: 'Next Round',
    draw: 'Draw! No one won this round.',
    wins: 'Wins',
    tenpaiWinners: 'Tenpai Winners',
    pts: 'pts',
    round: 'Round',
    showRules: 'Show Rules',
    hideRules: 'Hide Rules',
    rulesTitle: 'Hand Patterns & Scoring',
    starBonus: 'Radiance Bonus:',
    starBonusDesc: '+1 pt for each Star tile in a winning hand (except Kuikou).',
    extendedRules: 'Enable Extended Rules',
    riichi: 'Riichi',
    threeColors: 'Sanshoku',
    threePairs: 'Sandui',
    radiance: 'Kuikou',
    peerless: 'Musou',
    startGame: 'Start Game',
    subtitle: 'A Japanese Riichi Mahjong variant with 42 tiles. Match petals to form winning hands.',
    you: 'You',
    bot: 'Bot',
  }
};

const StarIcon = ({ className = "inline-block -mt-1 mx-0.5" }: { className?: string }) => (
  <svg width="12" height="12" viewBox="0 0 100 100" className={className}>
    <polygon points="50,5 63,27.5 89,27.5 76,50 89,72.5 63,72.5 50,95 37,72.5 11,72.5 24,50 11,27.5 37,27.5" fill="#fbbf24" stroke="#fff" strokeWidth="8" />
  </svg>
);

const rulesData = [
  {
    id: 'isshoku',
    name: { zh: '一色', en: 'Isshoku' },
    pts: <>{1}+<StarIcon/> pt</>,
    desc: { zh: '6张牌下方点数全部相同。', en: '6 tiles with identical bottom numbers.' },
    example: [{t:2,b:1}, {t:2,b:1}, {t:3,b:1}, {t:4,b:1}, {t:5,b:1}, {t:6,b:1}]
  },
  {
    id: 'sanren',
    name: { zh: '三连', en: 'Sanren' },
    pts: <>{3}+<StarIcon/> pt</>,
    desc: { zh: '2组3连组合（下方点数相同，上方点数连续的3张牌）。', en: 'Two sets of 3 tiles. Each set has identical bottoms and sequential tops.' },
    example: [{t:1,b:1}, {t:2,b:1}, {t:3,b:1}, {t:3,b:2}, {t:4,b:2}, {t:5,b:2}]
  },
  {
    id: 'rikka',
    name: { zh: '六华', en: 'Rikka' },
    pts: <>{6}+{1} pt</>,
    desc: { zh: '6张牌下方点数全部相同，上方为1-6连续。', en: '6 tiles with identical bottoms and tops 1 through 6.' },
    example: [{t:1,b:1}, {t:2,b:1}, {t:3,b:1}, {t:4,b:1}, {t:5,b:1}, {t:6,b:1}]
  },
  {
    id: 'sandui',
    ruleKey: 'threePairs',
    name: { zh: '三对', en: 'Sandui' },
    pts: <>{5}+<StarIcon/> pt</>,
    desc: { zh: '3对一模一样的牌。', en: '3 pairs of identical tiles.' },
    example: [{t:1,b:1}, {t:1,b:1}, {t:3,b:2}, {t:3,b:2}, {t:6,b:4}, {t:6,b:4}]
  },
  {
    id: 'sanshoku',
    ruleKey: 'threeColors',
    name: { zh: '三色', en: 'Sanshoku' },
    pts: <>{3}+<StarIcon/> pt</>,
    desc: { zh: '牌面只有三种颜色（只能被动胡/一牌之差）。', en: 'Hand contains exactly 3 unique numbers across all tops and bottoms. (Passive win only).' },
    example: [{t:1,b:2}, {t:1,b:3}, {t:2,b:3}, {t:1,b:1}, {t:2,b:2}, {t:3,b:3}]
  },
  {
    id: 'kuikou',
    ruleKey: 'radiance',
    name: { zh: '辉光', en: 'Kuikou' },
    pts: <>{5} pt</>,
    desc: { zh: '全星牌（固定5分，不计算绚烂奖励）。', en: '6 Star tiles. (Ignores Radiance bonus).' },
    example: [{t:1,b:1,s:true}, {t:2,b:2,s:true}, {t:2,b:2,s:true}, {t:4,b:4,s:true}, {t:5,b:5,s:true}, {t:5,b:5,s:true}]
  },
  {
    id: 'musou',
    ruleKey: 'peerless',
    name: { zh: '无双', en: 'Musou' },
    pts: <>{3}+{6} pt</>,
    desc: { zh: '全星牌且上方1-6连续（固定3分+绚烂6分）。', en: '6 Star tiles with tops 1 through 6. (3 base + 6 Radiance).' },
    example: [{t:1,b:1,s:true}, {t:2,b:2,s:true}, {t:3,b:3,s:true}, {t:4,b:4,s:true}, {t:5,b:5,s:true}, {t:6,b:6,s:true}]
  }
];

const getHandTypeName = (type: string, lang: Lang) => {
  if (lang === 'zh') return type;
  const map: Record<string, string> = {
    '无双': 'Musou',
    '六华': 'Rikka',
    '辉光': 'Kuikou',
    '三对': 'Sandui',
    '三连': 'Sanren',
    '三色': 'Sanshoku',
    '一色': 'Isshoku'
  };
  return map[type] || type;
};

export default function App() {
  const [lang, setLang] = useState<Lang>('zh');
  const [isMuted, setIsMuted] = useState(false);
  const [enabledRules, setEnabledRules] = useState<ExtendedRules>({
    riichi: true,
    threeColors: true,
    threePairs: true,
    radiance: true,
    peerless: true
  });
  const [openHistoryId, setOpenHistoryId] = useState<number | null>(null);
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [players, setPlayers] = useState<Player[]>([]);
  const [fieldFaceDown, setFieldFaceDown] = useState<TileData[]>([]);
  const [fieldFaceUp, setFieldFaceUp] = useState<TileData[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [phase, setPhase] = useState<'START' | 'DRAW' | 'DISCARD' | 'ROUND_END' | 'GAME_OVER'>('START');
  const isProcessingWin = useRef(false);
  const [round, setRound] = useState<number>(1);
  const [startingPlayerIndex, setStartingPlayerIndex] = useState<number>(0);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [winnerInfo, setWinnerInfo] = useState<{ player: Player, win: WinResult, tenpaiWinners: { player: Player, win: WinResult, finalScore: number }[] } | null>(null);
  const [currentWinOption, setCurrentWinOption] = useState<WinResult | null>(null);
  const [logs, setLogs] = useState<{key: string, args: any[]}[]>([]);
  const [isLogsOpen, setIsLogsOpen] = useState(true);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const addLog = (key: string, ...args: any[]) => {
    setLogs(prev => [{key, args}, ...prev].slice(0, 10));
  };

  const getPlayerName = (id: number) => id === 0 ? t[lang].you : `${t[lang].bot} ${id}`;

  const renderLog = (log: {key: string, args: any[]}) => {
    const { key, args } = log;
    if (lang === 'zh') {
      switch(key) {
        case 'ROUND_START': return `第 ${args[0]} 回合开始。${getPlayerName(args[1])} 的回合。`;
        case 'DECK_EMPTY': return '牌堆已空！本回合平局。';
        case 'DRAW_DECK': return `${getPlayerName(args[0])} 从牌堆摸了一张牌。`;
        case 'DRAW_FIELD': return `${getPlayerName(args[0])} 拿取了场上的牌。`;
        case 'DISCARD': return `${getPlayerName(args[0])} 打出了一张牌。`;
        case 'TURN': return `${getPlayerName(args[0])} 的回合。`;
        case 'WIN': return `${getPlayerName(args[0])} 以 ${getHandTypeName(args[1], lang)} 胜出！(+${args[2]} 分)`;
        case 'TENPAI': return `${getPlayerName(args[0])} 达成一牌之差！(+${args[1]} 分)`;
        case 'SORTED': return '手牌已整理。';
        case 'RIICHI': return `${getPlayerName(args[0])} 宣布立直！`;
        default: return '';
      }
    } else {
      switch(key) {
        case 'ROUND_START': return `Round ${args[0]} started. ${getPlayerName(args[1])}'s turn.`;
        case 'DECK_EMPTY': return 'Deck is empty! Round ends in a draw.';
        case 'DRAW_DECK': return `${getPlayerName(args[0])} drew a tile from the deck.`;
        case 'DRAW_FIELD': return `${getPlayerName(args[0])} drew a tile from the field.`;
        case 'DISCARD': return `${getPlayerName(args[0])} discarded a tile.`;
        case 'TURN': return `${getPlayerName(args[0])}'s turn.`;
        case 'WIN': return `${getPlayerName(args[0])} wins with ${getHandTypeName(args[1], lang)}! (+${args[2]} pts)`;
        case 'TENPAI': return `${getPlayerName(args[0])} also wins via Tenpai! (+${args[1]} pts)`;
        case 'SORTED': return 'Hand sorted.';
        case 'RIICHI': return `${getPlayerName(args[0])} declared Riichi!`;
        default: return '';
      }
    }
  };

  const winningTileIds = useMemo(() => {
    if (!players[0] || players[0].hand.length !== 5) return new Set<string>();
    const wins = new Set<string>();
    fieldFaceUp.forEach(t => {
      if (checkWin([...players[0].hand, t], true, enabledRules)) wins.add(t.id);
    });
    return wins;
  }, [players[0]?.hand, fieldFaceUp]);

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    soundService.isMuted = newMuted;
  };

  const startNewGame = () => {
    soundService.playNewGame();
    const newPlayers: Player[] = [
      { id: 0, name: t[lang].you, hand: [], score: 0, isBot: false, history: [], isRiichi: false }
    ];
    for (let i = 1; i < playerCount; i++) {
      newPlayers.push({ id: i, name: `${t[lang].bot} ${i}`, hand: [], score: 0, isBot: true, history: [], isRiichi: false });
    }
    setPlayers(newPlayers);
    setRound(1);
    setStartingPlayerIndex(0);
    startRound(0, newPlayers, 1);
  };

  const startRound = (startIdx: number, currentPlayers: Player[] = players, roundNum: number = round) => {
    isProcessingWin.current = false;
    const deck = generateDeck();
    const newPlayers = currentPlayers.map(p => ({ ...p, hand: [], isRiichi: false }));
    
    // Deal 5 tiles to each player
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < newPlayers.length; j++) {
        newPlayers[j].hand.push(deck.pop()!);
      }
    }

    setPlayers(newPlayers);
    setFieldFaceDown(deck);
    setFieldFaceUp([]);
    setCurrentPlayerIndex(startIdx);
    setPhase('DRAW');
    setSelectedTileIndex(null);
    setWinnerInfo(null);
    addLog('ROUND_START', roundNum, startIdx);
  };

  const handleDrawFaceDown = () => {
    if (phase !== 'DRAW' || players[currentPlayerIndex].isBot) return;
    if (fieldFaceDown.length === 0) {
      addLog('DECK_EMPTY');
      endRoundDraw();
      return;
    }

    soundService.playDraw();
    const tile = fieldFaceDown[0];
    setFieldFaceDown(prev => prev.slice(1));
    
    const newHand = [...players[currentPlayerIndex].hand, tile];
    updatePlayerHand(currentPlayerIndex, newHand);
    setPhase('DISCARD');
    addLog('DRAW_DECK', currentPlayerIndex);
    checkPlayerWin(newHand, false);
  };

  const handleDrawFaceUp = (tile: TileData) => {
    if (phase !== 'DRAW' || players[currentPlayerIndex].isBot) return;
    
    if (players[currentPlayerIndex].isRiichi) {
      const testHand = [...players[currentPlayerIndex].hand, tile];
      if (!checkWin(testHand, true, enabledRules)) {
        return; // Disallow drawing from field if in Riichi and it's not a win
      }
    }
    
    soundService.playDraw();
    setFieldFaceUp(prev => prev.filter(t => t.id !== tile.id));
    const newHand = [...players[currentPlayerIndex].hand, tile];
    updatePlayerHand(currentPlayerIndex, newHand);
    setPhase('DISCARD');
    addLog('DRAW_FIELD', currentPlayerIndex);
    checkPlayerWin(newHand, true);
  };

  const checkPlayerWin = (hand: TileData[], isPassive: boolean) => {
    const win = checkWin(hand, isPassive, enabledRules);
    if (win) {
      if (currentPlayerIndex === 0) {
        setCurrentWinOption(win);
      } else {
        handleWin(currentPlayerIndex, hand, win);
      }
    } else {
      setCurrentWinOption(null);
      if (currentPlayerIndex === 0 && players[0].isRiichi) {
        // Auto discard if in Riichi and no win
        setTimeout(() => {
          const discardedTile = hand[5];
          const finalHand = hand.slice(0, 5);
          updatePlayerHand(0, finalHand);
          setFieldFaceUp(prev => [...prev, discardedTile]);
          setSelectedTileIndex(null);
          addLog('DISCARD', 0);
          nextTurn();
        }, 800);
      }
    }
  };

  const handleDiscard = (idx?: number) => {
    const targetIdx = idx !== undefined ? idx : selectedTileIndex;
    if (phase !== 'DISCARD' || players[currentPlayerIndex].isBot || targetIdx === null) return;
    
    soundService.playDiscard();
    setCurrentWinOption(null);
    const hand = players[currentPlayerIndex].hand;
    const discardedTile = hand[targetIdx];
    const newHand = hand.filter((_, i) => i !== targetIdx);
    
    updatePlayerHand(currentPlayerIndex, newHand);
    setFieldFaceUp(prev => [...prev, discardedTile]);
    setSelectedTileIndex(null);
    addLog('DISCARD', currentPlayerIndex);
    nextTurn();
  };

  const handleRiichi = () => {
    if (phase !== 'DISCARD' || players[currentPlayerIndex].isBot || selectedTileIndex === null) return;
    
    soundService.playRiichi();
    setPlayers(prev => {
      const next = [...prev];
      next[currentPlayerIndex] = { ...next[currentPlayerIndex], isRiichi: true };
      return next;
    });
    
    handleDiscard();
  };

  const handleSort = () => {
    if (!players[0] || players[0].hand.length === 0 || players[0].isRiichi) return;
    
    const hand = [...players[0].hand];
    
    // Heuristic: Find the most common number to be the bottom
    const counts = new Array(7).fill(0);
    hand.forEach(t => {
      counts[t.top]++;
      counts[t.bottom]++;
    });
    
    let bestBottom = 1;
    let maxCount = 0;
    for (let i = 1; i <= 6; i++) {
      if (counts[i] > maxCount) {
        maxCount = counts[i];
        bestBottom = i;
      }
    }
    
    // Flip tiles so bestBottom is on bottom if possible
    const flippedHand = hand.map(t => {
      if (t.top === bestBottom && t.bottom !== bestBottom) {
        return { ...t, top: t.bottom, bottom: t.top };
      }
      return t;
    });
    
    // Sort by bottom, then top
    flippedHand.sort((a, b) => {
      if (a.bottom !== b.bottom) return a.bottom - b.bottom;
      return a.top - b.top;
    });
    
    updatePlayerHand(0, flippedHand);
    addLog('SORTED');
  };

  const updatePlayerHand = (playerIdx: number, hand: TileData[]) => {
    setPlayers(prev => {
      const next = [...prev];
      next[playerIdx] = { ...next[playerIdx], hand };
      return next;
    });
  };

  const nextTurn = () => {
    const nextIdx = (currentPlayerIndex + 1) % players.length;
    setCurrentPlayerIndex(nextIdx);
    setPhase('DRAW');
    addLog('TURN', nextIdx);
  };

  const endRoundDraw = () => {
    setPhase('ROUND_END');
    setWinnerInfo(null);
  };

  const handleWin = (winnerIdx: number, winningHand: TileData[], winResult: WinResult) => {
    if (phase === 'ROUND_END' || phase === 'GAME_OVER' || winnerInfo !== null || isProcessingWin.current) return;
    isProcessingWin.current = true;
    soundService.playWin();
    const winner = players[winnerIdx];
    
    // Add Riichi bonus
    let finalScore = winResult.score;
    if (winner.isRiichi) {
      finalScore += 1;
    }
    
    addLog('WIN', winnerIdx, winResult.type, finalScore);
    
    // Check Tenpai (One tile away) for other players
    const tenpaiWinners: { player: Player, win: WinResult, finalScore: number }[] = [];
    
    players.forEach((p, idx) => {
      if (idx === winnerIdx) return;
      
      let bestTenpaiWin: WinResult | null = null;
      for (const faceUpTile of fieldFaceUp) {
        const testHand = [...p.hand, faceUpTile];
        const w = checkWin(testHand, true, enabledRules);
        if (w && (!bestTenpaiWin || w.score > bestTenpaiWin.score)) {
          bestTenpaiWin = w;
        }
      }
      
      if (bestTenpaiWin) {
        let tScore = bestTenpaiWin.score;
        if (p.isRiichi) tScore += 1;
        tenpaiWinners.push({ player: p, win: bestTenpaiWin, finalScore: tScore });
        addLog('TENPAI', p.id, tScore);
      }
    });

    setWinnerInfo({ player: winner, win: { ...winResult, score: finalScore }, tenpaiWinners });
    
    // Update scores
    setPlayers(prev => {
      const next = prev.map(p => ({ ...p, history: [...p.history] }));
      next[winnerIdx].score += finalScore;
      next[winnerIdx].history = [...next[winnerIdx].history, { round, type: winResult.type, score: finalScore, isTenpai: false, isRiichi: winner.isRiichi }];
      
      tenpaiWinners.forEach(tw => {
        const pIdx = next.findIndex(p => p.id === tw.player.id);
        if (pIdx !== -1) {
          next[pIdx].score += tw.finalScore;
          next[pIdx].history = [...next[pIdx].history, { round, type: tw.win.type, score: tw.finalScore, isTenpai: true, isRiichi: tw.player.isRiichi }];
        }
      });
      return next;
    });
    
    setPhase('ROUND_END');
  };

  const proceedToNextRound = () => {
    soundService.playNewGame();
    const nextStart = (startingPlayerIndex + 1) % players.length;
    setStartingPlayerIndex(nextStart);
    setRound(prev => prev + 1);
    startRound(nextStart, players, round + 1);
  };

  // Bot Logic
  useEffect(() => {
    let isCancelled = false;
    if (phase === 'DRAW' && players[currentPlayerIndex]?.isBot) {
      const playBotTurn = async () => {
        await new Promise(r => setTimeout(r, 1000));
        if (isCancelled) return;
        
        const bot = players[currentPlayerIndex];
        
        // 1. Check if can win with any face up tile
        let bestFaceUpTile: TileData | null = null;
        let bestFaceUpScore = -1;
        for (const t of fieldFaceUp) {
          const testHand = [...bot.hand, t];
          const win = checkWin(testHand, true, enabledRules);
          if (win && win.score > bestFaceUpScore) {
            bestFaceUpScore = win.score;
            bestFaceUpTile = t;
          }
        }

        let drawnTile: TileData;
        if (bestFaceUpTile) {
          drawnTile = bestFaceUpTile;
          setFieldFaceUp(prev => prev.filter(t => t.id !== drawnTile.id));
          addLog('DRAW_FIELD', currentPlayerIndex);
        } else {
          // Try to draw from field based on heuristic
          let interestingFieldTile: TileData | null = null;
          if (!bot.isRiichi && fieldFaceUp.length > 0) {
            const counts = new Array(7).fill(0);
            bot.hand.forEach(t => { counts[t.top]++; counts[t.bottom]++; });
            
            // Find a field tile that shares a number we have at least 2 of
            const candidates = fieldFaceUp.filter(t => counts[t.top] >= 2 || counts[t.bottom] >= 2);
            if (candidates.length > 0 && Math.random() > 0.4) {
              interestingFieldTile = candidates[Math.floor(Math.random() * candidates.length)];
            }
          }

          if (interestingFieldTile) {
            drawnTile = interestingFieldTile;
            setFieldFaceUp(prev => prev.filter(t => t.id !== drawnTile.id));
            addLog('DRAW_FIELD', currentPlayerIndex);
          } else {
            if (fieldFaceDown.length === 0) {
              endRoundDraw();
              return;
            }
            drawnTile = fieldFaceDown[0];
            setFieldFaceDown(prev => prev.slice(1));
            addLog('DRAW_DECK', currentPlayerIndex);
          }
        }

        if (isCancelled) return;
        const newHand = [...bot.hand, drawnTile];
        updatePlayerHand(currentPlayerIndex, newHand);
        
        const win = checkWin(newHand, !!bestFaceUpTile, enabledRules);
        if (win) {
          handleWin(currentPlayerIndex, newHand, win);
          return;
        }

        // Discard phase
        await new Promise(r => setTimeout(r, 1000));
        if (isCancelled) return;
        
        let bestDiscardIdx = 0;
        
        if (bot.isRiichi) {
          bestDiscardIdx = 5; // Auto-discard the drawn tile
        } else {
          let maxHeuristic = -1;
          for (let i = 0; i < 6; i++) {
            const testHand = newHand.filter((_, idx) => idx !== i);
            const tenpai = isTenpai(testHand, enabledRules);
            
            const counts = new Array(7).fill(0);
            for (const t of testHand) {
              counts[t.top]++;
              counts[t.bottom]++;
            }
            const h = Math.max(...counts);
            const isStar = newHand[i].isStar ? 0 : 1;
            const score = (tenpai ? 1000 : 0) + h * 10 + isStar;
            
            if (score > maxHeuristic) {
              maxHeuristic = score;
              bestDiscardIdx = i;
            }
          }
        }

        if (isCancelled) return;
        const discardedTile = newHand[bestDiscardIdx];
        const finalHand = newHand.filter((_, idx) => idx !== bestDiscardIdx);
        
        let isDeclaringRiichi = false;
        if (enabledRules.riichi && !bot.isRiichi && isTenpai(finalHand, { ...enabledRules, threeColors: false })) {
          isDeclaringRiichi = true;
          soundService.playRiichi();
          addLog('RIICHI', currentPlayerIndex);
        }
        
        setPlayers(prev => {
          const next = [...prev];
          next[currentPlayerIndex] = { 
            ...next[currentPlayerIndex], 
            hand: finalHand,
            isRiichi: bot.isRiichi || isDeclaringRiichi
          };
          return next;
        });
        
        setFieldFaceUp(prev => [...prev, discardedTile]);
        addLog('DISCARD', currentPlayerIndex);
        nextTurn();
      };
      
      playBotTurn();
    }
    return () => {
      isCancelled = true;
    };
  }, [phase, currentPlayerIndex]);

  if (phase === 'START') {
    return (
      <div className="min-h-screen bg-emerald-900 text-white flex flex-col items-center justify-center p-4 relative">
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={toggleMute} className="p-2 bg-emerald-800 rounded border border-emerald-600 text-emerald-400 hover:bg-emerald-700 hover:text-white transition-colors">
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <div className="flex bg-emerald-800 rounded overflow-hidden border border-emerald-600">
            <button onClick={() => setLang('zh')} className={`px-3 py-1 text-sm font-bold ${lang === 'zh' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:bg-emerald-700'}`}>中</button>
            <button onClick={() => setLang('en')} className={`px-3 py-1 text-sm font-bold ${lang === 'en' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:bg-emerald-700'}`}>EN</button>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 w-full max-w-6xl mt-12 md:mt-0">
          {/* Left side: Grid of tiles (Hidden on mobile) */}
          <div className="hidden md:flex flex-col gap-1 md:gap-2 bg-emerald-950/50 p-4 md:p-6 rounded-2xl border border-emerald-800/50 shadow-2xl scale-90 md:scale-100">
            {[1, 2, 3, 4, 5, 6].map(row => (
              <div key={`row-${row}`} className="flex gap-1 md:gap-2">
                {[1, 2, 3, 4, 5, 6].map(col => (
                  <Tile key={`tile-${row}-${col}`} tile={{ id: `t-${row}-${col}`, top: row, bottom: col, isStar: row === col }} size="mini" />
                ))}
              </div>
            ))}
            <div className="flex gap-1 md:gap-2 mt-4 pt-4 border-t border-emerald-800/50">
              {[1, 2, 3, 4, 5, 6].map(col => (
                <Tile key={`star-${col}`} tile={{ id: `s-${col}`, top: col, bottom: col, isStar: true }} size="mini" />
              ))}
            </div>
          </div>

          {/* Right side: Start Menu */}
          <div className="flex flex-col items-center bg-emerald-950/30 p-6 md:p-12 rounded-3xl border border-emerald-800/30 w-full max-w-md">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 md:mb-8 text-yellow-400 drop-shadow-lg text-center">{t[lang].title}</h1>
            <p className="text-sm md:text-xl mb-8 md:mb-12 max-w-md text-center text-emerald-100">{t[lang].subtitle}</p>
            
            <div className="flex flex-col items-center gap-2 md:gap-4 mb-6 md:mb-8">
              <div className="text-emerald-200 font-semibold tracking-wider text-sm md:text-base">{lang === 'zh' ? '选择人数' : 'Select Players'}</div>
              <div className="flex gap-2 md:gap-4">
                {[2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    onClick={() => setPlayerCount(num)}
                    className={`w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center text-xl md:text-2xl font-bold transition-all ${playerCount === num ? 'bg-yellow-500 text-emerald-900 ring-4 ring-yellow-400/50 scale-110' : 'bg-emerald-800 text-emerald-300 hover:bg-emerald-700'}`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 md:gap-4 mb-8 md:mb-12">
              <div className="text-emerald-200 font-semibold tracking-wider text-sm md:text-base">{t[lang].extendedRules}</div>
              <div className="flex flex-wrap justify-center gap-2 md:gap-3 max-w-lg">
                {(['riichi', 'threeColors', 'threePairs', 'radiance', 'peerless'] as const).map(rule => (
                  <label key={rule} className={`flex items-center gap-1 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full cursor-pointer transition-colors border ${enabledRules[rule] ? 'bg-emerald-700/80 border-emerald-500' : 'bg-emerald-900/50 border-emerald-800/50 hover:bg-emerald-800/50'}`}>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={enabledRules[rule]}
                      onChange={(e) => setEnabledRules(prev => ({ ...prev, [rule]: e.target.checked }))}
                    />
                    <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${enabledRules[rule] ? 'bg-yellow-400' : 'bg-emerald-800'}`} />
                    <span className={`font-medium text-xs md:text-base ${enabledRules[rule] ? 'text-emerald-100' : 'text-emerald-500'}`}>{t[lang][rule]}</span>
                  </label>
                ))}
              </div>
            </div>

            <button 
              onClick={startNewGame}
              className="px-6 py-3 md:px-8 md:py-4 bg-yellow-500 hover:bg-yellow-400 text-emerald-900 font-bold rounded-full text-xl md:text-2xl shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
            >
              <Play fill="currentColor" className="w-5 h-5 md:w-6 md:h-6" /> {t[lang].startGame}
            </button>
          </div>
        </div>

        <div className="absolute bottom-4 text-emerald-500/60 text-xs md:text-sm font-medium tracking-wide">
          {lang === 'zh' ? '开发 by 五只乳鸽' : 'Developed by ruge'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-900 text-white flex flex-col">
      {/* Header */}
      <header className="p-2 md:p-4 bg-emerald-950 flex flex-col md:flex-row justify-between items-center shadow-md gap-2 md:gap-0">
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <h1 className="text-xl md:text-2xl font-bold text-yellow-400">{t[lang].title}</h1>
          <div className="flex gap-2">
            <button onClick={toggleMute} className="p-1.5 bg-emerald-900 rounded border border-emerald-700 text-emerald-400 hover:bg-emerald-800 hover:text-white transition-colors">
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <div className="flex bg-emerald-900 rounded overflow-hidden border border-emerald-700">
              <button onClick={() => setLang('zh')} className={`px-2 py-1 text-xs font-bold ${lang === 'zh' ? 'bg-emerald-700 text-white' : 'text-emerald-400 hover:bg-emerald-800'}`}>中</button>
              <button onClick={() => setLang('en')} className={`px-2 py-1 text-xs font-bold ${lang === 'en' ? 'bg-emerald-700 text-white' : 'text-emerald-400 hover:bg-emerald-800'}`}>EN</button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2 md:gap-4 w-full md:w-auto">
          {players.map(p => (
            <div key={p.id} className="relative">
              <div 
                onClick={() => setOpenHistoryId(openHistoryId === p.id ? null : p.id)}
                className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 rounded cursor-pointer transition-colors ${p.id === currentPlayerIndex ? 'bg-emerald-700 ring-2 ring-yellow-400' : 'bg-emerald-800 hover:bg-emerald-700'}`}
              >
                {p.isBot ? <Bot size={14} className="md:w-4 md:h-4" /> : <User size={14} className="md:w-4 md:h-4" />}
                <span className="font-semibold text-xs md:text-base">{getPlayerName(p.id)}</span>
                <span className="text-yellow-400 font-mono text-xs md:text-base">{p.score}</span>
              </div>
              
              {/* History Dropdown */}
              {openHistoryId === p.id && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-emerald-950 border border-emerald-700 rounded shadow-xl z-50 p-2">
                  <div className="text-xs font-bold text-emerald-400 mb-2 border-b border-emerald-800 pb-1">{lang === 'zh' ? '得分记录' : 'Score History'}</div>
                  {p.history.length === 0 ? (
                    <div className="text-xs text-emerald-600 italic">{lang === 'zh' ? '暂无得分' : 'No scores yet'}</div>
                  ) : (
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                      {p.history.map((h, i) => (
                        <div key={i} className="text-[10px] flex flex-col bg-emerald-900/50 p-1.5 rounded">
                          <div className="flex justify-between text-emerald-200">
                            <span>{lang === 'zh' ? `第 ${h.round} 回合` : `Round ${h.round}`}</span>
                            <span className="text-yellow-400 font-bold">+{h.score}</span>
                          </div>
                          <div className="flex justify-between text-emerald-400/80">
                            <span>{getHandTypeName(h.type, lang)} {h.isRiichi && <span className="text-yellow-400 text-[9px] ml-1">({lang === 'zh' ? '立直' : 'Riichi'} +1)</span>}</span>
                            <span>{h.isTenpai ? (lang === 'zh' ? '一牌之差' : 'Tenpai') : (lang === 'zh' ? '胡牌' : 'Win')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="hidden md:block text-emerald-200 font-mono">{t[lang].round} {round}</div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        
        {/* Rules Panel */}
        <div className="absolute top-2 left-2 md:top-4 md:left-4 z-20">
          <button onClick={() => setIsRulesOpen(true)} className="bg-emerald-800 hover:bg-emerald-700 px-2 py-1 md:px-3 md:py-2 rounded shadow-md flex items-center gap-1 md:gap-2 text-xs md:text-sm font-semibold transition-colors">
            <Book size={16} /> {t[lang].showRules}
          </button>
        </div>

        {/* Left Spacer for Symmetry on PC */}
        <div className="hidden md:block md:w-48 h-full shrink-0 border-r border-emerald-800/50 bg-emerald-900/20 pointer-events-none"></div>

        {/* Field */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-emerald-900/40 flex flex-col items-center">
          <div className="w-full max-w-4xl">
            <div className="text-emerald-300 text-xs md:text-sm font-semibold uppercase tracking-widest mb-4 text-center md:text-left">{t[lang].field}</div>
            <div className="flex flex-wrap content-start justify-center md:justify-start gap-2 md:gap-3">
              {fieldFaceUp.map(tile => (
                <Tile 
                  key={tile.id} 
                  tile={tile} 
                  isWinningTile={winningTileIds.has(tile.id)}
                  className="scale-90 origin-top-left"
                  onClick={() => handleDrawFaceUp(tile)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Deck */}
        <div className="absolute bottom-2 right-2 md:static md:w-48 md:h-auto shrink-0 md:border-l border-emerald-800/50 p-2 md:p-8 flex flex-col items-end md:items-center justify-end md:justify-center gap-2 md:gap-8 bg-transparent md:bg-emerald-900/20 pointer-events-none md:pointer-events-auto z-10">
          <div className="pointer-events-auto flex flex-col items-end md:items-center">
            <div className="text-emerald-300 text-[10px] md:text-sm font-semibold uppercase tracking-widest mb-2 md:mb-8 bg-emerald-900/80 md:bg-transparent px-2 py-1 rounded">{t[lang].deck} ({fieldFaceDown.length})</div>
            <div className="relative w-10 h-20 md:w-14 md:h-28 cursor-pointer hover:scale-105 transition-transform" onClick={handleDrawFaceDown}>
              {fieldFaceDown.slice(0, 5).map((_, i) => (
                <Tile key={i} tile={_} isFaceDown className="absolute" style={{ top: -i * 2, left: -i * 2 }} />
              ))}
              {phase === 'DRAW' && !players[currentPlayerIndex].isBot && (
                <div className="absolute inset-0 ring-4 ring-yellow-400 rounded animate-pulse" />
              )}
              
              {/* Draw button floating above deck, overlapping bottom edge */}
              {phase === 'DRAW' && currentPlayerIndex === 0 && !players[0].isRiichi && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-20 pointer-events-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDrawFaceDown(); }}
                    className="px-4 py-2 md:px-6 md:py-3 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-full font-black text-xs md:text-sm shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-transform hover:scale-105 flex items-center gap-1 md:gap-2 animate-bounce whitespace-nowrap"
                  >
                    <Play size={14} className="fill-current md:w-4 md:h-4" />
                    {lang === 'zh' ? '点击摸牌' : 'Draw Tile'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Player Hand */}
      <div className="bg-emerald-950 p-2 md:p-4 flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 border-t border-emerald-800 h-auto md:h-64 relative">
        
        {/* Top Bar (Mobile & Desktop) */}
        <div className="absolute top-2 right-2 md:top-4 md:right-4 z-30 flex gap-2">
           <button 
            onClick={handleSort}
            disabled={players[0]?.isRiichi}
            className={`px-3 py-1 md:px-4 md:py-2 rounded font-semibold transition-colors text-xs md:text-sm shadow-md ${players[0]?.isRiichi ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
          >
            {t[lang].sort}
          </button>
        </div>

        {/* Logs (Mobile & Desktop) */}
        <div className="absolute top-2 left-2 md:top-4 md:left-4 z-30">
          <button onClick={() => setIsLogsOpen(!isLogsOpen)} className="flex items-center gap-1 text-[10px] md:text-xs font-bold bg-emerald-800 px-2 py-1 md:px-3 md:py-1.5 rounded text-emerald-300 uppercase tracking-wider transition-colors hover:bg-emerald-700">
            {t[lang].log} {isLogsOpen ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
          </button>
          {isLogsOpen && (
            <div className="absolute bottom-full md:bottom-auto md:top-full left-0 mb-2 md:mb-0 md:mt-2 w-64 bg-emerald-900/95 border border-emerald-700 rounded p-2 shadow-xl max-h-48 overflow-y-auto backdrop-blur-sm">
              <div className="flex flex-col gap-1 text-[10px] md:text-xs">
                {logs.map((log, i) => (
                  <div key={i} className="text-emerald-200/80 border-b border-emerald-800/50 pb-1" style={{ opacity: 1 - i * 0.15 }}>
                    {renderLog(log)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Hand Tiles */}
        <div className="flex-1 flex flex-col items-center justify-end w-full pb-1 md:pb-2 relative">

          {currentWinOption && phase === 'DISCARD' && currentPlayerIndex === 0 && (
            <div className="absolute right-2 md:right-8 top-0 md:top-1/2 md:-translate-y-1/2 flex flex-col items-center gap-1 md:gap-2 animate-bounce z-40">
              <button
                onClick={() => handleWin(0, players[0].hand, currentWinOption)}
                className="px-4 py-2 md:px-6 md:py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(249,115,22,0.5)] transition-transform hover:scale-110 flex items-center gap-1 md:gap-2 text-sm md:text-base"
              >
                <Trophy size={16} className="md:w-5 md:h-5" />
                {lang === 'zh' ? '胡牌' : 'Win'}
              </button>
              <div className="text-orange-300 font-bold text-xs md:text-sm bg-emerald-950/80 px-2 py-0.5 md:px-3 md:py-1 rounded-full border border-orange-500/30 whitespace-nowrap">
                {getHandTypeName(currentWinOption.type, lang)} (+{currentWinOption.score + (players[0].isRiichi ? 1 : 0)})
              </div>
            </div>
          )}
          
          <div className="flex gap-2 md:gap-4 mb-2 md:mb-4 mt-6 md:mt-10">
            {players[0]?.hand.map((tile, idx) => {
              const canRiichi = enabledRules.riichi && phase === 'DISCARD' && currentPlayerIndex === 0 && !players[0].isRiichi && selectedTileIndex === idx && players[0].hand.length === 6 && isTenpai(players[0].hand.filter((_, i) => i !== idx), { ...enabledRules, threeColors: false });
              
              return (
                <div key={tile.id} className="relative">
                  {selectedTileIndex === idx && phase === 'DISCARD' && !players[0].isBot && !players[0].isRiichi && (
                    <div className="absolute -top-10 md:-top-12 left-1/2 -translate-x-1/2 flex gap-2 md:gap-3 z-30">
                      <button
                        onClick={() => handleDiscard()}
                        className="bg-red-600 hover:bg-red-500 text-white text-xs md:text-sm font-bold py-1.5 px-3 md:py-2 md:px-4 rounded shadow-lg whitespace-nowrap"
                      >
                        {t[lang].discard}
                      </button>
                      {canRiichi && (
                        <button
                          onClick={handleRiichi}
                          className="bg-purple-600 hover:bg-purple-500 text-white text-xs md:text-sm font-bold py-1.5 px-3 md:py-2 md:px-4 rounded shadow-lg whitespace-nowrap animate-pulse"
                        >
                          {lang === 'zh' ? '立直' : 'Riichi'}
                        </button>
                      )}
                    </div>
                  )}
                  <Tile 
                    tile={tile} 
                    size="large"
                    isSelected={selectedTileIndex === idx}
                    onMouseEnter={() => soundService.playHover()}
                    onClick={() => {
                      if (players[0].isRiichi) return;
                      if (selectedTileIndex === idx && phase === 'DISCARD' && currentPlayerIndex === 0) {
                        // Double tap / tap again to discard on mobile
                        handleDiscard(idx);
                      } else {
                        setSelectedTileIndex(idx);
                      }
                    }}
                    onDoubleClick={() => {
                      if (players[0].isRiichi) return;
                      if (phase === 'DISCARD' && currentPlayerIndex === 0) {
                        handleDiscard(idx);
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="text-emerald-400 text-[10px] md:text-sm h-4 md:h-6 text-center px-2">
            {players[0]?.isRiichi ? (
              <span className="text-purple-400 font-bold animate-pulse">
                {lang === 'zh' ? '立直状态：自动打出摸到的牌，不可改变手牌。' : 'Riichi: Auto-discarding drawn tiles. Hand is locked.'}
              </span>
            ) : (
              <>
                {phase === 'DRAW' && !players[0].isBot && t[lang].yourTurn}
                {phase === 'DISCARD' && !players[0].isBot && (lang === 'zh' ? '请选择一张牌打出（支持双击出牌）。' : 'Select a tile to discard (double-click to discard).')}
                {players[currentPlayerIndex]?.isBot && `${getPlayerName(currentPlayerIndex)} ${t[lang].botThinking}`}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {isRulesOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm" onClick={() => setIsRulesOpen(false)}>
          <div className="bg-emerald-950 border-2 border-emerald-600 rounded-2xl p-4 md:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsRulesOpen(false)} className="absolute top-3 right-3 md:top-4 md:right-4 text-emerald-400 hover:text-white bg-emerald-900 hover:bg-emerald-700 p-2 rounded-full transition-colors">
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4 md:mb-6 text-center">{t[lang].rulesTitle}</h2>
            <div className="flex flex-col md:flex-row gap-4 md:gap-8 text-xs md:text-sm">
              <div className="flex-1 flex flex-col gap-4">
                {rulesData.filter(r => r.id !== 'sandui' && r.id !== 'sanshoku' && r.id !== 'kuikou' && r.id !== 'musou').map(r => (
                  <div key={r.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-300 font-bold whitespace-nowrap">{r.name[lang]} ({r.pts}):</span>
                      <div className="flex gap-0.5">
                        {r.example.map((ex, i) => (
                          <Tile key={i} tile={{ id: `ex_${i}`, top: ex.t, bottom: ex.b, isStar: ex.s || false }} size="mini" />
                        ))}
                      </div>
                    </div>
                    <div className="text-emerald-100/80 pl-2 leading-relaxed">{r.desc[lang]}</div>
                  </div>
                ))}
                <div className="mt-auto pt-4 border-t border-emerald-800 text-yellow-200 flex items-start gap-1">
                  <StarIcon className="mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-yellow-400">{t[lang].starBonus}</span> 
                    {lang === 'zh' ? (
                      <>完成牌型后，手牌中每有1个<StarIcon/>额外加1分（辉光除外）。</>
                    ) : (
                      <>+1 pt for each <StarIcon/> in a winning hand (except Kuikou).</>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-4">
                {rulesData.filter(r => r.id === 'sandui' || r.id === 'sanshoku' || r.id === 'kuikou' || r.id === 'musou').map(r => {
                  const isDisabled = r.ruleKey && !enabledRules[r.ruleKey as keyof ExtendedRules];
                  return (
                    <div key={r.id} className={`flex flex-col gap-1 ${isDisabled ? 'opacity-30 grayscale' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-300 font-bold whitespace-nowrap">{r.name[lang]} ({r.pts}):</span>
                        <div className="flex gap-0.5">
                          {r.example.map((ex, i) => (
                            <Tile key={i} tile={{ id: `ex_${i}`, top: ex.t, bottom: ex.b, isStar: ex.s || false }} size="mini" />
                          ))}
                        </div>
                        {isDisabled && <span className="text-red-400 text-[10px] border border-red-400/50 rounded px-1 ml-auto">{lang === 'zh' ? '未启用' : 'Disabled'}</span>}
                      </div>
                      <div className="text-emerald-100/80 pl-2 leading-relaxed">{r.desc[lang]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === 'ROUND_END' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-emerald-900 border-2 border-yellow-500 rounded-2xl p-8 max-w-lg w-full flex flex-col items-center text-center shadow-2xl">
            <Trophy size={64} className="text-yellow-400 mb-4" />
            <h2 className="text-3xl font-bold mb-2">{t[lang].roundOver}</h2>
            
            {winnerInfo ? (
              <div className="flex flex-col gap-4 w-full">
                <div className="bg-emerald-800 p-4 rounded-xl flex flex-col items-center gap-3">
                  <div className="text-xl font-bold text-yellow-400">{getPlayerName(winnerInfo.player.id)} {t[lang].wins}!</div>
                  <div className="flex gap-1 md:gap-2 justify-center bg-emerald-900/50 p-2 md:p-3 rounded-lg">
                    {winnerInfo.player.hand.map((tile, i) => (
                      <Tile key={i} tile={tile} size="mini" className="scale-110 md:scale-125 mx-1 md:mx-2" />
                    ))}
                  </div>
                  <div className="text-lg">{getHandTypeName(winnerInfo.win.type, lang)} (+{winnerInfo.win.score} {t[lang].pts})</div>
                </div>
                
                {winnerInfo.tenpaiWinners.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="text-sm text-emerald-300 uppercase tracking-wider">{t[lang].tenpaiWinners}</div>
                    {winnerInfo.tenpaiWinners.map((tw, i) => (
                      <div key={i} className="bg-emerald-800/50 p-2 rounded-lg flex flex-col items-center gap-2 px-4">
                        <div className="flex justify-between w-full">
                          <span>{getPlayerName(tw.player.id)}</span>
                          <span className="text-yellow-400">+{tw.win.score} {t[lang].pts}</span>
                        </div>
                        <div className="flex gap-1 justify-center scale-90">
                          {tw.player.hand.map((tile, j) => (
                            <Tile key={j} tile={tile} size="mini" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xl text-emerald-200">{t[lang].draw}</div>
            )}
            
            <div className="flex gap-4 mt-8">
              <button 
                onClick={startNewGame}
                className="px-6 py-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-full font-bold shadow-lg transition-transform hover:scale-105"
              >
                {lang === 'zh' ? '清零重开' : 'Clear & Restart'}
              </button>
              <button 
                onClick={proceedToNextRound}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-emerald-950 rounded-full font-bold shadow-lg transition-transform hover:scale-105"
              >
                {lang === 'zh' ? '开始下局' : 'Next Round'}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'GAME_OVER' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-emerald-900 border-2 border-yellow-500 rounded-2xl p-8 max-w-lg w-full flex flex-col items-center text-center shadow-2xl">
            <Trophy size={64} className="text-yellow-400 mb-4" />
            <h2 className="text-4xl font-bold mb-6 text-yellow-400">{t[lang].gameOver}</h2>
            
            <div className="flex flex-col gap-2 w-full mb-8">
              {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
                <div key={p.id} className={`flex justify-between items-center p-4 rounded-xl ${i === 0 ? 'bg-yellow-500 text-emerald-900 font-bold text-xl' : 'bg-emerald-800'}`}>
                  <span>{i + 1}. {getPlayerName(p.id)}</span>
                  <span>{p.score} {t[lang].pts}</span>
                </div>
              ))}
            </div>
            
            <button 
              onClick={startNewGame}
              className="px-8 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-full text-xl transition-transform hover:scale-105 flex items-center gap-2"
            >
              <RefreshCw /> {t[lang].playAgain}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
