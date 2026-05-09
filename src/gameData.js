// Grid is 3 rows × 3 reels, indexed [row][reel]
export const ROWS = 3;
export const REELS = 3;

// Five paylines: 3 rows + 2 diagonals
export const PAYLINES_3ROW = [
  { id: 'top',    cells: [[0,0],[0,1],[0,2]] },
  { id: 'mid',    cells: [[1,0],[1,1],[1,2]] },
  { id: 'bot',    cells: [[2,0],[2,1],[2,2]] },
  { id: 'diagD',  cells: [[0,0],[1,1],[2,2]] },
  { id: 'diagU',  cells: [[2,0],[1,1],[0,2]] },
];

export const PAYLINES_1ROW = [
  { id: 'only', cells: [[0,0],[0,1],[0,2]] },
];

export function getPaylines(rows) {
  return rows >= 3 ? PAYLINES_3ROW : PAYLINES_1ROW;
}

// Default export kept for backwards compatibility
export const PAYLINES = PAYLINES_3ROW;

export const RARITIES = {
  common: { weight: 70, glow: 'rgba(255,255,255,0.0)',  border: 'rgba(255,255,255,0.15)', label: 'Common' },
  rare:   { weight: 25, glow: 'rgba(80,160,255,0.55)',  border: '#5aa0ff',                 label: 'Rare' },
  epic:   { weight: 5,  glow: 'rgba(180,80,255,0.7)',   border: '#b04fff',                 label: 'Epic' },
};

export const SYMBOLS = [
  { id: 'sword',  icon: '⚔️', rarity: 'common' },
  { id: 'shield', icon: '🛡️', rarity: 'common' },
  { id: 'potion', icon: '🧪', rarity: 'common' },
  { id: 'magic',  icon: '✨', rarity: 'common' },
  { id: 'skull',  icon: '💀', rarity: 'common' },
  { id: 'wild',   icon: '⭐', rarity: 'epic' },
  { id: 'mult',   icon: '✖️', rarity: 'rare' },
  { id: 'coin',   icon: '💵', rarity: 'rare' },
];

// Starting symbol pool — each entry is one "card" in the pool.
// Roughly matches the old weights (30/25/20/15/10 → 6/5/4/3/2).
export const DEFAULT_POOL = [
  'sword', 'sword', 'sword', 'sword', 'sword', 'sword',
  'shield', 'shield', 'shield', 'shield', 'shield',
  'potion', 'potion', 'potion', 'potion',
  'magic', 'magic', 'magic',
  'skull', 'skull',
];

// Weights for symbols offered as post-fight rewards.
// Specials are rarer than basic combat symbols. Skulls are never offered.
const PICK_WEIGHTS = {
  sword: 25, shield: 25, potion: 25, magic: 25,
  wild: 6, mult: 5, coin: 4,
};

// Sacrifice rooms have a richer table — specials more likely.
const SACRIFICE_WEIGHTS = {
  sword: 18, shield: 18, potion: 18, magic: 18,
  wild: 12, mult: 8, coin: 8,
};

function weightedPick(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [id, w] of Object.entries(weights)) {
    r -= w;
    if (r <= 0) return id;
  }
  return Object.keys(weights)[0];
}

