// Public, version-pinned source documents only. Downloaded text is never executed.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'tools/oss-upstream');
mkdirSync(output, { recursive: true });
const manifestPath = join(output, 'sources.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const notices = JSON.parse(readFileSync(join(root, 'app/src/data/ossNotices.json'), 'utf8'));
const pending = notices.packages.filter(p => !p.documents.length);
const cache = new Map();
async function get(url) {
  if (!cache.has(url)) cache.set(url, fetch(url, { signal: AbortSignal.timeout(20000) }).then(async r => r.ok ? r.text() : null).catch(() => null));
  return cache.get(url);
}
async function collect(p) {
  const key = `${p.name}@${p.version}`;
  if (manifest[key]) return;
  const raw = await get(`https://registry.npmjs.org/${encodeURIComponent(p.name)}/${p.version}`);
  if (!raw) throw Error('Missing registry metadata: ' + key);
  const meta = JSON.parse(raw);
  const repo = typeof meta.repository === 'string' ? meta.repository : meta.repository?.url;
  const match = repo?.match(/github\.com[/:]([^/]+\/[^/#]+?)(?:\.git)?$/);
  if (!match) { console.log('UNRESOLVED', key, repo); return; }
  if (!/^[a-f0-9]{40}$/i.test(meta.gitHead ?? '')) {
    const tagged = await get('https://api.github.com/repos/' + match[1] + '/git/ref/tags/v' + p.version);
    const ref = tagged && JSON.parse(tagged).object;
    if (ref?.type === 'commit') meta.gitHead = ref.sha;
    else if (ref?.type === 'tag') { const tag = await get(ref.url); if (tag) meta.gitHead = JSON.parse(tag).object?.sha; }
  }
  if (!/^[a-f0-9]{40}$/i.test(meta.gitHead ?? '')) { console.log('UNRESOLVED COMMIT', key); return; }
  const directory = meta.repository?.directory;
  const names = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md', 'COPYING', 'LICENSE-MIT', 'LICENSE-MIT.txt', 'Readme.md', 'README.md', 'README.markdown', 'README'];
  const candidates = [...(directory ? names.map(n => directory + '/' + n) : []), ...names];
  for (const path of candidates) {
    const url = `https://raw.githubusercontent.com/${match[1]}/${meta.gitHead}/${path}`;
    let text = await get(url);
    if (!text || /<html/i.test(text.slice(0, 200))) continue;
    if (/readme/i.test(path)) {
      const section = text.match(/(?:^|\n)#{1,3}\s*(?:license|copyright)[^\n]*\n([\s\S]*)/i);
      if (!section || !/permission|redistribut|copyright/i.test(section[1])) continue;
      text = section[0].trim();
    }
    const hash = createHash('sha256').update(text).digest('hex');
    writeFileSync(join(output, hash + '.txt'), text);
    manifest[key] = { url, commit: meta.gitHead, file: hash + '.txt', sha256: hash, scope: directory && !path.startsWith(directory + '/') ? 'repository-root' : 'package' };
    console.log('FOUND', key, path);
    return;
  }
  console.log('UNRESOLVED', key);
}
for (let i = 0; i < pending.length; i += 4) {
  await Promise.all(pending.slice(i, i + 4).map(collect));
  writeFileSync(manifestPath, JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 2) + '\n');
}
console.log(`${Object.keys(manifest).length} pinned package sources`);
