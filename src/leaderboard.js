// Local leaderboard — persists run results in localStorage so the player can
// see their best runs (highest floor reached + total gold earned).
// Online submissions also flow through here.

const KEY = 'slotti.leaderboard.v1';
const NAME_KEY = 'slotti.playerName';
const MAX_ENTRIES = 10;
const API_URL = '/api/leaderboard';

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

export function getPlayerName() {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; }
}

export function setPlayerName(name) {
  const clean = (name || '').toString().trim().slice(0, 24);
  try {
    if (clean) localStorage.setItem(NAME_KEY, clean);
    else localStorage.removeItem(NAME_KEY);
  } catch (e) { /* ignore */ }
  return clean;
}

// Fire-and-forget submission to the online leaderboard. Resolves to the new
// global top list, or null on failure (caller can fall back to local view).
export async function submitOnline(entry, name) {
  try {
    const payload = {
      name,
      floor: entry.floor,
      room: entry.room,
      gold: entry.totalGoldEarned,
      character: entry.character,
      result: entry.result,
      achievementPoints: entry.achievementPoints || 0,
    };
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.entries || null;
  } catch (e) {
    return null;
  }
}

export async function fetchOnline() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) return null;
    const data = await res.json();
    return data.entries || [];
  } catch (e) {
    return null;
  }
}
