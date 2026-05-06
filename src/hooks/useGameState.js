import { useReducer, useCallback } from 'react';
import { spawnEnemy, getWeightedSymbol, applyItemEffect, calcInterest } from '../gameData';

const INITIAL_STATE = {
  phase: 'combat', // 'combat' | 'victory' | 'shop' | 'gameOver'
  floor: 1,
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
};

function reducer(state, action) {
  switch (action.type) {
    case 'START_RUN': {
      const enemy = spawnEnemy(1);
      return {
        ...INITIAL_STATE,
        enemy,
      };
    }

    case 'SET_SPINNING':
      return { ...state, spinning: action.value, comboText: '', comboType: null, reelResults: null };

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
        const selfDmg = 15;
        s.playerHp -= selfDmg;
        comboText = '☠️ TRIPLE SKULL!';
        comboType = 'skull-triple';
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
        const selfDmg = counts.skull * 5;
        s.playerHp -= selfDmg;
        comboText = '💀 Cursed!';
        comboType = 'skull';
      } else {
        dmg = 3;
        comboText = 'Weak hit';
        comboType = 'weak';
      }

      if (dmg > 0) {
        s.enemy = { ...s.enemy, hp: Math.max(0, s.enemy.hp - dmg) };
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
      let incomingDmg = s.enemy.atk;
      let blocked = 0;

      if (s.block > 0) {
        blocked = Math.min(incomingDmg, s.block);
        incomingDmg = Math.max(0, incomingDmg - s.block);
        s.block = 0;
      }

      s.playerHp -= incomingDmg;
      s.spinsLeft = s.maxSpins;
      s.lastEnemyDmg = incomingDmg;
      s.lastBlocked = blocked;

      if (s.playerHp <= 0) {
        s.playerHp = 0;
        s.phase = 'gameOver';
      }

      return s;
    }

    case 'ENEMY_DEFEATED': {
      const gold = state.enemy.gold;
      return {
        ...state,
        gold: state.gold + gold,
        phase: 'victory',
        lastGoldEarned: gold,
      };
    }

    case 'GAME_OVER':
      return { ...state, phase: 'gameOver' };

    case 'NEXT_FLOOR': {
      const newFloor = state.floor + 1;
      if (newFloor % 2 === 0) {
        const interest = calcInterest(state.gold);
        return {
          ...state,
          floor: newFloor,
          gold: state.gold + interest,
          lastInterest: interest,
          phase: 'shop',
        };
      }
      const enemy = spawnEnemy(newFloor);
      return {
        ...state,
        floor: newFloor,
        enemy,
        spinsLeft: state.maxSpins,
        block: 0,
        phase: 'combat',
        comboText: '',
        comboType: null,
        reelResults: null,
      };
    }

    case 'OPEN_SHOP': {
      return { ...state, phase: 'shop', shopItems: action.items };
    }

    case 'SET_SHOP_ITEMS':
      return { ...state, shopItems: action.items };

    case 'BUY_ITEM': {
      const { item } = action;
      let s = applyItemEffect(state, item.effectKey);
      s = { ...s, gold: s.gold - item.cost };
      return s;
    }

    case 'SET_LOCKED_ITEMS':
      return { ...state, lockedItems: action.items };

    case 'CLOSE_SHOP': {
      const enemy = spawnEnemy(state.floor);
      return {
        ...state,
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

    default:
      return state;
  }
}

export default function useGameState() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, (init) => {
    return { ...init, enemy: spawnEnemy(1) };
  });

  const startRun = useCallback(() => dispatch({ type: 'START_RUN' }), []);
  const resolveCombo = useCallback((results) => dispatch({ type: 'RESOLVE_COMBO', results }), []);
  const enemyAttack = useCallback(() => dispatch({ type: 'ENEMY_ATTACK' }), []);
  const enemyDefeated = useCallback(() => dispatch({ type: 'ENEMY_DEFEATED' }), []);
  const triggerGameOver = useCallback(() => dispatch({ type: 'GAME_OVER' }), []);
  const nextFloor = useCallback(() => dispatch({ type: 'NEXT_FLOOR' }), []);
  const buyItem = useCallback((item) => dispatch({ type: 'BUY_ITEM', item }), []);
  const setLockedItems = useCallback((items) => dispatch({ type: 'SET_LOCKED_ITEMS', items }), []);
  const closeShop = useCallback(() => dispatch({ type: 'CLOSE_SHOP' }), []);
  const setSpinning = useCallback((value) => dispatch({ type: 'SET_SPINNING', value }), []);
  const setReelResults = useCallback((results) => dispatch({ type: 'SET_REEL_RESULTS', results }), []);

  return {
    state,
    startRun,
    resolveCombo,
    enemyAttack,
    enemyDefeated,
    triggerGameOver,
    nextFloor,
    buyItem,
    setLockedItems,
    closeShop,
    setSpinning,
    setReelResults,
  };
}
