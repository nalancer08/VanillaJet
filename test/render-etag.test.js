const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const zlib = require('node:zlib');

const Server = require('../framework/server.js');
const {
  makeTempWorkspace,
  removeWorkspace,
  serverOptions,
  waitForListening,
  boundPort,
  closeServer
} = require('./helpers.js');

const PAGE_V1 = '<!doctype html><title>v1</title><h1>GENERATION_ONE</h1>';
// Longer on purpose: a rewrite must change the (size, mtime) cache key even if
// both writes land inside the same millisecond.
const PAGE_V2 = '<!doctype html><title>v2</title><h1>GENERATION_TWO — redeployed</h1>';

class RenderEndpoint {
  constructor(router) {
    this.name = 'RenderEndpoint';
    router.addRoute('get', '/home', 'RenderEndpoint.home');
  }
  home(request, response) {
    response.render(request, 'home.html');
    return true;
  }
}

// Raw HTTP client: full control of request headers (undici's fetch forces its
// own Accept-Encoding) and un-decompressed response bodies.
function rawGet(baseUrl, requestPath, headers) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${baseUrl}${requestPath}`, { method: 'GET', headers: headers || {} }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

describe('rendered page revalidation (identity)', () => {
  let server;
  let ws;
  let previousCwd;
  let baseUrl;
  let pagePath;

  before(async () => {
    ws = makeTempWorkspace({ 'public/pages/home.html': PAGE_V1 });
    pagePath = path.join(ws, 'public', 'pages', 'home.html');
    previousCwd = process.cwd();
    process.chdir(ws);
    server = new Server(serverOptions(0), [RenderEndpoint]);
    await waitForListening(server);
    baseUrl = `http://127.0.0.1:${boundPort(server)}`;
  });

  after(async () => {
    if (server) await closeServer(server);
    process.chdir(previousCwd);
    removeWorkspace(ws);
  });

  test('200 carries a strong content-hash ETag and stays no-cache', async () => {
    const res = await rawGet(baseUrl, '/home');
    assert.equal(res.status, 200);
    assert.match(res.headers['etag'] || '', /^"[0-9a-f]{40}"$/, 'strong sha1 ETag expected');
    assert.equal(res.headers['cache-control'], 'no-cache, must-revalidate');
    assert.match(res.body.toString(), /GENERATION_ONE/);
  });

  test('matching If-None-Match answers 304 with no body and no entity headers', async () => {
    const first = await rawGet(baseUrl, '/home');
    const etag = first.headers['etag'];
    const res = await rawGet(baseUrl, '/home', { 'if-none-match': etag });
    assert.equal(res.status, 304);
    assert.equal(res.body.length, 0, '304 must not carry a body');
    assert.equal(res.headers['etag'], etag, '304 must echo the validator');
    assert.equal(res.headers['cache-control'], 'no-cache, must-revalidate');
    assert.equal(res.headers['content-type'], undefined);
    assert.equal(res.headers['content-encoding'], undefined);
  });

  test('If-None-Match lists and W/ prefixes match weakly; * matches anything', async () => {
    const first = await rawGet(baseUrl, '/home');
    const etag = first.headers['etag'];
    const list = await rawGet(baseUrl, '/home', { 'if-none-match': `"deadbeef", W/${etag}` });
    assert.equal(list.status, 304);
    const star = await rawGet(baseUrl, '/home', { 'if-none-match': '*' });
    assert.equal(star.status, 304);
  });

  test('a stale validator gets the full page', async () => {
    const res = await rawGet(baseUrl, '/home', { 'if-none-match': '"0000000000000000000000000000000000000000"' });
    assert.equal(res.status, 200);
    assert.match(res.body.toString(), /GENERATION_ONE/);
  });

  // The anti-zombie property: the moment the content changes, an old validator
  // MUST get the new bytes. A 304 is only possible for byte-identical content.
  test('content change invalidates old validators immediately', async () => {
    const first = await rawGet(baseUrl, '/home');
    const oldEtag = first.headers['etag'];

    fs.writeFileSync(pagePath, PAGE_V2);
    const redeployed = await rawGet(baseUrl, '/home', { 'if-none-match': oldEtag });
    assert.equal(redeployed.status, 200, 'old validator must never 304 against new content');
    assert.match(redeployed.body.toString(), /GENERATION_TWO/);
    const newEtag = redeployed.headers['etag'];
    assert.notEqual(newEtag, oldEtag);

    const revalidated = await rawGet(baseUrl, '/home', { 'if-none-match': newEtag });
    assert.equal(revalidated.status, 304);
  });

  // Content-hash bonus: a touch/rebuild that produces identical bytes keeps
  // the same ETag, so clients are not forced into a pointless full download.
  test('identical content keeps the same ETag across mtime changes', async () => {
    const before1 = await rawGet(baseUrl, '/home');
    const etag = before1.headers['etag'];
    const later = new Date(Date.now() + 5000);
    fs.utimesSync(pagePath, later, later);
    const res = await rawGet(baseUrl, '/home', { 'if-none-match': etag });
    assert.equal(res.status, 304);
    assert.equal(res.headers['etag'], etag);
  });
});

