import { env } from 'cloudflare:workers';
import manifest from '@/lib/book-assets.json';
import { authorizeImport, boundedBody, uploadBundle, inventory, ready, commitImport, LibraryTransferError } from '@/lib/library-transfer';
import { config, failure, json } from '@/lib/security';
export const dynamic = 'force-dynamic';
async function handle(req: Request) {
  try {
    await authorizeImport(req, config());
    if (!env.BUCKET) return json({ error: 'Stockage indisponible.' }, 503);
    if (req.method === 'GET') return json({ ...await inventory(env.BUCKET, manifest), ready: await ready(env.BUCKET, manifest) });
    const action = new URL(req.url).searchParams.get('action');
    if (action === 'commit') return json(await commitImport(env.BUCKET, manifest));
    if (action !== 'upload') return json({ error: 'Opération inconnue.' }, 400);
    return json(await uploadBundle(env.BUCKET, manifest, await boundedBody(req)));
  } catch (e) {
    if (e instanceof LibraryTransferError) return json({ error: e.message }, e.status);
    return failure(e);
  }
}
export const GET = handle;
export const POST = handle;
