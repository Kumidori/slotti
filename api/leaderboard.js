// Online leaderboard backed by a Redis sorted set.
//   GET  /api/leaderboard            → { entries: [...top 25 sorted desc] }
//   POST /api/leaderboard { name, floor, room, gold, character, result }
//                                    → { ok: true, entries: [...refreshed top 25] }
//   DELETE /api/leaderboard          → admin-only reset (ADMIN_TOKEN)

import { createClient } from 'redis';

const KEY = 'slotti:leaderboard';
const KEEP = 100;       // we keep at most this many entries; older/lower-ranked ones drop off
const RETURN = 25;      // how many we send back to clients
const MAX_NAME = 24;
const MAX_CHAR = 24;

let cachedClient = null;
async function getClient() {
  if (cachedClient && cachedClient.isOpen) return cachedClient;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL not set');
  const client = createClient({ url });
  client.on('error', (err) => console.error('redis error', err));
  await client.connect();
  cachedClient = client;
  return client;
}

// Sort: highest computed run score wins. Achievement points break ties.
function scoreFor(entry) {
  const score = Math.min(9_999_999, entry.score || 0);
  const ach = Math.min(99_999, entry.achievementPoints || 0);
  return score * 1e6 + ach;
}

function clampInt(v, min, max) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function sanitise(body) {
  const result = body.result === 'win' ? 'win' : 'loss';
  return {
    name: (body.name || '').toString().trim().slice(0, MAX_NAME) || 'Anon',
    character: (body.character || '').toString().trim().slice(0, MAX_CHAR),
    result,
    floor: clampInt(body.floor, 1, 99),
    room: clampInt(body.room, 0, 99),
    score: clampInt(body.score, 0, 9_999_999),
    gold: clampInt(body.gold, 0, 1_000_000),
    dmgDealt: clampInt(body.dmgDealt, 0, 9_999_999),
    dmgBlocked: clampInt(body.dmgBlocked, 0, 9_999_999),
    dmgHealed: clampInt(body.dmgHealed, 0, 9_999_999),
    dmgTaken: clampInt(body.dmgTaken, 0, 9_999_999),
    enemiesDefeated: clampInt(body.enemiesDefeated, 0, 9999),
    speedBonus: clampInt(body.speedBonus, 0, 9999),
    achievementPoints: clampInt(body.achievementPoints, 0, 99_999),
    when: new Date().toISOString(),
  };
}

async function topEntries(client, count = RETURN) {
  // Highest scores first
  const raw = await client.zRange(KEY, 0, count - 1, { REV: true });
  return raw.map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let client;
  try {
    client = await getClient();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'redis unavailable' });
  }

  if (req.method === 'GET') {
    const entries = await topEntries(client);
    return res.status(200).json({ entries });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const entry = sanitise(body);
    const score = scoreFor(entry);
    // Add as a new member; the timestamp inside the JSON makes duplicates
    // (same score, same player, same run) safely unique.
    await client.zAdd(KEY, [{ score, value: JSON.stringify(entry) }]);
    // Trim — drop everything below rank KEEP (i.e. keep only the top KEEP)
    await client.zRemRangeByRank(KEY, 0, -KEEP - 1);
    const entries = await topEntries(client);
    return res.status(200).json({ ok: true, entries });
  }

  if (req.method === 'DELETE') {
    const adminToken = process.env.ADMIN_TOKEN;
    if (!adminToken) return res.status(503).json({ error: 'reset disabled (no ADMIN_TOKEN configured)' });
    const auth = req.headers.authorization || '';
    const provided = auth.startsWith('Bearer ') ? auth.slice(7) : (req.query?.token || '');
    if (provided !== adminToken) return res.status(401).json({ error: 'unauthorized' });
    await client.del(KEY);
    return res.status(200).json({ reset: true });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
