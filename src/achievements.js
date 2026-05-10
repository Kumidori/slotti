// Achievements — unlocked once per profile, each worth a fixed point value.
// Total points are persisted in localStorage and surfaced on the leaderboard.

const KEY = 'slotti.achievements.v1';

// id → { points, difficulty } for the catalog. Names + descriptions live in
// translations.js under achievement.<id>.name / .desc.
export const ACHIEVEMENTS = [
  // Easy — first-time milestones
  { id: 'firstCombo',     points: 5,   difficulty: 'easy' },
  { id: 'firstGamble',    points: 5,   difficulty: 'easy' },
  { id: 'firstRecipe',    points: 10,  difficulty: 'easy' },
  { id: 'firstBoss',      points: 10,  difficulty: 'easy' },
  // Medium — skill / play-pattern based
  { id: 'greedy',         points: 15,  difficulty: 'medium' },
  // Hard — completion
  { id: 'firstWin',       points: 50,  difficulty: 'hard' },
  { id: 'highRoller',     points: 30,  difficulty: 'hard' },
  // Legendary — full-run challenges
  { id: 'untouchableWin', points: 100, difficulty: 'legendary' },
];

export const ACHIEVEMENT_INDEX = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

export function loadUnlocked() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

function saveUnlocked(ids) {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) { /* ignore */ }
}

export function isUnlocked(id) {
  return loadUnlocked().includes(id);
}

export function totalPoints() {
  const owned = loadUnlocked();
  return owned.reduce((sum, id) => sum + (ACHIEVEMENT_INDEX[id]?.points || 0), 0);
}

// Returns true if the achievement was newly unlocked. Dispatches a custom
// 'slotti:achievement' event with the id so a top-level toast can show it.
export function tryUnlock(id) {
  if (!ACHIEVEMENT_INDEX[id]) return false;
  const owned = loadUnlocked();
  if (owned.includes(id)) return false;
  owned.push(id);
  saveUnlocked(owned);
  try {
    window.dispatchEvent(new CustomEvent('slotti:achievement', { detail: { id } }));
  } catch (e) { /* SSR safety */ }
  return true;
}

export function clearAchievements() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}
