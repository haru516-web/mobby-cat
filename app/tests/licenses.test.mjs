import test from 'node:test';
import assert from 'node:assert/strict';
import { assemble, collectPackage } from '../../tools/generate-oss-notices.mjs';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
test('notices retain package identities and copyrights and deduplicate identical bodies', () => {
  const document = { source: 'LICENSE', key: 'mit', text: 'Permission and conditions', copyrights: ['Copyright A'] };
  const data = assemble([{ name: 'a', version: '1', license: 'MIT', documents: [document] }, { name: 'b', version: '2', license: 'MIT', documents: [{ ...document, copyrights: ['Copyright B'] }] }]);
  assert.equal(data.packages.length, 2); assert.equal(data.texts.length, 1);
  assert.deepEqual(data.packages[1].copyrights, ['Copyright B']);
});
test('upstream supplemental notices match pinned commit sources and integrity hashes', () => {
  const base = new URL('../../tools/oss-upstream/', import.meta.url);
  const sources = JSON.parse(readFileSync(new URL('sources.json', base)));
  assert.ok(Object.keys(sources).length > 30);
  for (const source of Object.values(sources)) {
    assert.ok(source.url.includes('/' + source.commit + '/'));
    assert.match(source.commit, /^[a-f0-9]{40}$/);
    assert.equal(createHash('sha256').update(readFileSync(new URL(source.file, base))).digest('hex'), source.sha256);
  }
});
test('generated notices include font OFL text and every collected package root document', () => {
  const data = JSON.parse(readFileSync(new URL('../src/data/ossNotices.json', import.meta.url)));
  const font = collectPackage(new URL('../node_modules/@expo-google-fonts/m-plus-rounded-1c/', import.meta.url));
  const entry = data.packages.find(p => p.name === font.name && p.version === font.version);
  for (const doc of font.documents) {
    assert.ok(entry.documents.some(d => d.id === doc.key));
    assert.ok(data.texts.some(t => t.id === doc.key && t.text.replace(/\s+/g, ' ') === doc.text.replace(/\s+/g, ' ')));
  }
  assert.ok(data.texts.some(t => /SIL OPEN FONT LICENSE/i.test(t.text)));
});
