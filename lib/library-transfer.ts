export type Asset = { sha256: string; size: number; mime: string };
export type Manifest = { release: string; books: number; files: Record<string, Asset> };
export class LibraryTransferError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const MAX_BUNDLE = 8 * 1024 * 1024;
export const MAX_FILES = 32;
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
export async function sha256(bytes: Uint8Array) {
  return hex(await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>));
}
export function prefix(m: Manifest) { return 'library/releases/' + m.release + '/'; }
export function objectKey(m: Manifest, a: Asset) { return prefix(m) + 'objects/' + a.sha256; }
export async function authorizeImport(req: Request, settings: Record<string, string>, now = Date.now()) {
  const until = Date.parse(settings.LIBRARY_IMPORT_UNTIL || '');
  const expected = settings.LIBRARY_IMPORT_HASH || '';
  const supplied = req.headers.get('x-jfsi-import-token') || '';
  if (!/^[a-f0-9]{64}$/.test(expected) || !Number.isFinite(until) || until <= now || !/^[a-f0-9]{64}$/.test(supplied)) {
    throw new LibraryTransferError(403, 'Import documentaire fermé ou non autorisé.');
  }
  const actual = await sha256(new TextEncoder().encode(supplied));
  let mismatch = 0;
  for (let i = 0; i < 64; i++) mismatch |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  if (mismatch || req.headers.get('origin') && req.headers.get('origin') !== new URL(req.url).origin) {
    throw new LibraryTransferError(403, 'Import documentaire non autorisé.');
  }
}
export async function boundedBody(req: Request) {
  if (Number(req.headers.get('content-length')) > MAX_BUNDLE) throw new LibraryTransferError(413, 'Lot trop volumineux.');
  const reader = req.body?.getReader();
  if (!reader) throw new LibraryTransferError(400, 'Lot vide.');
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const r = await reader.read(); if (r.done) break;
    size += r.value.byteLength;
    if (size > MAX_BUNDLE) { await reader.cancel(); throw new LibraryTransferError(413, 'Lot trop volumineux.'); }
    chunks.push(r.value);
  }
  const bytes = new Uint8Array(size); let pos = 0;
  for (const chunk of chunks) { bytes.set(chunk, pos); pos += chunk.byteLength; }
  return bytes;
}
export async function uploadBundle(bucket: R2Bucket, m: Manifest, bytes: Uint8Array) {
  if (bytes.byteLength < 6 || bytes.byteLength > MAX_BUNDLE) throw new LibraryTransferError(413, 'Taille de lot invalide.');
  const headerSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
  if (headerSize < 2 || headerSize > 32768 || headerSize + 4 > bytes.byteLength) throw new LibraryTransferError(400, 'En-tête invalide.');
  let paths: unknown;
  try { paths = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(4, 4 + headerSize))); }
  catch { throw new LibraryTransferError(400, 'En-tête invalide.'); }
  if (!Array.isArray(paths) || !paths.length || paths.length > MAX_FILES || new Set(paths).size !== paths.length) throw new LibraryTransferError(400, 'Liste de fichiers invalide.');
  const validated: { asset: Asset; bytes: Uint8Array }[] = []; let offset = 4 + headerSize;
  for (const path of paths) {
    if (typeof path !== 'string' || !Object.hasOwn(m.files, path)) throw new LibraryTransferError(400, 'Fichier hors catalogue.');
    const asset = m.files[path]; const data = bytes.subarray(offset, offset + asset.size); offset += asset.size;
    if (data.byteLength !== asset.size || await sha256(data) !== asset.sha256) throw new LibraryTransferError(422, 'Intégrité du fichier incorrecte.');
    validated.push({ asset, bytes: data });
  }
  if (offset !== bytes.byteLength) throw new LibraryTransferError(422, 'Octets supplémentaires dans le lot.');
  // Validate the whole bundle before writing. R2 validates SHA-256 again at storage.
  for (const item of validated) {
    await bucket.put(objectKey(m, item.asset), item.bytes as Uint8Array<ArrayBuffer>, {
      sha256: item.asset.sha256,
      httpMetadata: { contentType: item.asset.mime },
      customMetadata: { sha256: item.asset.sha256, release: m.release },
    });
  }
  return { uploaded: validated.length, release: m.release };
}
export async function inventory(bucket: R2Bucket, m: Manifest) {
  const found = new Map<string, R2Object>(); let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix: prefix(m) + 'objects/', limit: 1000, cursor, include: ['customMetadata'] });
    for (const obj of page.objects) found.set(obj.key, obj);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  const missing: string[] = [];
  for (const [path, a] of Object.entries(m.files)) {
    const obj = found.get(objectKey(m, a));
    if (!obj || obj.size !== a.size || obj.customMetadata?.sha256 !== a.sha256 || obj.customMetadata?.release !== m.release) missing.push(path);
  }
  return { release: m.release, files: Object.keys(m.files).length, books: m.books, missing, bytes: Object.values(m.files).reduce((sum, a) => sum + a.size, 0) };
}
export async function commitImport(bucket: R2Bucket, m: Manifest) {
  const state = await inventory(bucket, m);
  if (state.missing.length) throw new LibraryTransferError(409, state.missing.length + ' fichier(s) à importer ou à vérifier.');
  await bucket.put(prefix(m) + 'ready.json', JSON.stringify({ release: m.release, files: state.files, books: m.books, verifiedAt: new Date().toISOString() }), { httpMetadata: { contentType: 'application/json' } });
  return { ready: true, release: m.release, files: state.files, books: m.books };
}
export async function ready(bucket: R2Bucket, m: Manifest) {
  const r = await bucket.get(prefix(m) + 'ready.json');
  if (!r) return false;
  try { const j = await r.json<{ release: string; files: number; books: number }>(); return j.release === m.release && j.files === Object.keys(m.files).length && j.books === m.books; }
  catch { return false; }
}
export function rangeFor(header: string | null, size: number) {
  if (!header) return { start: 0, end: size - 1, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || !match[1] && !match[2]) return null;
  const first = Number(match[1]), last = Number(match[2]);
  if (match[1] && !Number.isSafeInteger(first) || match[2] && !Number.isSafeInteger(last)) return null;
  const start = match[1] ? first : Math.max(0, size - last);
  const end = match[1] && match[2] ? Math.min(last, size - 1) : size - 1;
  if (start < 0 || start >= size || start > end) return null;
  return { start, end, partial: true };
}
export async function readAsset(bucket: R2Bucket, m: Manifest, path: string, req: Request) {
  if (!Object.hasOwn(m.files, path)) throw new LibraryTransferError(404, 'Ressource introuvable.');
  if (!await ready(bucket, m)) throw new LibraryTransferError(503, 'La bibliothèque est en cours de préparation. Réessayez dans quelques instants.');
  const a = m.files[path]; const range = rangeFor(req.headers.get('range'), a.size);
  const headers: Record<string, string> = { 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'Content-Type': a.mime, 'Content-Disposition': 'inline', 'Accept-Ranges': 'bytes', 'ETag': '"' + a.sha256 + '"', 'Content-Security-Policy': "sandbox; default-src 'none'" };
  if (!range) return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': 'bytes */' + a.size } });
  const { start, end, partial } = range;
  if (!partial && req.headers.get('if-none-match') === headers.ETag) return new Response(null, { status: 304, headers });
  const obj = await bucket.get(objectKey(m, a), partial ? { range: { offset: start, length: end - start + 1 } } : undefined);
  if (!obj || obj.size !== a.size || obj.customMetadata?.sha256 !== a.sha256 || obj.customMetadata?.release !== m.release) throw new LibraryTransferError(503, 'Ressource momentanément indisponible.');
  headers['Content-Length'] = String(end - start + 1);
  if (partial) headers['Content-Range'] = `bytes ${start}-${end}/${a.size}`;
  return new Response(req.method === 'HEAD' ? null : obj.body, { status: partial ? 206 : 200, headers });
}
