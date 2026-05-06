import { useReducer, useCallback } from 'react';
import { spawnEnemy, spawnBoss, applyItemEffect, calcInterest, rollSymbolPicks, hasRelic, DEFAULT_POOL, BOSSES } from '../gameData';

// Reroll cost: 5g first, +5g each subsequent reroll within the same picker.
// Lucky Charm reduces cost by 1g per stack (min 1g).
export function rerollCost(rerollCount, luckBonus = 0) {
  return Math.max(1, 5 * (rerollCount + 1) - luckBonus);
}

// Rooms: 1=fight, 2=shop, 3=fight, 4=shop, 5=boss
function isShopRoom(room) { return room === 2 || room === 4; }
function isBossRoom(room) { return room === 5; }
function isFightRoom(room) { return room === 1 || room === 3 || room === 5; }

function spawnForRoom(floor, room) {
  if (isBossRoom(room)) return spawnBoss(floor);
  return spawnEnemy(floor, room);
}

function advanceToNextRoom(state) {
  const nextRoom = state.room + 1;
  if (isShopRoom(nextRoom)) {
    const interest = calcInterest(state.gold);
    return {
      ...state,
      room: nextRoom,
      gold: state.gold + interest,
      lastInterest: interest,
      phase: 'shop',
    };
  }
  const enemy = spawnForRoom(state.floor, nextRoom);
  return {
    ...state,
    room: nextRoom,
    enemy,
    spinsLeft: state.maxSpins,
    block: 0,
    phase: 'combat',
    comboText: '',
    comboType: null,
    reelResults: null,
  };
}

