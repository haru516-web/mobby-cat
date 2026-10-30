import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

export function runtimeFingerprint(root) {
  const files = ['app/package-lock.json', 'app/App.tsx', 'app/index.ts'];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry.name)) files.push(relative(root, path).replaceAll('\\', '/'));
    }
  }
  walk(join(root, 'app/src'));
  const hash = createHash('sha256');
  for (const file of files.sort()) hash.update(file).update('\0').update(readFileSync(join(root, file), 'utf8').replace(/\r\n/g, '\n')).update('\0');
  return hash.digest('hex');
}
