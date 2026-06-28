const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const Server = require('../framework/server.js');
const {
  makeTempWorkspace,
  removeWorkspace,
  serverOptions,
  waitForListening,
  boundPort,
  closeServer
} = require('./helpers.js');

// A minimal endpoint. Handlers must return truthy to mark the request as handled.
class PingEndpoint {
  constructor(router) {
    this.name = 'PingEndpoint';
    router.addRoute('get', '/ping', 'PingEndpoint.ping');
    router.addRoute('get', '/home', 'PingEndpoint.home');
  }
  ping(request, response) {
    response.setBody('pong');
    response.respond();
    return true;
  }
  home(request, response) {
    response.render(request, 'home.html');
    return true;
  }
}

let server;
let workspace;
let previousCwd;
let baseUrl;

before(async () => {
  workspace = makeTempWorkspace({
    'public/scripts/test.min.js': 'console.log("static asset");',
    'public/pages/home.html': '<!doctype html><title>home</title><h1>HOME_OK</h1>'
  });
  previousCwd = process.cwd();
  process.chdir(workspace);

  server = new Server(serverOptions(0), [PingEndpoint]);
  await waitForListening(server);
  baseUrl = `http://127.0.0.1:${boundPort(server)}`;
});

after(async () => {
  if (server) {
    await closeServer(server);
  }
  process.chdir(previousCwd);
  removeWorkspace(workspace);
});

test('dynamic route returns the endpoint body', async () => {
  const res = await fetch(`${baseUrl}/ping`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'pong');
});

test('render() streams a precompiled page', async () => {
  const res = await fetch(`${baseUrl}/home`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /text\/html/);
  assert.match(await res.text(), /HOME_OK/);
});

test('static asset is served with caching validators', async () => {
  const res = await fetch(`${baseUrl}/public/scripts/test.min.js`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /javascript/);
  assert.ok(res.headers.get('etag'), 'ETag should be present');
  assert.ok(res.headers.get('cache-control'), 'Cache-Control should be present');
  assert.ok(res.headers.get('last-modified'), 'Last-Modified should be present');
});

test('conditional request returns 304 when ETag matches', async () => {
  const first = await fetch(`${baseUrl}/public/scripts/test.min.js`);
  const etag = first.headers.get('etag');
  await first.arrayBuffer(); // drain
  assert.ok(etag);

  const second = await fetch(`${baseUrl}/public/scripts/test.min.js`, {
    headers: { 'If-None-Match': etag }
  });
  assert.equal(second.status, 304);
});

test('missing static file returns 404', async () => {
  const res = await fetch(`${baseUrl}/public/scripts/missing.js`);
  await res.arrayBuffer();
  assert.equal(res.status, 404);
});

test('protected path returns 404', async () => {
  const res = await fetch(`${baseUrl}/framework/server.js`);
  await res.arrayBuffer();
  assert.equal(res.status, 404);
});
