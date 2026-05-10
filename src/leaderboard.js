// Local leaderboard — persists run results in localStorage so the player can
// see their best runs (highest floor reached + total gold earned).

const KEY = 'slotti.leaderboard.v1';
const MAX_ENTRIES = 10;

export function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveLeaderboard(entries) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch (e) { /* storage full / disabled — ignore */ }
}

// entry: { result: 'win' | 'loss', floor, room, totalGoldEarned, character }
export function recordRun(entry) {
  const enriched = {
    ...entry,
    date: Date.now(),
  };
  const all = loadLeaderboard();
  all.push(enriched);
  // Sort: wins first, then highest floor, then highest gold. Cap to MAX_ENTRIES.
  all.sort((a, b) => {
    if (a.result !== b.result) return a.result === 'win' ? -1 : 1;
    if ((b.floor || 0) !== (a.floor || 0)) return (b.floor || 0) - (a.floor || 0);
    return (b.totalGoldEarned || 0) - (a.totalGoldEarned || 0);
  });
  const trimmed = all.slice(0, MAX_ENTRIES);
  saveLeaderboard(trimmed);
  return trimmed;
}

export function clearLeaderboard() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}
