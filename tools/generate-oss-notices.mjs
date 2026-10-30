import { readFileSync, readdirSync, realpathSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export function collectPackage(path) {
  if (path instanceof URL) path = fileURLToPath(path);
  const pkg = JSON.parse(readFileSync(join(path, 'package.json'), 'utf8'));
  const files = readdirSync(path).filter(name => /^(licen[cs]e|unlicense|copying|notice|copyright)([._-].*)?$/i.test(name)).sort();
  const documents = files.flatMap(name => {
    try {
      const text = readFileSync(join(path, name), 'utf8').replace(/\r\n/g, '\n').trim();
      if (!text || text.includes('\0')) return [];
      const copyrights = text.split('\n').filter(line => /^\s*(?:\*|#|\/\*)?\s*(?:copyright\s*(?:\(c\)\s*)?\d{4}|©)/i.test(line));
      // MIT/BSD等の本文は表記を変えずに残す。著作権行だけ各パッケージへ分ける。
      const body = text.split('\n').filter(line => !copyrights.includes(line)).join('\n').trim();
      const key = createHash('sha256').update(body.replace(/\s+/g, ' ')).digest('hex');
      return [{ source: name, text: body, copyrights, key }];
    } catch { return []; } // LICENSEという名のディレクトリ等
  });
  const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), 'oss-upstream');
  if (!documents.length && existsSync(join(sourceRoot, 'sources.json'))) {
    const sources = JSON.parse(readFileSync(join(sourceRoot, 'sources.json'), 'utf8'));
    const source = sources[`${pkg.name}@${pkg.version}`];
    if (source) {
      const text = readFileSync(join(sourceRoot, source.file), 'utf8');
      if (createHash('sha256').update(text).digest('hex') !== source.sha256) throw Error('Upstream notice hash mismatch');
      documents.push({ source: source.url, text, copyrights: text.split('\n').filter(line => /copyright|©/i.test(line)), key: createHash('sha256').update(text.replace(/\s+/g, ' ')).digest('hex') });
    }
  }
  return { name: pkg.name, version: pkg.version, license: typeof pkg.license === 'string' ? pkg.license : JSON.stringify(pkg.license ?? 'UNKNOWN'), documents };
}

export function assemble(packages) {
  const texts = new Map(), entries = new Map();
  for (const p of packages) {
    const id = `${p.name}@${p.version}`;
    const entry = entries.get(id) ?? { name: p.name, version: p.version, license: p.license, copyrights: [], documents: [] };
    for (const d of p.documents) {
      if (!texts.has(d.key)) texts.set(d.key, { id: d.key, text: d.text });
      entry.copyrights.push(...d.copyrights);
      entry.documents.push({ source: d.source, id: d.key });
    }
    entry.copyrights = [...new Set(entry.copyrights)];
    entry.documents = [...new Map(entry.documents.map(d => [d.source + d.id, d])).values()];
    entries.set(id, entry);
  }
  return {
    scope: 'npm ls --omit=dev --all --json --long（開発・ビルド用の推移依存を含む機械収集。配布範囲・義務の法的判断ではありません）',
    packages: [...entries.values()].sort((a, b) => (a.name + a.version).localeCompare(b.name + b.version, 'en')),
    texts: [...texts.values()].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function generate(root = resolve(dirname(fileURLToPath(import.meta.url)), '..')) {
  const app = join(root, 'app');
  const npmCli = process.env.npm_execpath ?? join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  const tree = JSON.parse(execFileSync(process.execPath, [npmCli, 'ls', '--omit=dev', '--all', '--json', '--long'], { cwd: app, maxBuffer: 30 * 1024 * 1024, encoding: 'utf8' }));
  const paths = new Set();
  const visit = node => { if (node.path && node !== tree && existsSync(join(node.path, 'package.json'))) paths.add(realpathSync(node.path)); for (const child of Object.values(node.dependencies ?? {})) visit(child); };
  visit(tree);
  return assemble([...paths].sort().map(collectPackage));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const output = resolve(dirname(fileURLToPath(import.meta.url)), '../app/src/data/ossNotices.json');
  const text = JSON.stringify(generate(), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (readFileSync(output, 'utf8') !== text) throw Error('OSS notices are stale; run node tools/generate-oss-notices.mjs');
  } else writeFileSync(output, text);
  const data = JSON.parse(text);
  console.log(`${data.packages.length} package versions, ${data.texts.length} distinct license/notice bodies; ${data.packages.filter(p => !p.documents.length).length} without root license files`);
}
