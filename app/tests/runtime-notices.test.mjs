import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runtimeFingerprint } from '../../tools/runtime-inputs.mjs';

test('production mobile dependency graphs are current and every reachable package has a notice', () => {
  const graph = JSON.parse(readFileSync(new URL('../../docs/audit/runtime-graph-2026-10-30.json', import.meta.url)));
  const notices = JSON.parse(readFileSync(new URL('../src/data/ossNotices.json', import.meta.url)));
  assert.equal(graph.inputHash, runtimeFingerprint(fileURLToPath(new URL('../../', import.meta.url))), 'Run node tools/audit-runtime-graph.cjs after changing app sources or dependencies');
  for (const platform of ['ios', 'android']) {
    assert.ok(graph.platforms[platform].moduleCount > 100);
    for (const p of graph.platforms[platform].packages) {
      assert.ok(notices.packages.find(n => n.name === p.name && n.version === p.version)?.documents.length, `${platform}: missing ${p.name}@${p.version}`);
      assert.equal(['zod', 'deepmerge', '@expo/cli', '@expo/config'].includes(p.name), false, `${platform}: advisory dependency ${p.name} became reachable`);
    }
  }
});
