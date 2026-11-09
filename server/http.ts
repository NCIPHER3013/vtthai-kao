import { call } from './runtime';
import { contentTypeOf, putObject, readLocal, verifyUpload } from './storage';

const MAX_BODY = 25 * 1024 * 1024;

const json = (status: number, body: unknown) =>
  new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'content-type',
    },
  });

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  try {
    if (req.method === 'OPTIONS') return json(204, null);
    if (url.pathname === '/health') return json(200, { ok: true });

    if (url.pathname === '/rpc' && req.method === 'POST') {
      const { name, args } = (await req.json().catch(() => ({}))) as { name?: unknown; args?: Record<string, unknown> };
      if (typeof name !== 'string') return json(400, { error: 'name required' });
      try {
        const value = await call(name, args ?? {}, { external: true });
        return json(200, { value: value === undefined ? null : value });
      } catch (e: any) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!/^[A-Z_]+(:|$)/.test(msg)) console.error(`[rpc] ${name}:`, e);
        return json(400, { error: msg });
      }
    }

    if (url.pathname === '/upload' && req.method === 'POST') {
      if (!verifyUpload(url.searchParams.get('exp'), url.searchParams.get('sig'))) return json(403, { error: 'invalid upload url' });
      const body = new Uint8Array(await req.arrayBuffer());
      if (body.byteLength > MAX_BODY) return json(413, { error: 'Body too large' });
      const type = (req.headers.get('content-type') || 'application/octet-stream').split(';')[0];
      return json(200, { storageId: await putObject(body, type) });
    }

    if (url.pathname.startsWith('/storage/') && req.method === 'GET') {
      const id = decodeURIComponent(url.pathname.slice('/storage/'.length));
      const file = await readLocal(id);
      if (!file) return json(404, { error: 'not found' });
      return new Response(new Uint8Array(file), {
        headers: { 'Content-Type': contentTypeOf(id), 'Cache-Control': 'public, max-age=31536000, immutable' },
      });
    }

    return json(404, { error: 'not found' });
  } catch (e: any) {
    console.error('[server]', e);
    return json(500, { error: e?.message || 'server error' });
  }
}
