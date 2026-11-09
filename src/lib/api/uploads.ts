import { m, api } from '../convex';
import { DbError } from './errors';

/** Upload a file to Convex storage (staff only). Returns the public URL of the stored file. */
export async function uploadFile(file: File | Blob): Promise<{ url: string; storageId: string }> {
  const uploadUrl = (await m(api.posPeople.generateUploadUrl)) as string;
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': (file as File).type || 'application/octet-stream' },
    body: file,
  });
  if (!res.ok) throw new DbError(`UPLOAD_FAILED: ${res.status}`);
  const { storageId } = (await res.json()) as { storageId: string };
  const url = (await m(api.posPeople.getUploadedFileUrl, { storageId: storageId as any })) as string | null;
  if (!url) throw new DbError('UPLOAD_FAILED: no url');
  return { url, storageId };
}
