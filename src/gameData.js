export const SYMBOLS = [
  { id: 'sword',  icon: '⚔️', weight: 30 },
  { id: 'shield', icon: '🛡️', weight: 25 },
  { id: 'potion', icon: '🧪', weight: 20 },
  { id: 'magic',  icon: '✨', weight: 15 },
  { id: 'skull',  icon: '💀', weight: 10 },
];

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
];

export const SHOP_ITEMS = [
  { name: 'Extra Spin',    icon: '🎰', desc: '+1 spin per fight',    cost: 15, effectKey: 'extraSpin' },
  { name: 'Heal Potion',   icon: '❤️', desc: 'Restore 20 HP',        cost: 10, effectKey: 'healPotion' },
  { name: 'Max HP Up',     icon: '💪', desc: '+10 max HP',            cost: 12, effectKey: 'maxHpUp' },
  { name: 'Sharp Blade',   icon: '🗡️', desc: '+2 sword damage',      cost: 18, effectKey: 'sharpBlade' },
  { name: 'Magic Tome',    icon: '📖', desc: '+3 magic damage',       cost: 20, effectKey: 'magicTome' },
  { name: 'Lucky Charm',   icon: '🍀', desc: 'Fewer skulls on reels', cost: 25, effectKey: 'luckyCharm' },
];

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
      return { ...state, luckBonus: state.luckBonus + 5 };
    default:
      return state;
  }
}

export function getWeightedSymbol(luckBonus) {
  const adjusted = SYMBOLS.map(s => ({
    ...s,
    weight: s.id === 'skull' ? Math.max(2, s.weight - luckBonus) : s.weight,
  }));
  const total = adjusted.reduce((sum, s) => sum + s.weight, 0);
  let r = Math.random() * total;
  for (const s of adjusted) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return adjusted[adjusted.length - 1];
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
  return boss;
}

export function calcInterest(gold) {
  return Math.min(5, Math.floor(gold / 10));
}
