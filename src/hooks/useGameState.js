import { useReducer, useCallback } from 'react';
import { spawnEnemy, spawnBoss, applyItemEffect, calcInterest, rollSymbolPicks, rollSacrificeReward, hasRelic, DEFAULT_POOL, BOSSES, getPaylines } from '../gameData';
import { getCharacter, hasPassive, loadUnlockedChars, saveUnlockedChars } from '../characters';

// Reroll cost: 5g first, +5g each subsequent reroll within the same picker.
// Lucky Charm reduces cost by 1g per stack (min 1g).
export function rerollCost(rerollCount, luckBonus = 0) {
  return Math.max(1, 5 * (rerollCount + 1) - luckBonus);
}

// Shop reroll: 8g first, +8g each subsequent reroll within the same shop visit.
export function shopRerollCost(rerollCount, luckBonus = 0) {
  return Math.max(2, 8 * (rerollCount + 1) - luckBonus);
}

// 6 rooms per floor: fight, fight, shop/sac, fight, shop/sac, boss.
// Two warm-up fights before the first shop so the player has gold to spend.
function generateFloorRoomTypes() {
  return [
    'fight',
    'fight',
    Math.random() < 0.5 ? 'shop' : 'sacrifice',
    'fight',
    Math.random() < 0.5 ? 'shop' : 'sacrifice',
    'boss',
  ];
}

function roomType(state, room) {
  return (state.floorRoomTypes && state.floorRoomTypes[room - 1]) || 'fight';
}

function spawnForRoom(floor, room) {
  if (room === 6) return spawnBoss(floor);
  return spawnEnemy(floor, room);
}

// Apply per-fight relic effects when entering combat (block, heal, locks).
function applyFightStartRelics(state) {
  let block = 0;
  let playerHp = state.playerHp;
  if (hasRelic(state, 'sturdyBoots')) block = 5;
  if (hasRelic(state, 'tonicVial')) {
    playerHp = Math.min(state.playerMaxHp, playerHp + 5);
  }
  return { block, playerHp };
}

