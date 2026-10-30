// Disposable localhost-only UI fixture. No production API or real purchase is used.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { encounterDayKey } from '../app/src/core/dates.ts';

const day = encounterDayKey(new Date());
const catalog = readFileSync(new URL('../app/src/data/catalog.ts', import.meta.url), 'utf8');
const ids = [...catalog.matchAll(/id: '([^']+)'/g)].slice(0, 6).map(m => m[1]);
const state = {
  owned: { [ids[0]]: { count: 1, firstDay: day, firstReason: '相棒' } },
  starterChosen: true, tutorialDone: true, installDay: '2026-01-01', installLock: false,
  days: { [day]: { candidates: ids, reasons: {}, baseCount: 3, matatabiUsed: 0, extraPicks: [], opened: ids.slice(0, 3) } },
};
const credentials = { userId: 'local-fixture', secret: 'local-test-secret-not-a-real-account-00000000' };
const script = `<script>if(!localStorage.getItem('prelaunch-fixture-v1')){localStorage.setItem('mobby-cat/state/v1',${JSON.stringify(JSON.stringify(state))});localStorage.setItem('nyakomobby.account',${JSON.stringify(JSON.stringify(credentials))});localStorage.setItem('prelaunch-fixture-v1','1');}</script>`;

const api = createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:8095');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  response.setHeader('Content-Type', 'application/json');
  if (request.method === 'OPTIONS') { response.end(); return; }
  const data = request.url === '/time' ? { now: Date.now() }
    : request.url === '/profile' ? { appleLinked: false, ageGroup: 'adult' }
    : request.url === '/wallet' ? { tickets: 0, matatabi: 0 }
    : request.url === '/plan' ? { plan: 'none' }
    : request.url === '/account/transfer-code' ? { code: 'LOCAL-UI-FIXTURE-NOT-A-REAL-TRANSFER-CODE', expiresAt: Date.now() + 30 * 86400000 }
    : {};
  response.end(JSON.stringify(data));
});
const web = createServer(async (request, response) => {
  try {
    const upstream = await fetch('http://127.0.0.1:8094' + request.url);
    const type = upstream.headers.get('content-type') ?? 'application/octet-stream';
    response.statusCode = upstream.status;
    response.setHeader('Content-Type', type);
    // Never permit this fixture to contact a remote service or ask for device permissions.
    response.setHeader('Content-Security-Policy', "connect-src 'self' http://127.0.0.1:8788 http://127.0.0.1:8094 ws://127.0.0.1:8094; object-src 'none'");
    response.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    if (type.includes('text/html')) response.end((await upstream.text()).replace('<head>', '<head>' + script));
    else response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch { response.statusCode = 502; response.end('Local Metro unavailable'); }
});
api.listen(8788, '127.0.0.1');
web.listen(8095, '127.0.0.1', () => console.log('Disposable fixture: http://127.0.0.1:8095; local API :8788'));
function stop() { api.close(); web.close(); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
