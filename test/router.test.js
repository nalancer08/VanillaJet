const { test } = require('node:test');
const assert = require('node:assert/strict');

const Router = require('../framework/router.js');

// Router only needs `server.options` for the precompressed flag.
function makeRouter() {
  return new Router({ options: { enable_precompressed_negotiation: false } });
}

test('routeToRegExp: named parameter captures the segment', () => {
  const router = makeRouter();
  const re = router.routeToRegExp('/users/:id');
  assert.ok(re.test('/users/123'));
  assert.equal('/users/abc'.match(re)[1], 'abc');
  assert.ok(!re.test('/users'));
  assert.ok(!re.test('/users/123/edit'));
});

test('routeToRegExp: optional segment matches with and without it', () => {
  const router = makeRouter();
  const re = router.routeToRegExp('/items(/:id)');
  assert.ok(re.test('/items'));
  assert.ok(re.test('/items/123'));
  assert.ok(!re.test('/items/123/extra'));
});

test('routeToRegExp: splat matches any number of segments', () => {
  const router = makeRouter();
  const re = router.routeToRegExp('/files/*path');
  assert.ok(re.test('/files/a'));
  assert.ok(re.test('/files/a/b/c.txt'));
});

test('routeToRegExp: tolerates a trailing query string', () => {
  const router = makeRouter();
  const re = router.routeToRegExp('/search');
  assert.ok(re.test('/search'));
  assert.ok(re.test('/search?q=test'));
});

test('isProtectedFile: blocks framework/external/node_modules and top-level files', () => {
  const router = makeRouter();
  assert.equal(router.isProtectedFile('/framework/server.js'), true);
  assert.equal(router.isProtectedFile('/node_modules/x/index.js'), true);
  assert.equal(router.isProtectedFile('/external/lib.js'), true);
  assert.equal(router.isProtectedFile('/favicon.ico'), true); // first-level file
  assert.equal(router.isProtectedFile('/public/scripts/vanilla.min.js'), false);
});

test('buildStaticHeaders: immutable for ?v=, max-age when configured, else no-cache', () => {
  const meta = { size: 10, etag: 'W/"x"', lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT' };
  const plain = makeRouter();
  assert.match(plain.buildStaticHeaders({}, [], '', meta, true)['Cache-Control'], /immutable/);
  assert.match(plain.buildStaticHeaders({}, [], '', meta, false)['Cache-Control'], /no-cache/);

  const cached = new Router({ options: { static_cache_max_age: 3600 } });
  assert.match(cached.buildStaticHeaders({}, [], '', meta, false)['Cache-Control'], /max-age=3600/);
  // Versioned still wins over max-age.
  assert.match(cached.buildStaticHeaders({}, [], '', meta, true)['Cache-Control'], /immutable/);
});

test('mimes: serves common web fonts and icons', () => {
  const router = makeRouter();
  assert.equal(router.mimes['woff2'], 'font/woff2');
  assert.equal(router.mimes['woff'], 'font/woff');
  assert.ok(router.mimes['eot']);
  assert.ok(router.mimes['ico']);
});

test('supportsEncoding: honors q-values and array shape', () => {
  const router = makeRouter();
  assert.equal(router.supportsEncoding(['gzip'], 'gzip'), true);
  assert.equal(router.supportsEncoding(['gzip;q=1.0'], 'gzip'), true);
  assert.equal(router.supportsEncoding(['gzip;q=0'], 'gzip'), false);
  assert.equal(router.supportsEncoding(['br'], 'gzip'), false);
  assert.equal(router.supportsEncoding('not-an-array', 'gzip'), false);
});