// Evaluate one payline (3 symbol IDs). Applies per-line relics + multiplier.
// Returns { comboType, comboText, comboSymbol, dmg, heal, block, selfDmg, multFactor, coinGold }.
function evaluateLine(ids, s) {
  const counts = {};
  ids.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
  const wilds = counts.wild || 0;
  const mults = counts.mult || 0;
  const coins = counts.coin || 0;
  const skulls = counts.skull || 0;
  const priority = ['magic', 'sword', 'potion', 'shield'];

  let combo = null;
  const singlesPresent = priority.filter(t => (counts[t] || 0) >= 1);
  if (skulls === 3) {
    combo = { type: 'skull-triple' };
  } else if (wilds === 3) {
    combo = { type: 'triple', symbol: 'magic' };
  } else {
    for (const t of priority) {
      if ((counts[t] || 0) >= 1 && (counts[t] || 0) + wilds >= 3) {
        combo = { type: 'triple', symbol: t };
        break;
      }
    }
    if (!combo && wilds >= 1 && singlesPresent.length >= 2) {
      combo = { type: 'rainbow', symbols: singlesPresent.slice(0, 2 + (wilds - 1)) };
    }
    if (!combo) {
      for (const t of priority) {
        if ((counts[t] || 0) >= 1 && (counts[t] || 0) + wilds >= 2) {
          combo = { type: 'double', symbol: t };
          break;
        }
      }
    }
    if (!combo && wilds === 2) combo = { type: 'double', symbol: 'magic' };
    if (!combo && skulls >= 1) combo = { type: 'skull', skullCount: skulls };
    if (!combo) combo = { type: 'nothing' };
  }

  let dmg = 0, heal = 0, block = 0, selfDmg = 0;
  let comboText = '', comboType = combo.type, comboSymbol = combo.symbol || null;

  if (combo.type === 'skull-triple') {
    if (hasRelic(s, 'cursedCoin')) {
      heal = 20; comboText = '☠️ TRIPLE SKULL!'; comboType = 'triple';
    } else {
      selfDmg = 15; comboText = '☠️ TRIPLE SKULL!'; comboType = 'skull-triple';
    }
  } else if (combo.type === 'triple') {
    const t = combo.symbol;
    if (t === 'sword')  { dmg = 18 + (s.swordBonus || 0) * 3; comboText = '⚔️ TRIPLE SLASH!'; }
    else if (t === 'magic')  { dmg = 22 + (s.magicBonus || 0) * 3; comboText = '✨ ARCANE BURST!'; }
    else if (t === 'shield') { block = 99; heal = 5; comboText = '🛡️ FORTRESS!'; }
    else if (t === 'potion') { heal = 20; comboText = '🧪 FULL RESTORE!'; }
    comboType = 'triple';
  } else if (combo.type === 'double') {
    const t = combo.symbol;
    if (t === 'sword')  { dmg = 8 + (s.swordBonus || 0); comboText = '⚔️ Double Strike'; }
    else if (t === 'magic')  { dmg = 10 + (s.magicBonus || 0); comboText = '✨ Spell Cast'; }
    else if (t === 'shield') { block = 8; comboText = '🛡️ Shield Wall'; }
    else if (t === 'potion') { heal = 10; comboText = '🧪 Quick Heal'; }
    comboType = 'double';
  } else if (combo.type === 'rainbow') {
    for (const t of combo.symbols) {
      if (t === 'sword')  dmg += 8 + (s.swordBonus || 0);
      else if (t === 'magic')  dmg += 10 + (s.magicBonus || 0);
      else if (t === 'shield') block += 8;
      else if (t === 'potion') heal += 10;
    }
    comboText = '⭐ Rainbow Combo';
    comboType = 'triple';
  } else if (combo.type === 'skull') {
    if (hasRelic(s, 'cursedCoin')) {
      heal = combo.skullCount * 5; comboText = '💀 Cursed!'; comboType = 'double';
    } else {
      selfDmg = combo.skullCount * 5; comboText = '💀 Cursed!'; comboType = 'skull';
    }
  } else {
    // 'nothing' — line had no combo at all
    comboText = '';
    comboType = 'none';
  }

  // Per-line relics
  if (dmg > 0 && hasRelic(s, 'glassCannon') && comboType === 'triple') dmg = Math.round(dmg * 2);
  if (dmg > 0 && hasRelic(s, 'twinFang') && comboSymbol === 'sword') dmg = Math.round(dmg * 1.5);
  if (dmg > 0 && hasRelic(s, 'arcaneFocus') && comboSymbol === 'magic') dmg = Math.round(dmg * 1.75);
  if (dmg > 0 && hasRelic(s, 'spellEcho') && comboSymbol === 'magic') dmg = Math.round(dmg * 1.5);
  if (heal > 0 && hasRelic(s, 'greenThumb') && comboSymbol === 'potion') heal = Math.round(heal * 1.5);

  // Multiplier within the line
  const multFactor = mults > 0 ? Math.pow(2, mults) : 1;
  if (mults > 0) {
    dmg = dmg * multFactor;
    heal = heal * multFactor;
    block = block * multFactor;
  }

  // Coins (per-line)
  const coinGold = coins * 2;

  return { comboType, comboText, comboSymbol, dmg, heal, block, selfDmg, multFactor, coinGold };
}

// Phoenix Feather: revive at 25% HP if you would die. Once per fight.
function tryRevive(s) {
  if (s.playerHp <= 0 && hasRelic(s, 'phoenixFeather') && !s.phoenixUsed) {
    s.playerHp = Math.max(1, Math.ceil(s.playerMaxHp * 0.25));
    s.phoenixUsed = true;
    s.justRevived = true;
  }
  return s;
}

function advanceToNextRoom(state) {
  const nextRoom = state.room + 1;
  const type = roomType(state, nextRoom);
  if (type === 'shop') {
    const cap = hasRelic(state, 'pennyPincher') ? 10 : 5;
    const interest = calcInterest(state.gold, cap);
    return {
      ...state,
      room: nextRoom,
      gold: state.gold + interest,
      lastInterest: interest,
      phase: 'shop',
      shopRerollCount: 0,
      shopRerollKey: (state.shopRerollKey || 0),
    };
  }
  if (type === 'sacrifice') {
    return {
      ...state,
      room: nextRoom,
      phase: 'sacrifice',
      sacrificeChosen: null,
      sacrificeReward: null,
    };
  }
  const enemy = spawnForRoom(state.floor, nextRoom);
  const fightStart = applyFightStartRelics(state);
  return {
    ...state,
    room: nextRoom,
    enemy,
    spinsLeft: state.maxSpins,
    block: fightStart.block,
    playerHp: fightStart.playerHp,
    phase: 'combat',
    comboText: '',
    comboType: null,
    reelResults: null,
    locksLeft: state.maxLocks,
    poisonStacks: [],
    phoenixUsed: false,
    lineResults: null,
  };
}

