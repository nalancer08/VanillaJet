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
 * produces a new cache and activate() purges the stale ones. Because VanillaJet
 * fingerprints asset URLs (`?v=size-mtime`), matches use { ignoreSearch: true }
 * so a cache entry keeps serving across version query changes within the cache.
 */

const CACHE_NAME = '__CACHE_NAME__';
const CACHE_PREFIX = '__CACHE_PREFIX__';
const PRECACHE_ASSETS = __PRECACHE_ASSETS__;
const ON_DEMAND_PREFIXES = __ON_DEMAND_PREFIXES__;

const MATCH_OPTIONS = { ignoreSearch: true };

function isCacheable(pathname) {
	return (
		PRECACHE_ASSETS.includes(pathname) ||
		ON_DEMAND_PREFIXES.some((prefix) => pathname.startsWith(prefix))
	);
}

globalThis.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) =>
			Promise.allSettled(PRECACHE_ASSETS.map((asset) => cache.add(asset))).then((results) => {
				results.forEach((result, i) => {
					if (result.status === 'rejected') {
						console.error('SW precache failed: ' + PRECACHE_ASSETS[i], result.reason);
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

	// Cache-first: assets are immutable within a version (CACHE_NAME is content-pinned
	// and activate() purges old caches on bump), so a cache hit never needs
	// revalidation — skip the network entirely to save bandwidth on slow links.
	event.respondWith(
		caches.open(CACHE_NAME).then((cache) =>
			cache.match(request, MATCH_OPTIONS).then((cached) => {
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