describe('rendered page revalidation (encoding negotiation)', () => {
  let server;
  let ws;
  let previousCwd;
  let baseUrl;
  const brotliBytes = zlib.brotliCompressSync(Buffer.from(PAGE_V1));
  const gzipBytes = zlib.gzipSync(Buffer.from(PAGE_V1));

  before(async () => {
    ws = makeTempWorkspace({
      'public/pages/home.html': PAGE_V1,
      'public/pages/home.html.br': brotliBytes,
      'public/pages/home.html.gz': gzipBytes
    });
    previousCwd = process.cwd();
    process.chdir(ws);
    server = new Server(serverOptions(0, { enable_precompressed_negotiation: true }), [RenderEndpoint]);
    await waitForListening(server);
    baseUrl = `http://127.0.0.1:${boundPort(server)}`;
  });

  after(async () => {
    if (server) await closeServer(server);
    process.chdir(previousCwd);
    removeWorkspace(ws);
  });

  test('each representation gets its own ETag (br / gzip / identity)', async () => {
    const br = await rawGet(baseUrl, '/home', { 'accept-encoding': 'br' });
    assert.equal(br.status, 200);
    assert.equal(br.headers['content-encoding'], 'br');
    assert.equal(br.headers['vary'], 'Accept-Encoding');
    assert.ok(br.body.equals(brotliBytes), 'br representation streams the .br bytes');

    const gz = await rawGet(baseUrl, '/home', { 'accept-encoding': 'gzip' });
    assert.equal(gz.headers['content-encoding'], 'gzip');
    assert.ok(gz.body.equals(gzipBytes));

    const identity = await rawGet(baseUrl, '/home');
    assert.equal(identity.headers['content-encoding'], undefined);
    assert.equal(identity.body.toString(), PAGE_V1);

    const tags = new Set([br.headers['etag'], gz.headers['etag'], identity.headers['etag']]);
    assert.equal(tags.size, 3, 'every representation must carry a distinct validator');
  });

  test('revalidation is per representation: same encoding 304s', async () => {
    const br = await rawGet(baseUrl, '/home', { 'accept-encoding': 'br' });
    const res = await rawGet(baseUrl, '/home', { 'accept-encoding': 'br', 'if-none-match': br.headers['etag'] });
    assert.equal(res.status, 304);
    assert.equal(res.body.length, 0);
    assert.equal(res.headers['etag'], br.headers['etag']);
    assert.equal(res.headers['vary'], 'Accept-Encoding');
    assert.equal(res.headers['content-encoding'], undefined);
  });

  test('an encoding switch never false-matches another representation', async () => {
    const br = await rawGet(baseUrl, '/home', { 'accept-encoding': 'br' });
    // Same validator, but the client now only accepts identity: full 200.
    const res = await rawGet(baseUrl, '/home', { 'if-none-match': br.headers['etag'] });
    assert.equal(res.status, 200);
    assert.equal(res.body.toString(), PAGE_V1);
    assert.notEqual(res.headers['etag'], br.headers['etag']);
  });
});