// Pick N distinct items from a pool, weighted by rarity.
export function pickByRarity(items, n) {
  const out = [];
  const pool = [...items];
  while (out.length < n && pool.length > 0) {
    const totalW = pool.reduce((s, x) => s + (RARITIES[x.rarity || 'common']?.weight || 1), 0);
    let r = Math.random() * totalW;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= RARITIES[pool[i].rarity || 'common']?.weight || 1;
      if (r <= 0) { idx = i; break; }
    }
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

export function getSymbol(id) {
  return SYMBOLS.find(s => s.id === id);
}

export function pickFromPool(pool) {
  const id = pool[Math.floor(Math.random() * pool.length)];
  return getSymbol(id);
}

export function rollSymbolPicks(count = 3) {
  // Guarantee distinct symbols where possible; fall back to duplicates only
  // when the available pool is smaller than `count`.
  const picks = [];
  const seen = new Set();
  let safety = 30;
  while (picks.length < count && safety-- > 0) {
    const id = weightedPick(PICK_WEIGHTS);
    if (!seen.has(id)) {
      picks.push(id);
      seen.add(id);
    }
  }
  // If we ran out of safety attempts (very unlikely), fill remaining freely
  while (picks.length < count) picks.push(weightedPick(PICK_WEIGHTS));
  return picks;
}

export function rollSacrificeReward() {
  return weightedPick(SACRIFICE_WEIGHTS);
}

// Each enemy can resist (50% dmg) and/or be weak (150% dmg) to symbol types.
// Symbol IDs: 'sword', 'magic', 'shield', 'potion', 'skull'
export const ENEMIES = [
  { name: 'Goblin',       sprite: '👺', hp: 20,  atk: 3,  gold: 13, weakTo: [],         resists: [] },
  { name: 'Skeleton',     sprite: '💀', hp: 30,  atk: 5,  gold: 16, weakTo: ['sword'],  resists: ['magic'] },
  { name: 'Slime',        sprite: '🟢', hp: 25,  atk: 4,  gold: 14, weakTo: ['magic'],  resists: ['sword'] },
  { name: 'Dark Knight',  sprite: '🖤', hp: 45,  atk: 7,  gold: 22, weakTo: [],         resists: ['sword'] },
  { name: 'Dragon',       sprite: '🐉', hp: 60,  atk: 10, gold: 28, weakTo: ['sword'],  resists: ['magic'] },
  { name: 'Lich',         sprite: '👻', hp: 50,  atk: 8,  gold: 25, weakTo: ['magic'],  resists: ['sword'] },
  { name: 'Demon Lord',   sprite: '😈', hp: 80,  atk: 12, gold: 36, weakTo: ['magic'],  resists: [] },
];

export const BOSSES = [
  { name: 'Lili', sprite: 'lili', hp: 80, atk: 6, gold: 30, enrageAt: 0.3, enrageAtk: 12, weakTo: ['magic'], resists: [] },
  { name: 'Ruby', sprite: 'ruby', hp: 110, atk: 5, gold: 45, frenzyEvery: 3, frenzyHits: 5, frenzyMult: 0.5, weakTo: ['sword'], resists: ['potion'] },
  { name: 'Furzkopf', sprite: 'furzkopf', hp: 280, atk: 11, gold: 80, poisonOnHit: { dmg: 3, ticks: 3 }, weakTo: ['magic'], resists: ['shield'] },
];

export const SHOP_ITEMS = [
  // Stat boosts / consumables (instant effect on purchase)
  { id: 'extraSpin',  type: 'stat',  icon: '🎰',  cost: 25, rarity: 'common' },
  { id: 'healPotion', type: 'stat',  icon: '❤️', cost: 12, rarity: 'common' },
  { id: 'maxHpUp',    type: 'stat',  icon: '💪', cost: 15, rarity: 'common' },
  { id: 'sharpBlade', type: 'stat',  icon: '🗡️', cost: 18, rarity: 'common' },
  { id: 'magicTome',  type: 'stat',  icon: '📖', cost: 20, rarity: 'common' },
  { id: 'luckyCharm', type: 'stat',  icon: '🍀', cost: 15, rarity: 'common' },

  // Relics (permanent rule modifiers)
  // Common
  { id: 'magnet',        type: 'relic', icon: '🧲', cost: 30, rarity: 'common' },
  { id: 'sturdyBoots',   type: 'relic', icon: '🥾', cost: 25, rarity: 'common' },
  { id: 'tonicVial',     type: 'relic', icon: '💊', cost: 25, rarity: 'common' },
  { id: 'pennyPincher',  type: 'relic', icon: '🪙', cost: 30, rarity: 'common' },
  // Rare
  { id: 'ironWill',      type: 'relic', icon: '🛡️', cost: 35, rarity: 'rare' },
  { id: 'vampiricCharm', type: 'relic', icon: '🧛', cost: 45, rarity: 'rare' },
  { id: 'spikeShield',   type: 'relic', icon: '🌵', cost: 40, rarity: 'rare' },
  { id: 'quickHands',    type: 'relic', icon: '✋', cost: 45, rarity: 'rare' },
  { id: 'bargainHunter', type: 'relic', icon: '🏷️', cost: 50, rarity: 'rare' },
  // Heal/Potion synergy
  { id: 'greenThumb',    type: 'relic', icon: '🌿', cost: 30, rarity: 'common' },
  { id: 'healersHand',   type: 'relic', icon: '🩹', cost: 45, rarity: 'rare' },
  // Magic synergy
  { id: 'spellEcho',     type: 'relic', icon: '🌀', cost: 45, rarity: 'rare' },
  { id: 'arcaneFocus',   type: 'relic', icon: '🔮', cost: 65, rarity: 'epic' },
  // Existing epics
  { id: 'glassCannon',   type: 'relic', icon: '💎', cost: 60, rarity: 'epic' },
  { id: 'cursedCoin',    type: 'relic', icon: '☠️', cost: 55, rarity: 'epic' },
  { id: 'phoenixFeather',type: 'relic', icon: '🪶', cost: 70, rarity: 'epic' },
  { id: 'twinFang',      type: 'relic', icon: '🐍', cost: 65, rarity: 'epic' },
];

export const RELIC_IDS = SHOP_ITEMS.filter(i => i.type === 'relic').map(i => i.id);

export function applyItemEffect(state, effectKey) {
  switch (effectKey) {
    case 'extraSpin':
      return { ...state, maxSpins: state.maxSpins + 1 };
    case 'healPotion':
      return { ...state, playerHp: Math.min(state.playerMaxHp, state.playerHp + 20) };
    case 'maxHpUp':
      return { ...state, playerMaxHp: state.playerMaxHp + 10, playerHp: state.playerHp + 10 };
    case 'sharpBlade':
      return { ...state, swordBonus: state.swordBonus + 2 };
    case 'magicTome':
      return { ...state, magicBonus: state.magicBonus + 3 };
    case 'luckyCharm':
      return { ...state, luckBonus: state.luckBonus + 1 };
    default:
      return state;
  }
}

export function hasRelic(state, id) {
  return state.relics?.includes(id);
}

export function relicCount(state, id) {
  if (!state.relics) return 0;
  let n = 0;
  for (const r of state.relics) if (r === id) n++;
  return n;
}

export function spawnEnemy(floor, room) {
  const pool = ENEMIES.filter((_, i) => i <= Math.min(floor + 1, ENEMIES.length - 1));
  const template = pool[Math.floor(Math.random() * pool.length)];
  let statScale = 1 + (floor - 1) * 0.2 + (room - 1) * 0.05;
  let goldScale = 1 + (floor - 1) * 0.15 + (room - 1) * 0.03;
  // Floor 3+ runs on the 3-row slot, so enemies need ~1.5x stats and gold
  // to keep up with the multi-payline output.
  if (floor >= 3) {
    statScale *= 2.0;
    goldScale *= 1.4;
  }
  return {
    name: template.name,
    sprite: template.sprite,
    hp: Math.round(template.hp * statScale),
    maxHp: Math.round(template.hp * statScale),
    atk: Math.round(template.atk * statScale),
    gold: Math.round(template.gold * goldScale),
    weakTo: template.weakTo || [],
    resists: template.resists || [],
  };
}

export function spawnElite(floor, room = 1) {
  // An elite is a regular enemy with significantly bigger stats and gold reward
  const e = spawnEnemy(floor, room);
  return {
    ...e,
    name: '⚔ Elite ' + e.name,
    hp: Math.round(e.hp * 1.6),
    maxHp: Math.round(e.hp * 1.6),
    atk: Math.round(e.atk * 1.3),
    gold: Math.round(e.gold * 1.5),
    isElite: true,
  };
}

export function spawnBoss(floor) {
  const template = BOSSES[Math.min(floor - 1, BOSSES.length - 1)];
  let statScale = 1 + (floor - 1) * 0.3;
  let goldScale = 1 + (floor - 1) * 0.2;
  // Floor 3+ bosses face a 5-payline player — bump them similarly
  if (floor >= 3) {
    statScale *= 1.7;
    goldScale *= 1.3;
  }
  const boss = {
    name: template.name,
    sprite: template.sprite,
    hp: Math.round(template.hp * statScale),
    maxHp: Math.round(template.hp * statScale),
    atk: Math.round(template.atk * statScale),
    gold: Math.round(template.gold * goldScale),
    isBoss: true,
    weakTo: template.weakTo || [],
    resists: template.resists || [],
  };
  if (template.enrageAt) {
    boss.enrageAt = template.enrageAt;
    boss.enrageAtk = Math.round(template.enrageAtk * statScale);
  }
  if (template.frenzyEvery) {
    boss.frenzyEvery = template.frenzyEvery;
    boss.frenzyHits = template.frenzyHits;
    boss.frenzyMult = template.frenzyMult;
    boss.attackCount = 0;
  }
  if (template.poisonOnHit) {
    boss.poisonOnHit = {
      dmg: Math.max(1, Math.round(template.poisonOnHit.dmg * statScale)),
      ticks: template.poisonOnHit.ticks,
    };
  }
  return boss;
}

export function calcInterest(gold, cap = 5) {
  return Math.min(cap, Math.floor(gold / 10));
}

// Generate 2 distinct path choices for the next room.
export function rollPathChoice(floor, alreadyVisited = []) {
  // Weight pool: fights are most common, specials less so. rest is more
  // common late-floor when player has taken damage.
  const pool = [
    'fight', 'fight', 'fight',
    'shop', 'shop',
    'sacrifice',
    'rest',
  ];
  if (floor >= 2) pool.push('elite');
  // Avoid offering rest if last room was rest
  const last = alreadyVisited[alreadyVisited.length - 1];
  const filtered = last === 'rest' ? pool.filter(t => t !== 'rest') : pool;
  const a = filtered[Math.floor(Math.random() * filtered.length)];
  let b;
  let safety = 20;
  do {
    b = filtered[Math.floor(Math.random() * filtered.length)];
    safety--;
  } while (b === a && safety > 0);
  return [a, b];
}
