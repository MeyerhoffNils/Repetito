// Abgleich des Lernstands zwischen Geräten (Netlify Function + Netlify Blobs)
import { getStore } from '@netlify/blobs';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async (req) => {
  const url = new URL(req.url);
  if (url.searchParams.has('ping')) return json({ ok: true });
  const key = (url.searchParams.get('key') || '').toLowerCase();
  if (!/^[a-z0-9]{12,40}$/.test(key)) return json({ error: 'key' }, 400);
  const store = getStore({ name: 'repetitio', consistency: 'strong' });
  if (req.method === 'GET') return json((await store.get(key, { type: 'json' })) || null);
  if (req.method === 'PUT') {
    const text = await req.text();
    if (text.length > 3000000) return json({ error: 'too large' }, 413);
    let body;
    try { body = JSON.parse(text); } catch (e) { return json({ error: 'json' }, 400); }
    if (typeof body.state !== 'string' || typeof body.updated !== 'number') return json({ error: 'format' }, 400);
    const cur = await store.get(key, { type: 'json' });
    if (cur && cur.updated > body.updated) return json(cur, 409);
    await store.setJSON(key, { state: body.state, updated: body.updated });
    return json({ ok: true, updated: body.updated });
  }
  return json({ error: 'method' }, 405);
};

export const config = { path: '/api/sync' };
