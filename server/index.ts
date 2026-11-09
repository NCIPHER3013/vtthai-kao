import { existsSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { call, init } from './runtime';
import { contentTypeOf, publicUrl, putObject, readLocal, verifyUpload } from './storage';

for (const f of ['.env.local', '.env']) if (existsSync(f)) process.loadEnvFile(f);

const MAX_BODY = 25 * 1024 * 1024;

const readBody = (req: IncomingMessage) =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

const send = (res: ServerResponse, status: number, body: unknown, type = 'application/json') => {
  res.writeHead(status, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'content-type',
  });
  res.end(Buffer.isBuffer(body) || typeof body === 'string' ? body : JSON.stringify(body));
};

export async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', 'http://localhost');
  try {
    if (req.method === 'OPTIONS') return send(res, 204, '');
    if (url.pathname === '/health') return send(res, 200, { ok: true });

    if (url.pathname === '/rpc' && req.method === 'POST') {
      const { name, args } = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      if (typeof name !== 'string') return send(res, 400, { error: 'name required' });
      try {
        const value = await call(name, args ?? {}, { external: true });
        return send(res, 200, { value: value === undefined ? null : value });
      } catch (e: any) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!/^[A-Z_]+(:|$)/.test(msg)) console.error(`[rpc] ${name}:`, e);
        return send(res, 400, { error: msg });
      }
    }

    if (url.pathname === '/upload' && req.method === 'POST') {
      if (!verifyUpload(url.searchParams.get('exp'), url.searchParams.get('sig'))) return send(res, 403, { error: 'invalid upload url' });
      const type = (req.headers['content-type'] || 'application/octet-stream').split(';')[0];
      const storageId = await putObject(await readBody(req), type);
      return send(res, 200, { storageId });
    }

    if (url.pathname.startsWith('/storage/') && req.method === 'GET') {
      const id = decodeURIComponent(url.pathname.slice('/storage/'.length));
      const file = await readLocal(id);
      if (!file) return send(res, 404, { error: 'not found' });
      res.writeHead(200, { 'Content-Type': contentTypeOf(id), 'Cache-Control': 'public, max-age=31536000, immutable' });
      return res.end(file);
    }

    send(res, 404, { error: 'not found' });
  } catch (e: any) {
    console.error('[server]', e);
    send(res, 500, { error: e?.message || 'server error' });
  }
}

async function main() {
  await init();
  const port = Number(process.env.API_PORT || 8787);
  createServer(handle).listen(port, '0.0.0.0', () => console.log(`API listening on :${port} (storage ${process.env.SUPABASE_URL ? publicUrl('') : 'local .storage/'})`));
}

if (process.argv[1] && /server[\\/]index\.ts$/.test(process.argv[1])) main().catch((e) => {
  console.error(e);
  process.exit(1);
});