const INITIAL_STATE = {
  phase: 'menu',
  character: null,
  unlockedChars: [],
  justUnlocked: null,
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
  locksLeft: 3,
  maxLocks: 3,
  floorRoomTypes: generateFloorRoomTypes(),
  sacrificeChosen: null,
  sacrificeReward: null,
  poisonStacks: [],
  shopRerollCount: 0,
  shopRerollKey: 0,
  gridRows: 1,
  justUnlockedRows: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'START_RUN': {
      const charId = action.characterId || 'knight';
      const char = getCharacter(charId);
      const enemy = spawnForRoom(1, 1);
      return {
        ...INITIAL_STATE,
        phase: 'combat',
        character: charId,
        symbolPool: char?.pool || DEFAULT_POOL,
        unlockedChars: state.unlockedChars,
        enemy,
        floorRoomTypes: generateFloorRoomTypes(),
      };
    }

    case 'GO_TO_MENU':
      return { ...INITIAL_STATE, unlockedChars: state.unlockedChars };

    case 'UNLOCK_CHARACTER': {
      if (state.unlockedChars.includes(action.id)) return state;
      const next = [...state.unlockedChars, action.id];
      saveUnlockedChars(next);
      return { ...state, unlockedChars: next, justUnlocked: action.id };
    }

    case 'CLEAR_JUST_UNLOCKED':
      return { ...state, justUnlocked: null };

    case 'SET_SPINNING':
      return { ...state, spinning: action.value, comboText: '', comboType: null, reelResults: null, justEnraged: false };

    case 'SET_REEL_RESULTS':
      return { ...state, reelResults: action.results };

    case 'RESOLVE_COMBO': {
      const { grid } = action;
      // Evaluate each payline using the existing single-line logic.
      // grid is a 2D array of symbol objects: grid[row][reel] = { id, icon }.
      let s = { ...state, spinsLeft: state.spinsLeft - 1, spinning: false };

      const lineResults = [];
      let totalDmg = 0, totalHeal = 0, totalBlock = 0;
      let totalSelfDmg = 0;
      let totalCoinGold = 0;
      let anyTriple = false;
      let primaryComboText = '';
      let primaryComboType = 'weak';
      let multFactorMax = 1;

      // Per-spin modifiers, all applied per-line so damage drops in chunks during animation
      const fightSpinNumber = (s.maxSpins - s.spinsLeft);
      const packHunterReady = hasPassive(s, 'packHunter') && fightSpinNumber > 0 && fightSpinNumber % 3 === 0;
      const periodRageActive = hasPassive(s, 'periodRage') && s.playerHp / s.playerMaxHp < 0.3;
      const enraged = s.enemy?.enraged;

      for (const line of getPaylines(s.gridRows)) {
        const lineIds = line.cells.map(([r, c]) => grid[r][c].id);
        const lineRes = evaluateLine(lineIds, s);

        // Apply per-spin damage modifiers per-line so each chunk shows the boost
        if (lineRes.dmg > 0) {
          if (enraged) lineRes.dmg = Math.round(lineRes.dmg * 1.5);
          if (periodRageActive) lineRes.dmg = Math.round(lineRes.dmg * 1.5);
          if (packHunterReady) lineRes.dmg = lineRes.dmg * 2;
          // Vampiric Charm: heal 20% of dmg dealt
          if (hasRelic(s, 'vampiricCharm')) {
            lineRes.heal = (lineRes.heal || 0) + Math.ceil(lineRes.dmg * 0.2);
          }
        }
        // Healer's Hand: heal grants block
        if (lineRes.heal > 0 && hasRelic(s, 'healersHand')) {
          lineRes.block = (lineRes.block || 0) + Math.ceil(lineRes.heal * 0.5);
        }

        if (lineRes.dmg > 0 || lineRes.heal > 0 || lineRes.block > 0 || lineRes.selfDmg > 0) {
          lineResults.push({ paylineId: line.id, cells: line.cells, ...lineRes });
        }
        totalDmg += lineRes.dmg;
        totalHeal += lineRes.heal;
        totalBlock += lineRes.block;
        totalSelfDmg += lineRes.selfDmg || 0;
        totalCoinGold += lineRes.coinGold || 0;
        if (lineRes.multFactor > multFactorMax) multFactorMax = lineRes.multFactor;
        if (lineRes.comboType === 'triple') {
          anyTriple = true;
          if (lineRes.dmg > 0) { primaryComboText = lineRes.comboText; primaryComboType = 'triple'; }
        }
        if (!primaryComboText && (lineRes.dmg > 0 || lineRes.heal > 0 || lineRes.block > 0)) {
          primaryComboText = lineRes.comboText;
          primaryComboType = lineRes.comboType;
        }
      }
      if (!primaryComboText) {
        primaryComboText = 'Weak hit';
        primaryComboType = 'weak';
        // Synthesize a small weak-hit line so the spin still does something
        // and the animation/damage flow has at least one line to play.
        const weakLine = {
          paylineId: 'weak', cells: [],
          comboType: 'weak', comboText: 'Weak hit', comboSymbol: null,
          dmg: 3, heal: 0, block: 0, selfDmg: 0, multFactor: 1, coinGold: 0,
        };
        lineResults.push(weakLine);
        totalDmg += 3;
      }

      s.gold = (s.gold || 0) + totalCoinGold;
      s.coinGold = totalCoinGold;
      s.multFactor = multFactorMax;
      s.multCount = multFactorMax > 1 ? Math.round(Math.log2(multFactorMax)) : 0;
      s.lineResults = lineResults;
      s.comboText = primaryComboText;
      s.comboType = primaryComboType;
      s.packHunterTriggered = packHunterReady;
      s.dmg = totalDmg;
      s.heal = totalHeal;
      s.blockGained = totalBlock;

      // Toxic Aura (Furzkopf): instant — applies regardless of any combo
      if (hasPassive(s, 'toxicAura') && s.enemy && s.enemy.hp > 0) {
        s.enemy = { ...s.enemy, hp: Math.max(0, s.enemy.hp - 2) };
        s.toxicAuraDmg = 2;
      } else {
        s.toxicAuraDmg = 0;
      }

      // Poison tick — environmental damage applied immediately
      let poisonDmg = 0;
      if (s.poisonStacks.length > 0) {
        const newStacks = [];
        for (const p of s.poisonStacks) {
          poisonDmg += p.dmg;
          if (p.ticksLeft - 1 > 0) newStacks.push({ ...p, ticksLeft: p.ticksLeft - 1 });
        }
        s.poisonStacks = newStacks;
        if (poisonDmg > 0) s.playerHp = Math.max(0, s.playerHp - poisonDmg);
      }
      s.poisonDmg = poisonDmg;

      if (s.playerHp <= 0) {
        tryRevive(s);
        if (s.playerHp <= 0) { s.playerHp = 0; s.phase = 'gameOver'; }
      }

      return s;
    }

    case 'APPLY_LINE_EFFECTS': {
      const line = state.lineResults?.[action.index];
      if (!line) return state;
      let s = { ...state };
      if (line.dmg > 0 && s.enemy) {
        const wasAboveThreshold = !s.enemy.enraged;
        s.enemy = { ...s.enemy, hp: Math.max(0, s.enemy.hp - line.dmg) };
        if (s.enemy.enrageAt && wasAboveThreshold &&
            s.enemy.hp > 0 && s.enemy.hp <= s.enemy.maxHp * s.enemy.enrageAt) {
          s.enemy = { ...s.enemy, atk: s.enemy.enrageAtk, enraged: true };
          s.justEnraged = true;
        }
      }
      if (line.heal > 0) {
        s.playerHp = Math.min(s.playerMaxHp, s.playerHp + line.heal);
      }
      if (line.block > 0) {
        s.block = (s.block || 0) + line.block;
      }
      if (line.selfDmg > 0) {
        s.playerHp -= line.selfDmg;
        if (s.playerHp <= 0) {
          tryRevive(s);
          if (s.playerHp <= 0) { s.playerHp = 0; s.phase = 'gameOver'; }
        }
      }
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

      // Period Rage: also +50% incoming when below 30% HP
      if (hasPassive(s, 'periodRage') && s.playerHp / s.playerMaxHp < 0.3) {
        incomingDmg = Math.round(incomingDmg * 1.5);
      }

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
      if (s.enemy.poisonOnHit) {
        s.poisonStacks = [
          ...s.poisonStacks,
          { dmg: s.enemy.poisonOnHit.dmg, ticksLeft: s.enemy.poisonOnHit.ticks },
        ];
      }

      // Spike Shield: retaliate when actually struck
      if (incomingDmg > 0 && hasRelic(s, 'spikeShield')) {
        const spikeDmg = 3;
        s.enemy = { ...s.enemy, hp: Math.max(0, s.enemy.hp - spikeDmg) };
        s.spikeDmg = spikeDmg;
      } else {
        s.spikeDmg = 0;
      }

      if (s.playerHp <= 0) {
        tryRevive(s);
        if (s.playerHp <= 0) {
          s.playerHp = 0;
          s.phase = 'gameOver';
        }
      }

      return s;
    }

    case 'ENEMY_DEFEATED': {
      let gold = state.enemy.gold;
      if (hasRelic(state, 'magnet')) gold = Math.round(gold * 1.5);
      const isBoss = state.enemy.isBoss;
      const isFinalBoss = isBoss && state.floor >= BOSSES.length;
      // Unlock the matching character if we just beat a boss
      let unlockedChars = state.unlockedChars;
      let justUnlocked = null;
      if (isBoss) {
        const sprite = state.enemy.sprite;
        if (sprite && !unlockedChars.includes(sprite)) {
          unlockedChars = [...unlockedChars, sprite];
          justUnlocked = sprite;
          saveUnlockedChars(unlockedChars);
        }
      }
      // Beat Ruby (floor 2 boss) → unlock the 3-row slot grid for the rest of the run
      let gridRows = state.gridRows;
      let justUnlockedRows = false;
      if (isBoss && state.enemy.sprite === 'ruby' && gridRows < 3) {
        gridRows = 3;
        justUnlockedRows = true;
      }
      return {
        ...state,
        gold: state.gold + gold,
        phase: isBoss ? (isFinalBoss ? 'runComplete' : 'floorComplete') : 'victory',
        lastGoldEarned: gold,
        symbolPicks: isBoss ? null : rollSymbolPicks(3),
        pickRerollCount: 0,
        pickRerollKey: 0,
        unlockedChars,
        justUnlocked,
        gridRows,
        justUnlockedRows,
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
      const fightStart = applyFightStartRelics(state);
      // Safety: ensure 3-row grid is unlocked from floor 3 onwards
      const gridRows = nextFloor >= 3 ? Math.max(3, state.gridRows) : state.gridRows;
      return {
        ...state,
        floor: nextFloor,
        room: 1,
        enemy: spawnForRoom(nextFloor, 1),
        spinsLeft: state.maxSpins,
        block: fightStart.block,
        playerHp: fightStart.playerHp,
        phase: 'combat',
        comboText: '',
        comboType: null,
        reelResults: null,
        locksLeft: state.maxLocks,
        floorRoomTypes: generateFloorRoomTypes(),
        poisonStacks: [],
        phoenixUsed: false,
        lineResults: null,
        gridRows,
      };
    }

    case 'USE_LOCK_TOKENS': {
      return { ...state, locksLeft: Math.max(0, state.locksLeft - action.count) };
    }

    case 'SACRIFICE_SYMBOL': {
      // Remove first occurrence of chosen symbol, add a freshly rolled reward
      const idx = state.symbolPool.indexOf(action.symbolId);
      if (idx === -1) return state;
      const newPool = [...state.symbolPool];
      newPool.splice(idx, 1);
      const reward = rollSacrificeReward();
      newPool.push(reward);
      return {
        ...state,
        symbolPool: newPool,
        sacrificeChosen: action.symbolId,
        sacrificeReward: reward,
      };
    }

    case 'SKIP_SACRIFICE':
    case 'FINISH_SACRIFICE':
      return advanceToNextRoom({ ...state, sacrificeChosen: null, sacrificeReward: null });

    case 'GAME_OVER':
      return { ...state, phase: 'gameOver' };

    case 'NEXT_ROOM':
      return advanceToNextRoom(state);

    case 'BUY_ITEM': {
      const { item } = action;
      const discount = hasRelic(state, 'bargainHunter') ? 0.8 : 1;
      const cost = Math.ceil(item.cost * discount);
      let s = { ...state, gold: state.gold - cost };
      if (item.type === 'relic') {
        s.relics = [...state.relics, item.id];
        // Quick Hands: permanent +1 lock token
        if (item.id === 'quickHands') {
          s.maxLocks = state.maxLocks + 1;
          s.locksLeft = state.locksLeft + 1;
        }
      } else {
        s = applyItemEffect(s, item.id);
      }
      return s;
    }

    case 'SET_LOCKED_ITEMS':
      return { ...state, lockedItems: action.items };

    case 'REROLL_SHOP': {
      const cost = shopRerollCost(state.shopRerollCount || 0, state.luckBonus);
      if (state.gold < cost) return state;
      return {
        ...state,
        gold: state.gold - cost,
        shopRerollCount: (state.shopRerollCount || 0) + 1,
        shopRerollKey: (state.shopRerollKey || 0) + 1,
      };
    }

    case 'CLOSE_SHOP': {
      const nextRoom = state.room + 1;
      const enemy = spawnForRoom(state.floor, nextRoom);
      const fightStart = applyFightStartRelics(state);
      return {
        ...state,
        room: nextRoom,
        enemy,
        spinsLeft: state.maxSpins,
        block: fightStart.block,
        playerHp: fightStart.playerHp,
        phase: 'combat',
        comboText: '',
        comboType: null,
        reelResults: null,
        shopItems: null,
        locksLeft: state.maxLocks,
        phoenixUsed: false,
      };
    }

    case 'DEBUG_KILL_ENEMY': {
      if (!state.enemy || state.phase !== 'combat') return state;
      let gold = state.enemy.gold;
      if (hasRelic(state, 'magnet')) gold = Math.round(gold * 1.5);
      const isBoss = state.enemy.isBoss;
      const isFinalBoss = isBoss && state.floor >= BOSSES.length;
      let gridRows = state.gridRows;
      let justUnlockedRows = false;
      if (isBoss && state.enemy.sprite === 'ruby' && gridRows < 3) {
        gridRows = 3;
        justUnlockedRows = true;
      }
      return {
        ...state,
        enemy: { ...state.enemy, hp: 0 },
        gold: state.gold + gold,
        phase: isBoss ? (isFinalBoss ? 'runComplete' : 'floorComplete') : 'victory',
        lastGoldEarned: gold,
        symbolPicks: isBoss ? null : rollSymbolPicks(3),
        pickRerollCount: 0,
        pickRerollKey: 0,
        gridRows,
        justUnlockedRows,
      };
    }

    default:
      return state;
  }
}

