import { env } from 'cloudflare:workers';
import manifest from '@/lib/book-assets.json';
import { readAsset, LibraryTransferError } from '@/lib/library-transfer';
import { failure, json } from '@/lib/security';
export const dynamic = 'force-dynamic';
async function handle(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    if (!env.BUCKET) return json({ error: 'Stockage indisponible.' }, 503);
    return await readAsset(env.BUCKET, manifest, (await params).path.join('/'), req);
  } catch (e) {
    if (e instanceof LibraryTransferError) return json({ error: e.message }, e.status);
    return failure(e);
  }
}
export const GET = handle;
export const HEAD = handle;
