import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BUCKET = 'media';
const LOCAL_DIR = join(process.cwd(), '.storage');
const EXT: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
};
const MIME: Record<string, string> = Object.fromEntries(Object.entries(EXT).map(([m, e]) => [e, m]));

const base = () => {
  const raw = process.env.SUPABASE_URL || '';
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/$/, '');
  }
};
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const remote = () => !!(base() && key());
const auth = () => ({ apikey: key(), Authorization: `Bearer ${key()}` });
const secret = () => key() || process.env.UPLOAD_SECRET || 'local-dev-upload-secret';
const sign = (exp: string) => createHmac('sha256', secret()).update(exp).digest('hex');

export const contentTypeOf = (path: string) => MIME[path.split('.').pop()?.toLowerCase() || ''] || 'application/octet-stream';

export function publicUrl(path: string) {
  if (remote()) return `${base()}/storage/v1/object/public/${BUCKET}/${encodeURI(path)}`;
  return `${(process.env.API_PUBLIC_URL || '').replace(/\/$/, '')}/storage/${encodeURI(path)}`;
}

export async function putObject(body: Uint8Array | Buffer, contentType: string) {
  const path = `${randomUUID()}.${EXT[contentType] || 'bin'}`;
  if (remote()) {
    const res = await fetch(`${base()}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': contentType, 'x-upsert': 'true' },
      body,
    });
    if (!res.ok) throw new Error(`UPLOAD_FAILED: ${res.status} ${await res.text()}`);
  } else {
    await mkdir(LOCAL_DIR, { recursive: true });
    await writeFile(join(LOCAL_DIR, path), body);
  }
  return path;
}

export async function deleteObject(path: string) {
  if (remote()) {
    await fetch(`${base()}/storage/v1/object/${BUCKET}/${encodeURI(path)}`, { method: 'DELETE', headers: auth() });
  } else {
    await rm(join(LOCAL_DIR, path), { force: true });
  }
}

export async function listObjects() {
  if (remote()) {
    const out: Array<{ _id: string; _creationTime: number; size?: number; contentType?: string }> = [];
    for (let offset = 0; ; offset += 100) {
      const res = await fetch(`${base()}/storage/v1/object/list/${BUCKET}`, {
        method: 'POST',
        headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: '', limit: 100, offset }),
      });
      if (!res.ok) throw new Error(`LIST_FAILED: ${res.status}`);
      const items = (await res.json()) as any[];
      for (const o of items) {
        if (!o.id) continue;
        out.push({
          _id: o.name,
          _creationTime: Date.parse(o.created_at),
          size: o.metadata?.size,
          contentType: o.metadata?.mimetype,
        });
      }
      if (items.length < 100) break;
    }
    return out;
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  const out = [];
  for (const f of await readdir(LOCAL_DIR)) {
    const s = await stat(join(LOCAL_DIR, f));
    out.push({ _id: f, _creationTime: s.mtimeMs, size: s.size, contentType: contentTypeOf(f) });
  }
  return out;
}

export async function readLocal(path: string) {
  if (path.includes('/') || path.includes('\\') || path.includes('..')) return null;
  try {
    return await readFile(join(LOCAL_DIR, path));
  } catch {
    return null;
  }
}

export function uploadUrl() {
  const exp = String(Date.now() + 10 * 60 * 1000);
  return `${(process.env.API_PUBLIC_URL || '').replace(/\/$/, '')}/upload?exp=${exp}&sig=${sign(exp)}`;
}

export function verifyUpload(exp: string | null, sig: string | null) {
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sign(exp));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const storage = {
  getUrl: async (id: string) => (id ? publicUrl(id) : null),
  generateUploadUrl: async () => uploadUrl(),
  store: async (blob: Blob) => putObject(Buffer.from(await blob.arrayBuffer()), blob.type || 'application/octet-stream'),
  delete: async (id: string) => deleteObject(id),
};
