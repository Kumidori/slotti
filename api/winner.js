// Vercel serverless function — tracks the first player to beat the game.
// GET  /api/winner       → { winner: { name, when } | null }
// POST /api/winner { name } → claims the win if no winner yet (atomic)
//
// Backed by a Redis instance via REDIS_URL (TCP). Works with Redis Cloud,
// Upstash (TCP mode), or any standard Redis. Set REDIS_URL in Vercel env.

import { createClient } from 'redis';

const KEY = 'slotti:winner';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let client;
  try {
    client = await getClient();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'redis unavailable' });
  }

  if (req.method === 'GET') {
    const raw = await client.get(KEY);
    const winner = raw ? JSON.parse(raw) : null;
    return res.status(200).json({ winner });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const name = (body.name || '').toString().trim().slice(0, 40);
    if (!name) return res.status(400).json({ error: 'name required' });

    const winner = { name, when: new Date().toISOString() };
    // SET ... NX → only if key doesn't exist (atomic claim)
    const result = await client.set(KEY, JSON.stringify(winner), { NX: true });
    if (result === 'OK') {
      return res.status(200).json({ winner, claimed: true });
    }
    const existingRaw = await client.get(KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) : null;
    return res.status(409).json({ winner: existing, claimed: false });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
