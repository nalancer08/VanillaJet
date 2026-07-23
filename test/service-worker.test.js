const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const Server = require('../framework/server.js');
const {
  makeTempWorkspace,
  removeWorkspace,
  serverOptions,
  waitForListening,
  boundPort,
  closeServer
} = require('./helpers.js');

const GENERATOR = path.join(__dirname, '..', 'framework', '..', 'scripts', 'generate_sw.js');

const PUBLIC_FIXTURE = {
  'public/styles/app.min.css': 'body{}',
  'public/scripts/vanilla.min.js': 'console.log(1)',
  'public/scripts/core/vanillaJet.min.js': 'console.log(2)'
};

describe('service worker generation', () => {
  test('enabled: writes public/sw.js with cache name and core precache', () => {
    const ws = makeTempWorkspace(Object.assign({}, PUBLIC_FIXTURE, {
      'config.js':
        "module.exports = { profile: 'qa', settings: { " +
        "qa: { enable_service_worker: true, service_worker: { cache_prefix: 'testapp' } }, " +
        "shared: { site_name: 'Test' }, security: {} } };"
    }));
    try {
      execFileSync('node', [GENERATOR], { cwd: ws, stdio: 'pipe' });
      const swPath = path.join(ws, 'public', 'sw.js');
      assert.ok(fs.existsSync(swPath), 'sw.js should be generated');
      const sw = fs.readFileSync(swPath, 'utf8');
      assert.match(sw, /testapp-sw-[a-f0-9]{12}/, 'cache name should be content-pinned');
      assert.match(sw, /\/public\/scripts\/vanilla\.min\.js/);
      assert.match(sw, /\/public\/styles\/app\.min\.css/);
      // Precache must fetch fingerprinted urls, bypassing any HTTP-cached bare path
      // (a stale HTTP-cache hit would pin an outdated bundle into the new SW cache).
      assert.match(sw, /\/public\/scripts\/vanilla\.min\.js\?v=\d+-\d+/, 'precache urls should be fingerprinted');
      assert.match(sw, /cache: 'no-cache'/, 'precache requests should revalidate against the server');
      // The fingerprint is the version pin: matching must be by exact url, or a
      // not-yet-updated worker answers fresh HTML with a previous generation's bundles.
      assert.ok(!sw.includes('ignoreSearch'), 'cache matches must not ignore the ?v fingerprint');
      assert.ok(!sw.includes('__PRECACHE_ASSETS__'), 'no placeholders should remain');
      assert.ok(!sw.includes('__PRECACHE_URLS__'), 'no placeholders should remain');
      assert.ok(!sw.includes('__CACHE_NAME__'), 'no placeholders should remain');
    } finally {
      removeWorkspace(ws);
    }
  });

  test('disabled: publishes the kill-switch at public/sw.js', () => {
    const ws = makeTempWorkspace(Object.assign({}, PUBLIC_FIXTURE, {
      'config.js':
        "module.exports = { profile: 'qa', settings: { qa: {}, shared: {}, security: {} } };"
    }));
    try {
      execFileSync('node', [GENERATOR], { cwd: ws, stdio: 'pipe' });
      const swPath = path.join(ws, 'public', 'sw.js');
      assert.ok(fs.existsSync(swPath), 'kill-switch sw.js must exist when disabled');
      const sw = fs.readFileSync(swPath, 'utf8');
      assert.match(sw, /skipWaiting/, 'kill-switch must take over immediately');
      assert.match(sw, /caches\.delete/, 'kill-switch must wipe Cache Storage');
      assert.match(sw, /registration\.unregister/, 'kill-switch must unregister itself');
      assert.ok(!sw.includes("addEventListener('fetch'"), 'kill-switch must not intercept requests');
    } finally {
      removeWorkspace(ws);
    }
  });
});

describe('service worker serving', () => {
  let server;
  let ws;
  let previousCwd;
  let baseUrl;

  before(async () => {
    ws = makeTempWorkspace({ 'public/sw.js': '/* sw */' });
    previousCwd = process.cwd();
    process.chdir(ws);
    server = new Server(serverOptions(0, { enable_service_worker: true }), []);
    await waitForListening(server);
    baseUrl = `http://127.0.0.1:${boundPort(server)}`;
  });

  after(async () => {
    if (server) await closeServer(server);
    process.chdir(previousCwd);
    removeWorkspace(ws);
  });

  test('GET /sw.js returns the worker with root scope header', async () => {
    const res = await fetch(`${baseUrl}/sw.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /javascript/);
    assert.equal(res.headers.get('service-worker-allowed'), '/');
    assert.match(await res.text(), /sw/);
  });
});

describe('service worker serving with the feature off', () => {
  let server;
  let ws;
  let previousCwd;
  let baseUrl;

  before(async () => {
    ws = makeTempWorkspace({ 'public/sw.js': '/* kill-switch */' });
    previousCwd = process.cwd();
    process.chdir(ws);
    server = new Server(serverOptions(0), []); // flag off
    await waitForListening(server);
    baseUrl = `http://127.0.0.1:${boundPort(server)}`;
  });

  after(async () => {
    if (server) await closeServer(server);
    process.chdir(previousCwd);
    removeWorkspace(ws);
  });

  // The flag governs GENERATION, not serving: with the feature off the build
  // publishes the kill-switch at public/sw.js and installed workers must be
  // able to fetch it to self-destruct. Gating the route on the flag would
  // hide the kill-switch from the very workers it dismantles.
  test('GET /sw.js still serves the published file', async () => {
    const res = await fetch(`${baseUrl}/sw.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /javascript/);
    assert.match(await res.text(), /kill-switch/);
  });
});

describe('service worker serving with no published file', () => {
  let server;
  let ws;
  let previousCwd;
  let baseUrl;

  before(async () => {
    ws = makeTempWorkspace({});
    previousCwd = process.cwd();
    process.chdir(ws);
    server = new Server(serverOptions(0), []);
    await waitForListening(server);
    baseUrl = `http://127.0.0.1:${boundPort(server)}`;
  });

  after(async () => {
    if (server) await closeServer(server);
    process.chdir(previousCwd);
    removeWorkspace(ws);
  });

  test('GET /sw.js is 404 when public/sw.js does not exist', async () => {
    const res = await fetch(`${baseUrl}/sw.js`);
    await res.arrayBuffer();
    assert.equal(res.status, 404);
  });
});
