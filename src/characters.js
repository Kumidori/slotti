import { DEFAULT_POOL } from './gameData';

// Build a pool by tweaking the default counts.
function makePool(deltas) {
  const pool = [...DEFAULT_POOL];
  for (const [id, delta] of Object.entries(deltas)) {
    if (delta > 0) {
      for (let i = 0; i < delta; i++) pool.push(id);
    } else if (delta < 0) {
      for (let i = 0; i < -delta; i++) {
        const idx = pool.indexOf(id);
        if (idx !== -1) pool.splice(idx, 1);
      }
    }
  }
  return pool;
}

export const CHARACTERS = [
  {
    id: 'knight',
    icon: '⚔️',
    pool: makePool({ sword: 2, magic: -1 }),
    passive: null,
    ability: null,
    locked: false,
  },
  {
    id: 'mage',
    icon: '🧙',
    pool: makePool({ magic: 2, sword: -1 }),
    passive: null,
    ability: null,
    locked: false,
  },
  // Unlockable bosses
  {
    id: 'lili',
    icon: '👩',
    pool: DEFAULT_POOL,
    passive: 'periodRage',
    ability: null,
    locked: true,
    unlockedBy: 'lili',
  },
  {
    id: 'ruby',
    icon: '🐕',
    pool: makePool({ sword: 1 }),
    passive: 'packHunter',
    ability: null,
    locked: true,
    unlockedBy: 'ruby',
  },
  {
    id: 'furzkopf',
    icon: '👷',
    pool: DEFAULT_POOL,
    passive: 'toxicAura',
    ability: null,
    locked: true,
    unlockedBy: 'furzkopf',
  },
];

export function getAbility(state) {
  if (!state?.character) return null;
  const c = getCharacter(state.character);
  return c?.ability || null;
}

export function getCharacter(id) {
  return CHARACTERS.find(c => c.id === id);
}

export function loadUnlockedChars() {
  try {
    const raw = localStorage.getItem('unlockedChars');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveUnlockedChars(ids) {
  try {
    localStorage.setItem('unlockedChars', JSON.stringify(ids));
  } catch { /* ignore */ }
}

export function hasPassive(state, passiveId) {
  if (!state.character) return false;
  const char = getCharacter(state.character);
  return char?.passive === passiveId;
}
