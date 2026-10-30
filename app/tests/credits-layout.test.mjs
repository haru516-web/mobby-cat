import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

test('OSS notices belong to the frontmost credits popup rather than the obscured category popup', () => {
  const text = readFileSync(new URL('../src/features/settings/SettingsScreen.tsx', import.meta.url), 'utf8');
  const file = ts.createSourceFile('SettingsScreen.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const owners = [];
  function visit(node, popup = null) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(file) === 'Popup') popup = node.openingElement;
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === 'OssCredits') {
      const visible = popup?.attributes.properties.find(a => a.name?.getText(file) === 'visible');
      owners.push(visible?.initializer?.getText(file));
    }
    ts.forEachChild(node, child => visit(child, popup));
  }
  visit(file);
  assert.deepEqual(owners, ['{!!info}']);
});
