const { test } = require('node:test');
const assert = require('node:assert/strict');

const Dipper = require('../framework/dipper.js');
const { makeTempWorkspace, removeWorkspace } = require('./helpers.js');

// Dipper reads vanillaJet.package.json from cwd; when absent it degrades gracefully.
function makeDipper() {
  return new Dipper({}, { site_name: 'Test', description: 'desc' });
}

// Core dependencies MUST register fingerprinted: bare urls fall under the
// `static_cache_max_age` bucket and clients keep a stale domain/api/utils for
// up to that TTL while the fingerprinted view bundle updates instantly —
// mismatched generations in production ("isEdoMexAddress is not a function").
test('core dependencies register fingerprinted; externals and missing files stay bare', () => {
  const ws = makeTempWorkspace({
    'vanillaJet.package.json': JSON.stringify({
      coreDependencies: {
        domain: '/public/scripts/coreLib/domain.min.js',
        cdn: 'https://cdn.example.com/lib.min.js',
        ghost: '/public/scripts/coreLib/missing.min.js'
      }
    }),
    'public/scripts/coreLib/domain.min.js': 'Domain = {};'
  });
  const previousCwd = process.cwd();
  process.chdir(ws);
  try {
    const dipper = makeDipper();
    assert.match(
      dipper.scripts['domain'].resource,
      /^\/public\/scripts\/coreLib\/domain\.min\.js\?v=\d+-\d+$/,
      'local core deps must carry the ?v=size-mtime fingerprint'
    );
    assert.equal(dipper.scripts['cdn'].resource, 'https://cdn.example.com/lib.min.js');
    assert.equal(dipper.scripts['ghost'].resource, '/public/scripts/coreLib/missing.min.js');
  } finally {
    process.chdir(previousCwd);
    removeWorkspace(ws);
  }
});

test('urlTo: normalizes local routes and leaves absolute URLs untouched', () => {
  const dipper = makeDipper();
  assert.equal(dipper.urlTo('foo/bar'), '/foo/bar');
  assert.equal(dipper.urlTo('/already'), '/already');
  assert.equal(dipper.urlTo('https://cdn.example.com/a.js'), 'https://cdn.example.com/a.js');
  assert.equal(dipper.urlTo('//cdn.example.com/a.js'), '//cdn.example.com/a.js');
});

test('versionedUrl: fingerprints existing local files and passes through externals', () => {
  const dipper = makeDipper();
  // package.json exists at the repo root (cwd during `npm test`).
  const versioned = dipper.versionedUrl('package.json');
  assert.match(versioned, /^\/package\.json\?v=\d+-\d+$/);
  assert.equal(
    dipper.versionedUrl('https://cdn.example.com/a.js'),
    'https://cdn.example.com/a.js'
  );
  // Non-existent local file keeps legacy behavior (no version param).
  assert.equal(dipper.versionedUrl('does/not/exist.js'), '/does/not/exist.js');
});

test('registerScript + includeScript: renders a script tag, with defer when requested', () => {
  const dipper = makeDipper();
  dipper.registerScript('plain', '/public/scripts/plain.js');
  assert.match(dipper.includeScript('plain'), /<script src="\/public\/scripts\/plain\.js"><\/script>/);

  // signature: registerScript(name, url, requires, cdn, async, defer, ...)
  dipper.registerScript('deferred', '/public/scripts/deferred.js', undefined, false, false, true);
  assert.match(dipper.includeScript('deferred'), / defer/);
});

test('registerStyle + includeStyle: renders a stylesheet link', () => {
  const dipper = makeDipper();
  dipper.registerStyle('main', '/public/styles/app.min.css');
  const tag = dipper.includeStyle('main');
  assert.match(tag, /rel="stylesheet"/);
  assert.match(tag, /href="\/public\/styles\/app\.min\.css"/);
});

test('includeServiceWorker: emits the teardown snippet, never a registration', () => {
  // The caching worker was removed in 1.7.0: the include heals leftover
  // workers regardless of options (full assertions in service-worker.test.js).
  const tag = new Dipper({}, {}).includeServiceWorker();
  assert.match(tag, /getRegistrations/);
  assert.match(tag, /unregister/);
  assert.ok(!tag.includes(".register("), 'must never register a worker again');
});

test('enqueue/dequeue: dependencies resolve and clear correctly', () => {
  const dipper = makeDipper();
  dipper.registerScript('dep', '/dep.js');
  dipper.registerScript('main', '/main.js', ['dep']);

  dipper.enqueueScript('main');
  const enqueued = Object.keys(dipper.enqueued_scripts);
  assert.ok(enqueued.includes('main'), 'main should be enqueued');
  assert.ok(enqueued.includes('dep'), 'dependency should be enqueued transitively');

  // Dequeue with dependencies flag clears both.
  dipper.dequeueScript('main', true);
  const remaining = Object.keys(dipper.enqueued_scripts);
  assert.ok(!remaining.includes('main'));
  assert.ok(!remaining.includes('dep'));
});
