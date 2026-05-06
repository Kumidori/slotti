export const SYMBOLS = [
  { id: 'sword',  icon: '⚔️' },
  { id: 'shield', icon: '🛡️' },
  { id: 'potion', icon: '🧪' },
  { id: 'magic',  icon: '✨' },
  { id: 'skull',  icon: '💀' },
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

// Symbols offered as post-fight rewards (no skulls — nobody picks those willingly).
export const PICKABLE_SYMBOLS = ['sword', 'shield', 'potion', 'magic'];

export function getSymbol(id) {
  return SYMBOLS.find(s => s.id === id);
}

export function pickFromPool(pool) {
  const id = pool[Math.floor(Math.random() * pool.length)];
  return getSymbol(id);
}

export function rollSymbolPicks(count = 3) {
  return Array.from({ length: count }, () =>
    PICKABLE_SYMBOLS[Math.floor(Math.random() * PICKABLE_SYMBOLS.length)]
  );
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
  return boss;
}

export function calcInterest(gold) {
  return Math.min(5, Math.floor(gold / 10));
}
