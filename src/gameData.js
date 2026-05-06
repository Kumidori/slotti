export const SYMBOLS = [
  { id: 'sword',  icon: '⚔️' },
  { id: 'shield', icon: '🛡️' },
  { id: 'potion', icon: '🧪' },
  { id: 'magic',  icon: '✨' },
  { id: 'skull',  icon: '💀' },
  { id: 'wild',   icon: '⭐' },
  { id: 'mult',   icon: '✖️' },
  { id: 'coin',   icon: '💵' },
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

export function getSymbol(id) {
  return SYMBOLS.find(s => s.id === id);
}

export function pickFromPool(pool) {
  const id = pool[Math.floor(Math.random() * pool.length)];
  return getSymbol(id);
}

export function rollSymbolPicks(count = 3) {
  return Array.from({ length: count }, () => weightedPick(PICK_WEIGHTS));
}

export function rollSacrificeReward() {
  return weightedPick(SACRIFICE_WEIGHTS);
}

export const ENEMIES = [
  { name: 'Goblin',       sprite: '👺', hp: 20,  atk: 3,  gold: 8  },
  { name: 'Skeleton',     sprite: '💀', hp: 30,  atk: 5,  gold: 12 },
  { name: 'Slime',        sprite: '🟢', hp: 25,  atk: 4,  gold: 10 },
  { name: 'Dark Knight',  sprite: '🖤', hp: 45,  atk: 7,  gold: 18 },
  { name: 'Dragon',       sprite: '🐉', hp: 60,  atk: 10, gold: 25 },
  { name: 'Lich',         sprite: '👻', hp: 50,  atk: 8,  gold: 22 },
  { name: 'Demon Lord',   sprite: '😈', hp: 80,  atk: 12, gold: 35 },
];

export const BOSSES = [
  { name: 'Lili', sprite: 'lili', hp: 80, atk: 6, gold: 30, enrageAt: 0.3, enrageAtk: 12 },
  { name: 'Ruby', sprite: 'ruby', hp: 110, atk: 5, gold: 45, frenzyEvery: 3, frenzyHits: 3, frenzyMult: 0.6 },
  { name: 'Furzkopf', sprite: 'furzkopf', hp: 140, atk: 7, gold: 60, poisonOnHit: { dmg: 2, ticks: 3 } },
];

export const SHOP_ITEMS = [
  // Stat boosts / consumables (instant effect on purchase)
  { id: 'extraSpin',  type: 'stat', icon: '🎰',  cost: 25 },
  { id: 'healPotion', type: 'stat', icon: '❤️', cost: 12 },
  { id: 'maxHpUp',    type: 'stat', icon: '💪', cost: 15 },
  { id: 'sharpBlade', type: 'stat', icon: '🗡️', cost: 18 },
  { id: 'magicTome',  type: 'stat', icon: '📖', cost: 20 },
  { id: 'luckyCharm', type: 'stat', icon: '🍀', cost: 15 },

  // Relics (permanent rule modifiers)
  { id: 'vampiricCharm', type: 'relic', icon: '🧛', cost: 35 },
  { id: 'cursedCoin',    type: 'relic', icon: '☠️', cost: 30 },
  { id: 'glassCannon',   type: 'relic', icon: '💎', cost: 40 },
  { id: 'ironWill',      type: 'relic', icon: '🛡️', cost: 28 },
  { id: 'magnet',        type: 'relic', icon: '🧲', cost: 30 },
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

export function spawnEnemy(floor, room) {
  const pool = ENEMIES.filter((_, i) => i <= Math.min(floor + 1, ENEMIES.length - 1));
  const template = pool[Math.floor(Math.random() * pool.length)];
  const scale = 1 + (floor - 1) * 0.2 + (room - 1) * 0.05;
  return {
    name: template.name,
    sprite: template.sprite,
    hp: Math.round(template.hp * scale),
    maxHp: Math.round(template.hp * scale),
    atk: Math.round(template.atk * scale),
    gold: Math.round(template.gold * scale),
  };
}

export function spawnBoss(floor) {
  const template = BOSSES[Math.min(floor - 1, BOSSES.length - 1)];
  const scale = 1 + (floor - 1) * 0.3;
  const boss = {
    name: template.name,
    sprite: template.sprite,
    hp: Math.round(template.hp * scale),
    maxHp: Math.round(template.hp * scale),
    atk: Math.round(template.atk * scale),
    gold: Math.round(template.gold * scale),
    isBoss: true,
  };
  if (template.enrageAt) {
    boss.enrageAt = template.enrageAt;
    boss.enrageAtk = Math.round(template.enrageAtk * scale);
  }
  if (template.frenzyEvery) {
    boss.frenzyEvery = template.frenzyEvery;
    boss.frenzyHits = template.frenzyHits;
    boss.frenzyMult = template.frenzyMult;
    boss.attackCount = 0;
  }
  if (template.poisonOnHit) {
    boss.poisonOnHit = {
      dmg: Math.max(1, Math.round(template.poisonOnHit.dmg * scale)),
      ticks: template.poisonOnHit.ticks,
    };
  }
  return boss;
}

export function calcInterest(gold) {
  return Math.min(5, Math.floor(gold / 10));
}
