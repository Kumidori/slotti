import { useReducer, useCallback } from 'react';
import { spawnEnemy, spawnBoss, spawnElite, applyItemEffect, calcInterest, rollSymbolPicks, rollSacrificeReward, rollPathChoice, hasRelic, relicCount, DEFAULT_POOL, BOSSES, getPaylines, SHOP_ITEMS, RARITIES, pickByRarity } from '../gameData';
import { getCharacter, hasPassive, loadUnlockedChars, saveUnlockedChars, getAbility } from '../characters';

// Reroll cost: 5g first, +5g each subsequent reroll within the same picker.
// Lucky Charm reduces cost by 1g per stack (min 1g).
export function rerollCost(rerollCount, luckBonus = 0) {
  return Math.max(1, 5 * (rerollCount + 1) - luckBonus);
}

// Shop reroll: 8g first, +8g each subsequent reroll within the same shop visit.
export function shopRerollCost(rerollCount, luckBonus = 0) {
  return Math.max(2, 8 * (rerollCount + 1) - luckBonus);
}

// Each floor has ROOMS_PER_FLOOR non-boss rooms then the boss as the final room.
const ROOMS_PER_FLOOR = 5;

function spawnForRoom(floor, room) {
  if (room > ROOMS_PER_FLOOR) return spawnBoss(floor);
  return spawnEnemy(floor, room);
}

// Build a real branching graph for the floor.
// 5 levels × 3 slots (with some empty), each node has 1-2 edges to adjacent
// slots on the next level — so where you go next depends on where you are now.
function generateFloorGraph(floor) {
  const SLOTS = 3;
  const levels = [];
  for (let i = 0; i < ROOMS_PER_FLOOR; i++) {
    const row = [];
    for (let j = 0; j < SLOTS; j++) {
      const type = pickRoomType(floor);
      row.push({ slot: j, type, edges: [] });
    }
    levels.push(row);
  }
  // Generate edges: each node connects to 1-2 nodes on the next level
  // within ±1 slot. Boss at the end (level ROOMS_PER_FLOOR has 1 boss node;
  // every level-4 node connects to it).
  for (let i = 0; i < ROOMS_PER_FLOOR - 1; i++) {
    for (const node of levels[i]) {
      const candidates = levels[i + 1].filter(n => Math.abs(n.slot - node.slot) <= 1);
      // Pick 1-2 random candidates
      const shuffled = [...candidates].sort(() => Math.random() - 0.5);
      const count = Math.random() < 0.5 ? 1 : 2;
      node.edges = shuffled.slice(0, Math.max(1, Math.min(count, shuffled.length))).map(n => n.slot);
    }
  }
  // Final level → boss (single node, slot 1 / center). Mark all final-level edges to boss.
  for (const node of levels[ROOMS_PER_FLOOR - 1]) {
    node.edges = [1]; // boss is "slot 1" symbolically
  }
  // Ensure every node has at least one incoming edge from previous level
  // (so no orphan nodes). For each level i > 0, check each node, if no
  // predecessor reaches it, add an edge from the nearest predecessor.
  for (let i = 1; i < ROOMS_PER_FLOOR; i++) {
    for (const node of levels[i]) {
      const hasIncoming = levels[i - 1].some(p => p.edges.includes(node.slot));
      if (!hasIncoming) {
        // Find nearest predecessor in slot
        const pred = [...levels[i - 1]].sort((a, b) => Math.abs(a.slot - node.slot) - Math.abs(b.slot - node.slot))[0];
        if (pred && !pred.edges.includes(node.slot)) pred.edges.push(node.slot);
      }
    }
  }
  return levels;
}

function pickRoomType(floor) {
  const pool = ['fight', 'fight', 'fight', 'shop', 'shop', 'sacrifice', 'rest'];
  if (floor >= 2) pool.push('elite');
  return pool[Math.floor(Math.random() * pool.length)];
}

