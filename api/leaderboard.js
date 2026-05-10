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

// Score: wins outrank losses, then achievement points, then floor, then gold.
// Each tier has enough headroom to avoid colliding with the next.
function scoreFor(entry) {
  const winBonus = entry.result === 'win' ? 1e18 : 0;
  const achPart = Math.min(99_999, entry.achievementPoints || 0) * 1e12;
  const floorPart = (entry.floor || 0) * 1e9;
  const goldPart = Math.min(1e9 - 1, entry.gold || 0);
  return winBonus + achPart + floorPart + goldPart;
}

function sanitise(body) {
  const result = body.result === 'win' ? 'win' : 'loss';
  const floor = Math.max(1, Math.min(99, parseInt(body.floor, 10) || 1));
  const room = Math.max(0, Math.min(99, parseInt(body.room, 10) || 0));
  const gold = Math.max(0, Math.min(1_000_000, parseInt(body.gold, 10) || 0));
  const achievementPoints = Math.max(0, Math.min(99_999, parseInt(body.achievementPoints, 10) || 0));
  const name = (body.name || '').toString().trim().slice(0, MAX_NAME) || 'Anon';
  const character = (body.character || '').toString().trim().slice(0, MAX_CHAR);
  return { name, floor, room, gold, achievementPoints, character, result, when: new Date().toISOString() };
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