const INITIAL_STATE = {
  phase: 'combat',
  floor: 1,
  room: 1,
  playerHp: 50,
  playerMaxHp: 50,
  gold: 0,
  maxSpins: 3,
  spinsLeft: 3,
  swordBonus: 0,
  magicBonus: 0,
  luckBonus: 0,
  block: 0,
  enemy: null,
  spinning: false,
  reelResults: null,
  comboText: '',
  comboType: null,
  log: [],
  lockedItems: [],
  shopItems: null,
  symbolPool: DEFAULT_POOL,
  symbolPicks: null,
  pickRerollCount: 0,
  pickRerollKey: 0,
  relics: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'START_RUN': {
      const enemy = spawnForRoom(1, 1);
      return { ...INITIAL_STATE, enemy };
    }

    case 'SET_SPINNING':
      return { ...state, spinning: action.value, comboText: '', comboType: null, reelResults: null, justEnraged: false };

    case 'SET_REEL_RESULTS':
      return { ...state, reelResults: action.results };

    case 'RESOLVE_COMBO': {
      const { results } = action;
      const ids = results.map(r => r.id);
      const counts = {};
      ids.forEach(id => { counts[id] = (counts[id] || 0) + 1; });

      let s = { ...state, spinsLeft: state.spinsLeft - 1, spinning: false };
      let dmg = 0, heal = 0, block = 0;
      let comboText = '', comboType = 'normal';

      if (counts.skull === 3) {
        if (hasRelic(s, 'cursedCoin')) {
          heal = 20;
          comboText = '☠️ TRIPLE SKULL!';
          comboType = 'triple';
        } else {
          const selfDmg = 15;
          s.playerHp -= selfDmg;
          comboText = '☠️ TRIPLE SKULL!';
          comboType = 'skull-triple';
        }
      } else if (counts.sword === 3) {
        dmg = 18 + s.swordBonus * 3;
        comboText = '⚔️ TRIPLE SLASH!';
        comboType = 'triple';
      } else if (counts.magic === 3) {
        dmg = 22 + s.magicBonus * 3;
        comboText = '✨ ARCANE BURST!';
        comboType = 'triple';
      } else if (counts.shield === 3) {
        block = 99;
        heal = 5;
        comboText = '🛡️ FORTRESS!';
        comboType = 'triple';
      } else if (counts.potion === 3) {
        heal = 20;
        comboText = '🧪 FULL RESTORE!';
        comboType = 'triple';
      } else if (counts.sword === 2) {
        dmg = 8 + s.swordBonus;
        comboText = '⚔️ Double Strike';
        comboType = 'double';
      } else if (counts.magic === 2) {
        dmg = 10 + s.magicBonus;
        comboText = '✨ Spell Cast';
        comboType = 'double';
      } else if (counts.shield === 2) {
        block = 8;
        comboText = '🛡️ Shield Wall';
        comboType = 'double';
      } else if (counts.potion === 2) {
        heal = 10;
        comboText = '🧪 Quick Heal';
        comboType = 'double';
      } else if (counts.skull >= 1) {
        if (hasRelic(s, 'cursedCoin')) {
          heal = counts.skull * 5;
          comboText = '💀 Cursed!';
          comboType = 'double';
        } else {
          const selfDmg = counts.skull * 5;
          s.playerHp -= selfDmg;
          comboText = '💀 Cursed!';
          comboType = 'skull';
        }
      } else {
        dmg = 3;
        comboText = 'Weak hit';
        comboType = 'weak';
      }

      if (dmg > 0 && hasRelic(s, 'glassCannon') && comboType === 'triple') {
        dmg = Math.round(dmg * 2);
      }
      if (dmg > 0 && s.enemy.enraged) {
        dmg = Math.round(dmg * 1.5);
      }
      if (dmg > 0) {
        const wasAboveThreshold = !s.enemy.enraged;
        s.enemy = { ...s.enemy, hp: Math.max(0, s.enemy.hp - dmg) };
        if (s.enemy.enrageAt && wasAboveThreshold &&
            s.enemy.hp > 0 && s.enemy.hp <= s.enemy.maxHp * s.enemy.enrageAt) {
          s.enemy = { ...s.enemy, atk: s.enemy.enrageAtk, enraged: true };
          s.justEnraged = true;
        }
        if (hasRelic(s, 'vampiricCharm')) {
          heal += Math.ceil(dmg * 0.2);
        }
      }
      if (heal > 0) {
        s.playerHp = Math.min(s.playerMaxHp, s.playerHp + heal);
      }
      if (block > 0) {
        s.block = block;
      }

      s.comboText = comboText;
      s.comboType = comboType;
      s.dmg = dmg;
      s.heal = heal;
      s.blockGained = block;

      return s;
    }

    case 'ENEMY_ATTACK': {
      let s = { ...state };
      const nextCount = (s.enemy.attackCount || 0) + 1;
      const isFrenzy = s.enemy.frenzyEvery && nextCount % s.enemy.frenzyEvery === 0;
      const hits = isFrenzy ? s.enemy.frenzyHits : 1;
      const perHit = isFrenzy ? Math.ceil(s.enemy.atk * s.enemy.frenzyMult) : s.enemy.atk;
      let incomingDmg = perHit * hits;
      let blocked = 0;

      if (s.block > 0) {
        blocked = Math.min(incomingDmg, s.block);
        incomingDmg = Math.max(0, incomingDmg - s.block);
        s.block = hasRelic(s, 'ironWill') ? Math.max(0, s.block - blocked) : 0;
      }

      s.playerHp -= incomingDmg;
      s.spinsLeft = s.maxSpins;
      s.comboText = '';
      s.comboType = null;
      s.lastEnemyDmg = incomingDmg;
      s.lastBlocked = blocked;
      s.lastFrenzy = isFrenzy;
      if (s.enemy.frenzyEvery) {
        s.enemy = { ...s.enemy, attackCount: nextCount };
      }

      if (s.playerHp <= 0) {
        s.playerHp = 0;
        s.phase = 'gameOver';
      }

      return s;
    }

    case 'ENEMY_DEFEATED': {
      let gold = state.enemy.gold;
      if (hasRelic(state, 'magnet')) gold = Math.round(gold * 1.5);
      const isBoss = state.enemy.isBoss;
      const isFinalBoss = isBoss && state.floor >= BOSSES.length;
      return {
        ...state,
        gold: state.gold + gold,
        phase: isBoss ? (isFinalBoss ? 'runComplete' : 'floorComplete') : 'victory',
        lastGoldEarned: gold,
        symbolPicks: isBoss ? null : rollSymbolPicks(3),
        pickRerollCount: 0,
        pickRerollKey: 0,
      };
    }

    case 'PICK_SYMBOL': {
      const newPool = [...state.symbolPool, action.symbolId];
      return advanceToNextRoom({ ...state, symbolPool: newPool, symbolPicks: null });
    }

    case 'SKIP_SYMBOL': {
      return advanceToNextRoom({ ...state, symbolPicks: null });
    }

    case 'REROLL_PICKS': {
      const cost = rerollCost(state.pickRerollCount, state.luckBonus);
      if (state.gold < cost) return state;
      return {
        ...state,
        gold: state.gold - cost,
        symbolPicks: rollSymbolPicks(3),
        pickRerollCount: state.pickRerollCount + 1,
        pickRerollKey: state.pickRerollKey + 1,
      };
    }

    case 'NEXT_FLOOR': {
      const nextFloor = state.floor + 1;
      return {
        ...state,
        floor: nextFloor,
        room: 1,
        enemy: spawnForRoom(nextFloor, 1),
        spinsLeft: state.maxSpins,
        block: 0,
        phase: 'combat',
        comboText: '',
        comboType: null,
        reelResults: null,
      };
    }

    case 'GAME_OVER':
      return { ...state, phase: 'gameOver' };

    case 'NEXT_ROOM':
      return advanceToNextRoom(state);

    case 'BUY_ITEM': {
      const { item } = action;
      let s = { ...state, gold: state.gold - item.cost };
      if (item.type === 'relic') {
        s.relics = [...state.relics, item.id];
      } else {
        s = applyItemEffect(s, item.id);
      }
      return s;
    }

    case 'SET_LOCKED_ITEMS':
      return { ...state, lockedItems: action.items };

    case 'CLOSE_SHOP': {
      const nextRoom = state.room + 1;
      const enemy = spawnForRoom(state.floor, nextRoom);
      return {
        ...state,
        room: nextRoom,
        enemy,
        spinsLeft: state.maxSpins,
        block: 0,
        phase: 'combat',
        comboText: '',
        comboType: null,
        reelResults: null,
        shopItems: null,
      };
    }

    case 'DEBUG_KILL_ENEMY': {
      if (!state.enemy || state.phase !== 'combat') return state;
      let gold = state.enemy.gold;
      if (hasRelic(state, 'magnet')) gold = Math.round(gold * 1.5);
      const isBoss = state.enemy.isBoss;
      const isFinalBoss = isBoss && state.floor >= BOSSES.length;
      return {
        ...state,
        enemy: { ...state.enemy, hp: 0 },
        gold: state.gold + gold,
        phase: isBoss ? (isFinalBoss ? 'runComplete' : 'floorComplete') : 'victory',
        lastGoldEarned: gold,
        symbolPicks: isBoss ? null : rollSymbolPicks(3),
        pickRerollCount: 0,
        pickRerollKey: 0,
      };
    }

    default:
      return state;
  }
}

