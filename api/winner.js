// Vercel serverless function — tracks the first player to beat the game.
// GET  /api/winner       → { winner: { name, when } | null }
// POST /api/winner { name } → claims the win if no winner yet (atomic)
//
// Requires Vercel KV (https://vercel.com/docs/storage/vercel-kv).
// Enable in your project's Storage tab and the env vars are auto-injected.

import { kv } from '@vercel/kv';

const KEY = 'slotti:winner';

export default async function handler(req, res) {
  // Allow this to be called from any origin (in case branch deploys differ)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const winner = await kv.get(KEY);
    return res.status(200).json({ winner: winner || null });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const name = (body.name || '').toString().trim().slice(0, 40);
    if (!name) return res.status(400).json({ error: 'name required' });

    // Atomic claim: only set if not present
    const existing = await kv.get(KEY);
    if (existing) {
      return res.status(409).json({ winner: existing, claimed: false });
    }
    const winner = { name, when: new Date().toISOString() };
    // setnx to be extra safe under races
    const ok = await kv.set(KEY, winner, { nx: true });
    if (!ok) {
      const after = await kv.get(KEY);
      return res.status(409).json({ winner: after, claimed: false });
    }
    return res.status(200).json({ winner, claimed: true });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
