// Inspect Metro's production dependency graph without serializing a bundle or creating an app build.
const { createRequire } = require('node:module');
const { resolve, dirname, relative, join } = require('node:path');
const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const root = resolve(__dirname, '..');
const app = join(root, 'app');
const appRequire = createRequire(join(app, 'package.json'));
const Metro = appRequire('metro');
const { getDefaultConfig } = appRequire('expo/metro-config');

(async () => {
  process.env.NODE_ENV = 'production';
  process.env.EXPO_OFFLINE = '1';
  const config = await Metro.loadConfig({ cwd: app }, { ...getDefaultConfig(app), maxWorkers: 2 });
  const results = {};
  for (const platform of ['ios', 'android']) {
    const graph = await Metro.buildGraph(config, { entries: [join(app, 'index.ts')], platform, dev: false, minify: false });
    const packages = new Map();
    for (const file of graph.dependencies.keys()) {
      let dir = dirname(file);
      while (dir.startsWith(app) && dir !== app) {
        const manifest = join(dir, 'package.json');
        if (existsSync(manifest)) {
          const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
          if (pkg.name && pkg.version) packages.set(pkg.name + '@' + pkg.version, { name: pkg.name, version: pkg.version, path: relative(root, dir).replaceAll('\\', '/') });
          break;
        }
        dir = dirname(dir);
      }
    }
    results[platform] = { moduleCount: graph.dependencies.size, packages: [...packages.values()].sort((a, b) => a.name.localeCompare(b.name)) };
    console.log(platform, results[platform].moduleCount, 'modules,', packages.size, 'package versions');
  }
  const { runtimeFingerprint } = await import('./runtime-inputs.mjs');
  writeFileSync(join(root, 'docs/audit/runtime-graph-2026-10-30.json'), JSON.stringify({ scope: 'Metro.buildGraph; dev=false; no bundle serialization, native build or service request', inputHash: runtimeFingerprint(root), platforms: results }, null, 2) + '\n');
})().catch(error => { console.error(error); process.exitCode = 1; });