export default function useGameState() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, (init) => {
    return { ...init, enemy: spawnForRoom(1, 1) };
  });

  const startRun = useCallback(() => dispatch({ type: 'START_RUN' }), []);
  const resolveCombo = useCallback((results) => dispatch({ type: 'RESOLVE_COMBO', results }), []);
  const enemyAttack = useCallback(() => dispatch({ type: 'ENEMY_ATTACK' }), []);
  const enemyDefeated = useCallback(() => dispatch({ type: 'ENEMY_DEFEATED' }), []);
  const triggerGameOver = useCallback(() => dispatch({ type: 'GAME_OVER' }), []);
  const nextRoom = useCallback(() => dispatch({ type: 'NEXT_ROOM' }), []);
  const buyItem = useCallback((item) => dispatch({ type: 'BUY_ITEM', item }), []);
  const setLockedItems = useCallback((items) => dispatch({ type: 'SET_LOCKED_ITEMS', items }), []);
  const closeShop = useCallback(() => dispatch({ type: 'CLOSE_SHOP' }), []);
  const nextFloor = useCallback(() => dispatch({ type: 'NEXT_FLOOR' }), []);
  const setSpinning = useCallback((value) => dispatch({ type: 'SET_SPINNING', value }), []);
  const setReelResults = useCallback((results) => dispatch({ type: 'SET_REEL_RESULTS', results }), []);
  const debugKillEnemy = useCallback(() => dispatch({ type: 'DEBUG_KILL_ENEMY' }), []);
  const pickSymbol = useCallback((symbolId) => dispatch({ type: 'PICK_SYMBOL', symbolId }), []);
  const skipSymbol = useCallback(() => dispatch({ type: 'SKIP_SYMBOL' }), []);
  const rerollPicks = useCallback(() => dispatch({ type: 'REROLL_PICKS' }), []);

  return {
    state,
    startRun,
    resolveCombo,
    enemyAttack,
    enemyDefeated,
    triggerGameOver,
    nextRoom,
    buyItem,
    setLockedItems,
    closeShop,
    nextFloor,
    setSpinning,
    setReelResults,
    debugKillEnemy,
    pickSymbol,
    skipSymbol,
    rerollPicks,
  };
}
