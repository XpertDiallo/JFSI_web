import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = path.resolve('public/books');
const output = 'lib/book-assets.json';
const hash = data => createHash('sha256').update(data).digest('hex');
const mime = { '.pdf': 'application/pdf', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json; charset=utf-8' };
if (!existsSync(root)) {
  if (!existsSync(output)) throw new Error('Restaurer la bibliothèque depuis les ressources de livraison.');
  console.log('Bibliothèque R2 : manifeste existant conservé.');
} else {
  const files = {};
  function walk(dir) {
    for (const name of readdirSync(dir).sort()) {
      const full = path.join(dir, name); const stat = statSync(full);
      if (stat.isDirectory()) { walk(full); continue; }
      const type = mime[path.extname(name)]; if (!type) throw new Error('Format non prévu : ' + name);
      const file = path.relative(root, full).split(path.sep).join('/');
      if (!/^livre-[a-f0-9]{16}\/[a-z0-9-]+\.(pdf|webp|png|json)$/.test(file)) throw new Error('Chemin non prévu : ' + file);
      const bytes = readFileSync(full);
      if (bytes.length > 7 * 1024 * 1024) throw new Error('Ressource trop grande : ' + file);
      files[file] = { sha256: hash(bytes), size: bytes.length, mime: type };
    }
  }
  walk(root);
  const books = JSON.parse(readFileSync('lib/books.json', 'utf8'));
  const ids = new Set(Object.keys(files).map(x => x.split('/')[0]));
  if (ids.size !== books.length) throw new Error('Catalogue et fichiers incohérents.');
  for (const b of books) {
    const urls = [b.url, b.cover, ...(b.parts || []).map(x => x.url)].filter(Boolean);
    if (b.format === 'pages') { urls.push(b.pageBase + 'text.json'); for (let n = 1; n <= b.pages; n++) urls.push(b.pageBase + 'page-' + String(n).padStart(4, '0') + '.webp'); }
    for (const url of urls) if (!Object.hasOwn(files, url.replace(/^\/books\//, ''))) throw new Error('Ressource manquante : ' + url);
  }
  const release = hash(JSON.stringify(files));
  writeFileSync(output, JSON.stringify({ release, books: books.length, files }, null, 2) + '\n');
  console.log('Bibliothèque R2 : ' + books.length + ' livres, ' + Object.keys(files).length + ' fichiers, manifeste ' + release.slice(0, 12));
}