export default function useGameState() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, (init) => {
    return { ...init, unlockedChars: loadUnlockedChars() };
  });

  const startRun = useCallback((characterId) => dispatch({ type: 'START_RUN', characterId }), []);
  const goToMenu = useCallback(() => dispatch({ type: 'GO_TO_MENU' }), []);
  const clearJustUnlocked = useCallback(() => dispatch({ type: 'CLEAR_JUST_UNLOCKED' }), []);
  const resolveCombo = useCallback((grid) => dispatch({ type: 'RESOLVE_COMBO', grid }), []);
  const applyLineEffects = useCallback((index) => dispatch({ type: 'APPLY_LINE_EFFECTS', index }), []);
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
  const useLockTokens = useCallback((count) => dispatch({ type: 'USE_LOCK_TOKENS', count }), []);
  const rerollShop = useCallback(() => dispatch({ type: 'REROLL_SHOP' }), []);
  const sacrificeSymbol = useCallback((symbolId) => dispatch({ type: 'SACRIFICE_SYMBOL', symbolId }), []);
  const skipSacrifice = useCallback(() => dispatch({ type: 'SKIP_SACRIFICE' }), []);
  const finishSacrifice = useCallback(() => dispatch({ type: 'FINISH_SACRIFICE' }), []);
  const pickSymbol = useCallback((symbolId) => dispatch({ type: 'PICK_SYMBOL', symbolId }), []);
  const skipSymbol = useCallback(() => dispatch({ type: 'SKIP_SYMBOL' }), []);
  const rerollPicks = useCallback(() => dispatch({ type: 'REROLL_PICKS' }), []);

  return {
    state,
    startRun,
    resolveCombo,
    applyLineEffects,
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
    useLockTokens,
    rerollShop,
    sacrificeSymbol,
    skipSacrifice,
    finishSacrifice,
    pickSymbol,
    skipSymbol,
    rerollPicks,
    goToMenu,
    clearJustUnlocked,
  };
}
