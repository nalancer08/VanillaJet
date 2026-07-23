/**
 * VanillaJet service worker template.
 *
 * This file is NOT used as-is. The build (scripts/generate_sw.js) replaces the
 * __PLACEHOLDERS__ below with values derived from the compiled assets and the
 * consumer config, and writes the result to public/sw.js.
 *
 * Strategy: cache-first for a pinned set of local bundles/styles/plugins and an
 * on-demand cache for prefixes (animations, images). The cache name is pinned to
 * a content hash of the precached assets, so a rebuild that changes any asset
 * produces a new cache and activate() purges the stale ones.
 *
 * Matching is by EXACT url, fingerprint included. VanillaJet fingerprints asset
 * URLs (`?v=size-mtime`), so the query string IS the version pin: a fresh page
 * that references new fingerprints must never be answered with a previous
 * generation's bundle. Ignoring the query here (as earlier versions did) breaks
 * that pin — after a deploy, a client whose worker hasn't updated yet serves its
 * frozen bundles against the new HTML and the app boots with mismatched
 * document/assets (missing templates, undefined views). With exact matching that
 * client simply misses its cache and falls through to the network: the SW update
 * lag costs bandwidth, never correctness.
 *
 * Precaching fetches the FINGERPRINTED urls (PRECACHE_URLS) with cache: 'no-cache'.
 * Both guards exist so install never reads a stale copy from the browser's HTTP
 * cache: bare asset paths may sit there for `static_cache_max_age` seconds, and a
 * precache that goes through it would pin an outdated bundle into a brand-new
 * cache — making every deploy invisible until a hard reload or header expiry.
 */

const CACHE_NAME = '__CACHE_NAME__';
const CACHE_PREFIX = '__CACHE_PREFIX__';
const PRECACHE_ASSETS = __PRECACHE_ASSETS__;
const PRECACHE_URLS = __PRECACHE_URLS__;
const ON_DEMAND_PREFIXES = __ON_DEMAND_PREFIXES__;

function isCacheable(pathname) {
	return (
		PRECACHE_ASSETS.includes(pathname) ||
		ON_DEMAND_PREFIXES.some((prefix) => pathname.startsWith(prefix))
	);
}

globalThis.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) =>
			Promise.allSettled(
				PRECACHE_URLS.map((asset) => cache.add(new Request(asset, { cache: 'no-cache' })))
			).then((results) => {
				results.forEach((result, i) => {
					if (result.status === 'rejected') {
						console.error('SW precache failed: ' + PRECACHE_URLS[i], result.reason);
					}
				});
			})
		)
	);
	event.waitUntil(globalThis.skipWaiting());
});

globalThis.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(
				keys
					.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
					.map((k) => caches.delete(k))
			)
		)
	);
	event.waitUntil(globalThis.clients.claim());
});

globalThis.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== globalThis.location.origin || !isCacheable(url.pathname)) return;

	// Cache-first on the EXACT url: a hit means the same fingerprint the page
	// asked for, so it never needs revalidation — skip the network entirely to
	// save bandwidth on slow links. A different fingerprint is a different url:
	// it misses and goes to the network (correct by construction after deploys).
	event.respondWith(
		caches.open(CACHE_NAME).then((cache) =>
			cache.match(request).then((cached) => {
				if (cached) return cached;

				return fetch(request).then((response) => {
					// waitUntil keeps the SW alive until the write finishes, so the asset
					// is actually cached even if the SW is terminated right after.
					if (response.ok) event.waitUntil(cache.put(request, response.clone()));
					return response;
				});
			})
		)
	);
});
