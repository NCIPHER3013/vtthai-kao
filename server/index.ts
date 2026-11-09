import { existsSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { handleRequest } from './http';
import { init } from './runtime';
import { isRemoteStorage, publicUrl } from './storage';

for (const f of ['.env.local', '.env']) if (existsSync(f)) process.loadEnvFile(f);

const readBody = (req: IncomingMessage) =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

export async function handle(req: IncomingMessage, res: ServerResponse) {
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
  const request = new Request(`http://${req.headers.host || 'localhost'}${req.url || '/'}`, {
    method: req.method,
    headers,
    body: hasBody ? new Uint8Array(await readBody(req)) : undefined,
  });
  const response = await handleRequest(request);
  const out: Record<string, string> = {};
  response.headers.forEach((v, k) => {
    out[k] = v;
  });
  res.writeHead(response.status, out);
  res.end(Buffer.from(await response.arrayBuffer()));
}

async function main() {
  await init();
  const port = Number(process.env.API_PORT || 8787);
  createServer((req, res) => {
    handle(req, res).catch((e) => {
      console.error('[server]', e);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  }).listen(port, '0.0.0.0', () => console.log(`API listening on :${port} (storage ${isRemoteStorage() ? publicUrl('') : 'local .storage/'})`));
}

if (process.argv[1] && /server[\\/]index\.ts$/.test(process.argv[1])) main().catch((e) => {
  console.error(e);
  process.exit(1);
});
