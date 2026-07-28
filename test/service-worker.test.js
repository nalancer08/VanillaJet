const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync, spawnSync } = require('node:child_process');

const Server = require('../framework/server.js');
const Dipper = require('../framework/dipper.js');
const {
  makeTempWorkspace,
  removeWorkspace,
  serverOptions,
  waitForListening,
  boundPort,
  closeServer
} = require('./helpers.js');

const GENERATOR = path.join(__dirname, '..', 'scripts', 'generate_sw.js');

describe('kill-switch publication', () => {
  // The caching service worker was removed in 1.7.0: every build must publish
  // the kill-switch so leftover workers self-destruct on their update check.
  test('publishes the kill-switch at public/sw.js on every build', () => {
    const ws = makeTempWorkspace({
      'config.js':
        "module.exports = { profile: 'qa', settings: { qa: {}, shared: {}, security: {} } };"
    });
    try {
      execFileSync('node', [GENERATOR], { cwd: ws, stdio: 'pipe' });
      const swPath = path.join(ws, 'public', 'sw.js');
      assert.ok(fs.existsSync(swPath), 'kill-switch sw.js must be published');
      const sw = fs.readFileSync(swPath, 'utf8');
      assert.match(sw, /skipWaiting/, 'kill-switch must take over immediately');
      assert.match(sw, /caches\.delete/, 'kill-switch must wipe Cache Storage');
      assert.match(sw, /registration\.unregister/, 'kill-switch must unregister itself');
      assert.ok(!sw.includes("addEventListener('fetch'"), 'kill-switch must not intercept requests');
    } finally {
      removeWorkspace(ws);
    }
  });

  test('the removed enable_service_worker flag still gets the kill-switch, with a warning', () => {
    const ws = makeTempWorkspace({
      'config.js':
        "module.exports = { profile: 'qa', settings: { " +
        "qa: { enable_service_worker: true, service_worker: { cache_prefix: 'testapp' } }, " +
        "shared: { site_name: 'Test' }, security: {} } };"
    });
    try {
      const run = spawnSync('node', [GENERATOR], { cwd: ws, encoding: 'utf8' });
      assert.equal(run.status, 0);
      assert.match(run.stderr, /no longer supported/, 'consumers still setting the flag must be warned');
      const sw = fs.readFileSync(path.join(ws, 'public', 'sw.js'), 'utf8');
      assert.match(sw, /kill-switch/, 'a caching worker must never be generated again');
      assert.ok(!sw.includes("addEventListener('fetch'"), 'kill-switch must not intercept requests');
    } finally {
      removeWorkspace(ws);
    }
  });
});

describe('page teardown snippet', () => {
  // The rendered HTML (no-cache — the one asset a stale worker never poisons)
  // is the page-side healing channel: it must unregister every leftover
  // worker, wipe Cache Storage, and reload once when the page was painted
  // through a worker — never register one.
  test('includeServiceWorker emits the teardown, never a registration', () => {
    for (const options of [{}, { enable_service_worker: true }]) {
      const snippet = new Dipper(options, {}).includeServiceWorker();
      assert.match(snippet, /getRegistrations/, 'must tear down every registration, any scope');
      assert.match(snippet, /unregister/, 'must unregister leftover workers');
      assert.match(snippet, /caches\.delete/, 'must wipe Cache Storage');
      assert.match(snippet, /location\.reload/, 'must heal a page painted through a worker');
      assert.match(snippet, /sessionStorage/, 'the reload must be guarded against loops');
      assert.ok(!snippet.includes('.register('), 'must never register a worker again');
    }
  });
});

describe('service worker serving', () => {
  let server;
  let ws;
  let previousCwd;
  let baseUrl;

  before(async () => {
    ws = makeTempWorkspace({ 'public/sw.js': '/* kill-switch */' });
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

  test('GET /sw.js serves the published kill-switch with root scope, uncached', async () => {
    const res = await fetch(`${baseUrl}/sw.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /javascript/);
    assert.equal(res.headers.get('service-worker-allowed'), '/');
    // Update checks must always see fresh bytes: a cached /sw.js would hide
    // the kill-switch from the very workers it exists to dismantle.
    assert.equal(res.headers.get('cache-control'), 'no-cache');
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