// Apply per-fight relic effects when entering combat (block, heal, locks).
// Also restores a small flat amount of HP between rooms ("rest heal").
function applyFightStartRelics(state) {
  const sturdyStacks = relicCount(state, 'sturdyBoots');
  let block = 5 * sturdyStacks;
  let playerHp = state.playerHp;

  // Base inter-room heal: 8% of max HP, minimum 4
  if (playerHp > 0 && playerHp < state.playerMaxHp) {
    const restHeal = Math.max(4, Math.round(state.playerMaxHp * 0.08));
    playerHp = Math.min(state.playerMaxHp, playerHp + restHeal);
  }

  const tonicStacks = relicCount(state, 'tonicVial');
  if (tonicStacks > 0) {
    const want = 5 * tonicStacks;
    const healAmount = Math.min(want, state.playerMaxHp - playerHp);
    playerHp = playerHp + healAmount;
    const healerStacks = relicCount(state, 'healersHand');
    if (healAmount > 0 && healerStacks > 0) {
      block += Math.ceil(healAmount * 0.5 * healerStacks);
    }
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
      heal = 14; comboText = '☠️ TRIPLE SKULL!'; comboType = 'triple';
    } else {
      selfDmg = 15; comboText = '☠️ TRIPLE SKULL!'; comboType = 'skull-triple';
    }
  } else if (combo.type === 'triple') {
    const t = combo.symbol;
    if (t === 'sword')  { dmg = 18 + (s.swordBonus || 0) * 3; comboText = '⚔️ TRIPLE SLASH!'; }
    else if (t === 'magic')  { dmg = 22 + (s.magicBonus || 0) * 3; comboText = '✨ ARCANE BURST!'; }
    else if (t === 'shield') { block = 50; heal = 4; comboText = '🛡️ FORTRESS!'; }
    else if (t === 'potion') { heal = 14; comboText = '🧪 FULL RESTORE!'; }
    comboType = 'triple';
  } else if (combo.type === 'double') {
    const t = combo.symbol;
    if (t === 'sword')  { dmg = 8 + (s.swordBonus || 0); comboText = '⚔️ Double Strike'; }
    else if (t === 'magic')  { dmg = 10 + (s.magicBonus || 0); comboText = '✨ Spell Cast'; }
    else if (t === 'shield') { block = 5; comboText = '🛡️ Shield Wall'; }
    else if (t === 'potion') { heal = 6; comboText = '🧪 Quick Heal'; }
    comboType = 'double';
  } else if (combo.type === 'rainbow') {
    for (const t of combo.symbols) {
      if (t === 'sword')  dmg += 8 + (s.swordBonus || 0);
      else if (t === 'magic')  dmg += 10 + (s.magicBonus || 0);
      else if (t === 'shield') block += 5;
      else if (t === 'potion') heal += 6;
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

  // Per-line relics — stacks add to multiplier
  if (dmg > 0 && comboType === 'triple') {
    const n = relicCount(s, 'glassCannon');
    if (n > 0) dmg = Math.round(dmg * (1 + 1 * n)); // 1 stack ×2, 2 stacks ×3
  }
  if (dmg > 0 && comboSymbol === 'sword') {
    const n = relicCount(s, 'twinFang');
    if (n > 0) dmg = Math.round(dmg * (1 + 0.5 * n));
  }
  if (dmg > 0 && comboSymbol === 'magic') {
    const a = relicCount(s, 'arcaneFocus');
    if (a > 0) dmg = Math.round(dmg * (1 + 0.75 * a));
    const e = relicCount(s, 'spellEcho');
    if (e > 0) dmg = Math.round(dmg * (1 + 0.5 * e));
  }
  if (heal > 0 && comboSymbol === 'potion') {
    const n = relicCount(s, 'greenThumb');
    if (n > 0) heal = Math.round(heal * (1 + 0.5 * n));
  }

  // Enemy weakness / resistance (multiplies dmg only, not heal/block)
  if (dmg > 0 && comboSymbol && s.enemy) {
    if (s.enemy.weakTo?.includes(comboSymbol)) dmg = Math.round(dmg * 1.5);
    else if (s.enemy.resists?.includes(comboSymbol)) dmg = Math.round(dmg * 0.5);
  }

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

// Enter a room of the given type. Returns the new state with phase set
// and the appropriate per-room state initialized.
function enterRoom(state, type) {
  const roomNumber = (state.floorPath?.length || 0) + 1;
  const newPath = [...(state.floorPath || []), type];
  // Every non-boss room has a fight first; shop/rest/sacrifice run as a
  // post-fight bonus once the enemy is defeated.
  const pendingRoomReward =
    type === 'shop' || type === 'rest' || type === 'sacrifice' ? type : null;
  const baseTransition = {
    ...state,
    room: roomNumber,
    floorPath: newPath,
    pendingPathChoices: null,
    pendingRoomReward,
    comboText: '',
    comboType: null,
    reelResults: null,
    lineResults: null,
  };

  if (type === 'fight' || type === 'elite' || type === 'boss' || pendingRoomReward) {
    // Reward rooms (shop/rest/sacrifice) spawn a normal fight first.
    const fightType = (type === 'fight' || type === 'elite' || type === 'boss') ? type : 'fight';
    return enterFight(baseTransition, fightType, roomNumber);
  }
  return baseTransition;
}

function enterFight(baseTransition, type, roomNumber) {
  const state = baseTransition;
  let enemy;
  if (type === 'boss') enemy = spawnBoss(state.floor);
  else if (type === 'elite') enemy = spawnElite(state.floor, roomNumber);
  else enemy = spawnEnemy(state.floor, roomNumber);
  const fightStart = applyFightStartRelics(state);
  const ability = getAbility(state);
  return {
    ...baseTransition,
    enemy,
    spinsLeft: state.maxSpins,
    block: fightStart.block,
    playerHp: fightStart.playerHp,
    phase: 'combat',
    locksLeft: state.maxLocks,
    poisonStacks: [],
    phoenixUsed: false,
    abilityChargesLeft: ability?.charges || 0,
    bloodragePending: false,
  };
}

// Enter the post-fight reward phase (shop/rest/sacrifice). Does NOT increment
// floorPath — the room was already counted when the fight started.
function enterRoomReward(state, type) {
  const cleared = { ...state, pendingRoomReward: null };
  if (type === 'shop') {
    const cap = 5 + 5 * relicCount(state, 'pennyPincher');
    const interest = calcInterest(state.gold, cap);
    return {
      ...cleared,
      gold: state.gold + interest,
      lastInterest: interest,
      phase: 'shop',
      shopRerollCount: 0,
      shopRerollKey: (state.shopRerollKey || 0),
    };
  }
  if (type === 'sacrifice') {
    return {
      ...cleared,
      phase: 'sacrifice',
      sacrificeChosen: null,
      sacrificeReward: null,
    };
  }
  if (type === 'rest') {
    return {
      ...cleared,
      phase: 'rest',
      playerHp: state.playerMaxHp,
    };
  }
  return cleared;
}

// After finishing a room: re-show the map so the player can pick the next
// node. After all ROOMS_PER_FLOOR rooms are done, go straight to boss.
function transitionAfterRoom(state) {
  // If the room had a post-fight bonus (shop/rest/sacrifice), play it now.
  if (state.pendingRoomReward) {
    return enterRoomReward(state, state.pendingRoomReward);
  }
  const visited = state.floorPath?.length || 0;
  if (visited >= ROOMS_PER_FLOOR) {
    return enterRoom(state, 'boss');
  }
  return { ...state, phase: 'pathChoice' };
}

// Phoenix Feather: revive at 25% HP if you would die. Stacks grant extra revives per fight.
function tryRevive(s) {
  const stacks = relicCount(s, 'phoenixFeather');
  const used = s.phoenixUsed || 0;
  if (s.playerHp <= 0 && used < stacks) {
    s.playerHp = Math.max(1, Math.ceil(s.playerMaxHp * 0.25));
    s.phoenixUsed = used + 1;
    s.justRevived = true;
  }
  return s;
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
  floorPath: [],          // rooms VISITED so far this floor
  floorMap: null,         // { levels: [[node,...]] } — branching graph
  mapPath: [],            // [{ level, slot }] — chosen positions on the graph so far
  pendingRoomReward: null, // 'shop' | 'rest' | 'sacrifice' — bonus phase after the fight
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
      return {
        ...INITIAL_STATE,
        character: charId,
        symbolPool: char?.pool || DEFAULT_POOL,
        unlockedChars: state.unlockedChars,
        phase: 'pathChoice',
        floorMap: generateFloorGraph(1),
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
      const bloodrage = !!s.bloodragePending;
      if (bloodrage) s.bloodragePending = false; // consume on this spin

      // Tick enemy bonus poison from abilities
      if (s.enemy?.bonusPoison?.length > 0) {
        let extraDmg = 0;
        const newStacks = [];
        for (const p of s.enemy.bonusPoison) {
          extraDmg += p.dmg;
          if (p.ticksLeft - 1 > 0) newStacks.push({ ...p, ticksLeft: p.ticksLeft - 1 });
        }
        s.enemy = { ...s.enemy, hp: Math.max(0, s.enemy.hp - extraDmg), bonusPoison: newStacks };
      }

      for (const line of getPaylines(s.gridRows)) {
        const lineIds = line.cells.map(([r, c]) => grid[r][c].id);
        const lineRes = evaluateLine(lineIds, s);

        // Apply per-spin damage modifiers per-line so each chunk shows the boost
        if (lineRes.dmg > 0) {
          if (enraged) lineRes.dmg = Math.round(lineRes.dmg * 1.5);
          if (periodRageActive) lineRes.dmg = Math.round(lineRes.dmg * 1.5);
          if (packHunterReady) lineRes.dmg = lineRes.dmg * 2;
          if (bloodrage) lineRes.dmg = lineRes.dmg * 2;
          // Vampiric Charm: heal % of dmg dealt (stacks at 20% per copy, cap 100%)
          const vampStacks = relicCount(s, 'vampiricCharm');
          if (vampStacks > 0) {
            const pct = Math.min(1.0, 0.2 * vampStacks);
            lineRes.heal = (lineRes.heal || 0) + Math.ceil(lineRes.dmg * pct);
          }
        }
        // Healer's Hand: each stack adds 50% of heal as block
        const healerStacks = relicCount(s, 'healersHand');
        if (lineRes.heal > 0 && healerStacks > 0) {
          lineRes.block = (lineRes.block || 0) + Math.ceil(lineRes.heal * 0.5 * healerStacks);
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

      // Spike Shield: retaliate when actually struck (3 dmg per stack)
      const spikeStacks = relicCount(s, 'spikeShield');
      if (incomingDmg > 0 && spikeStacks > 0) {
        const spikeDmg = 3 * spikeStacks;
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
      const magnetStacks = relicCount(state, 'magnet');
      if (magnetStacks > 0) gold = Math.round(gold * (1 + 0.5 * magnetStacks));
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
      // Elite reward: pick a random relic and add it for free
      let bonusRelics = state.relics;
      if (state.enemy.isElite) {
        const relicPool = SHOP_ITEMS.filter(i => i.type === 'relic');
        const reward = pickByRarity(relicPool, 1)[0];
        if (reward) bonusRelics = [...state.relics, reward.id];
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
        relics: bonusRelics,
      };
    }

    case 'PICK_SYMBOL': {
      const newPool = [...state.symbolPool, action.symbolId];
      return transitionAfterRoom({ ...state, symbolPool: newPool, symbolPicks: null });
    }

    case 'SKIP_SYMBOL': {
      return transitionAfterRoom({ ...state, symbolPicks: null });
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
      const gridRows = nextFloor >= 3 ? Math.max(3, state.gridRows) : state.gridRows;
      return {
        ...state,
        floor: nextFloor,
        floorPath: [],
        floorMap: generateFloorGraph(nextFloor),
        mapPath: [],
        pendingRoomReward: null,
        gridRows,
        phase: 'pathChoice',
      };
    }

    case 'USE_LOCK_TOKENS': {
      return { ...state, locksLeft: Math.max(0, state.locksLeft - action.count) };
    }

    case 'USE_ABILITY': {
      if (state.phase !== 'combat' || !state.enemy) return state;
      if ((state.abilityChargesLeft || 0) <= 0) return state;
      const ability = getAbility(state);
      if (!ability) return state;
      // Spin-cost abilities require at least one spin available
      if (ability.costSpin && state.spinsLeft <= 0) return state;
      let s = { ...state, abilityChargesLeft: state.abilityChargesLeft - 1 };
      if (ability.costSpin) s.spinsLeft = Math.max(0, s.spinsLeft - 1);

      if (ability.id === 'slash') {
        let dmg = ability.dmg + (s.swordBonus || 0) * 2;
        if (s.enemy.weakTo?.includes('sword')) dmg = Math.round(dmg * 1.5);
        else if (s.enemy.resists?.includes('sword')) dmg = Math.round(dmg * 0.5);
        s.enemy = { ...s.enemy, hp: Math.max(0, s.enemy.hp - dmg) };
        s.lastAbilityDmg = dmg;
      } else if (ability.id === 'bolt') {
        let dmg = ability.dmg + (s.magicBonus || 0) * 2;
        if (s.enemy.weakTo?.includes('magic')) dmg = Math.round(dmg * 1.5);
        else if (s.enemy.resists?.includes('magic')) dmg = Math.round(dmg * 0.5);
        s.enemy = { ...s.enemy, hp: Math.max(0, s.enemy.hp - dmg) };
        s.lastAbilityDmg = dmg;
      } else if (ability.id === 'pounce') {
        s.spinsLeft = Math.min(s.maxSpins, s.spinsLeft + 1);
      } else if (ability.id === 'bloodrage') {
        s.playerHp = Math.max(1, s.playerHp - (ability.hpCost || 5));
        s.bloodragePending = true;
      } else if (ability.id === 'toxicBlast') {
        let dmg = ability.dmg;
        if (s.enemy.weakTo?.includes('magic')) dmg = Math.round(dmg * 1.5);
        else if (s.enemy.resists?.includes('magic')) dmg = Math.round(dmg * 0.5);
        s.enemy = { ...s.enemy, hp: Math.max(0, s.enemy.hp - dmg) };
        s.lastAbilityDmg = dmg;
        if (ability.poison) {
          const cur = s.enemy.bonusPoison || [];
          s.enemy = { ...s.enemy, bonusPoison: [...cur, { dmg: ability.poison.dmg, ticksLeft: ability.poison.ticks }] };
        }
      }
      return s;
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
      return transitionAfterRoom({ ...state, sacrificeChosen: null, sacrificeReward: null });

    case 'GAME_OVER':
      return { ...state, phase: 'gameOver' };

    case 'NEXT_ROOM':
      return transitionAfterRoom(state);

    case 'CHOOSE_NEXT_ROOM': {
      const { slot } = action;
      if (!state.floorMap) return state;
      const visited = state.floorPath?.length || 0;
      if (visited >= ROOMS_PER_FLOOR) return state;
      const node = state.floorMap[visited]?.find(n => n.slot === slot);
      if (!node) return state;
      // Validate the move (must be reachable from previous position)
      if (visited > 0) {
        const prev = state.mapPath[visited - 1];
        const prevNode = state.floorMap[visited - 1]?.find(n => n.slot === prev.slot);
        if (!prevNode || !prevNode.edges.includes(slot)) return state;
      }
      const newMapPath = [...state.mapPath, { level: visited, slot }];
      return enterRoom({ ...state, mapPath: newMapPath }, node.type);
    }

    case 'FINISH_REST':
      return transitionAfterRoom(state);

    case 'BUY_ITEM': {
      const { item } = action;
      const bargainStacks = relicCount(state, 'bargainHunter');
      // Each stack reduces cost by 20%, capped at 60% off (3 stacks for max).
      const discount = Math.max(0.4, 1 - 0.2 * bargainStacks);
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

    case 'CLOSE_SHOP':
      return transitionAfterRoom({ ...state, shopItems: null });

    case 'DEBUG_KILL_ENEMY': {
      if (!state.enemy || state.phase !== 'combat') return state;
      let gold = state.enemy.gold;
      const magnetStacks = relicCount(state, 'magnet');
      if (magnetStacks > 0) gold = Math.round(gold * (1 + 0.5 * magnetStacks));
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
  const chooseNextRoom = useCallback((slot) => dispatch({ type: 'CHOOSE_NEXT_ROOM', slot }), []);
  const finishRest = useCallback(() => dispatch({ type: 'FINISH_REST' }), []);
  const useAbility = useCallback(() => dispatch({ type: 'USE_ABILITY' }), []);
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
    chooseNextRoom,
    finishRest,
    useAbility,
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
