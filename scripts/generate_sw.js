// Generates public/sw.js from framework/sw.template.js.
//
// Opt-in: the caching worker is only generated when the active profile sets
// `enable_service_worker: true`. With the flag OFF, the build publishes the
// kill-switch worker (framework/sw.kill.template.js) at the same path instead
// of deleting the file: previously installed workers pick it up on their next
// update check and self-destruct (wipe caches, unregister, reload clients).
// The precache list is derived from the compiled core assets, any LOCAL resources
// the Dipper has enqueued, and the explicit `service_worker.precache` config.
// The cache name is pinned to a content hash so any asset change rotates the cache.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TEMPLATE_PATH = path.join(__dirname, '..', 'framework', 'sw.template.js');
const KILL_TEMPLATE_PATH = path.join(__dirname, '..', 'framework', 'sw.kill.template.js');

// Core bundles that every VanillaJet app ships; precached when present.
const CORE_PRECACHE = [
	'/public/styles/app.min.css',
	'/public/scripts/vanilla.min.js',
	'/public/scripts/core/vanillaJet.min.js',
	'/public/scripts/templates.js'
];

const DEFAULT_ON_DEMAND_PREFIXES = ['/public/animations/', '/public/images/'];

function processCwd() {
	return process.cwd()
		.replace('/scripts', '')
		.replace('/gulp', '')
		.replace('/node_modules/vanilla-jet', '');
}

const ENV_ALIASES = { dev: 'development', prod: 'production', 'build:qa': 'qa', 'build:staging': 'staging', 'build:prod': 'production' };

function resolveEnv(config) {
	let env = process.argv[2] || (config && config.profile) || 'development';
	return ENV_ALIASES[env] || env;
}

function loadConfig(root) {
	try {
		const config = require(path.join(root, 'config.js'));
		const settings = config.settings || {};
		const env = resolveEnv(config);
		const opts = settings[env] || settings[config.profile] || settings['profile'] || {};
		return { opts, shared: settings['shared'] || {} };
	} catch (err) {
		return { opts: {}, shared: {} };
	}
}

function slugify(value) {
	return String(value || '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '') || 'vanillajet';
}

function stripQuery(url) {
	const queryIndex = url.indexOf('?');
	return queryIndex === -1 ? url : url.slice(0, queryIndex);
}

function isLocalPublicPath(url) {
	return typeof url === 'string' && url.startsWith('/public/') && !url.startsWith('//');
}

// Source of truth = vanillaJet.package.json. We hydrate the Dipper and read its full
// registry (coreDependencies + dependencies + styles), keeping every LOCAL resource.
// This way the precache list is derived from the declared deps, with no raw paths in
// the consumer config. Any failure falls back to core only.
function deriveLocalAssets(root, opts, shared) {
	try {
		const Dipper = require('../framework/dipper.js');
		const Functions = require('../framework/functions.js');
		const dipper = new Dipper(opts, shared);
		Functions.hydrate(dipper);

		const assets = [];
		const collect = (registry) => {
			Object.keys(registry || {}).forEach((name) => {
				const entry = registry[name];
				if (entry && isLocalPublicPath(entry.resource)) {
					assets.push(stripQuery(entry.resource));
				}
			});
		};
		collect(dipper.styles);
		collect(dipper.scripts);
		return assets;
	} catch (err) {
		return [];
	}
}

function buildPrecacheList(root, opts, shared) {
	const sw = opts.service_worker || {};
	// `precache` = optional extras NOT declared in vanillaJet.package.json.
	const configured = Array.isArray(sw.precache) ? sw.precache : [];
	// `precache_exclude` = opt-out for declared-but-don't-cache assets (heavy/rare).
	const exclude = (Array.isArray(sw.precache_exclude) ? sw.precache_exclude : []).map(stripQuery);

	const candidates = CORE_PRECACHE
		.concat(deriveLocalAssets(root, opts, shared))
		.concat(configured)
		.map(stripQuery)
		.filter(isLocalPublicPath)
		.filter((assetPath) => !exclude.includes(assetPath));

	const seen = new Set();
	const precache = [];
	candidates.forEach((assetPath) => {
		if (seen.has(assetPath)) return;
		const absolute = path.join(root, assetPath.replace(/^\//, ''));
		try {
			if (fs.statSync(absolute).isFile()) {
				seen.add(assetPath);
				precache.push(assetPath);
			}
		} catch (err) {
			// Missing file: skip it so the SW never precaches a 404.
		}
	});
	return precache;
}

// Fingerprint each precache path (`?v=size-mtime`, same scheme the Dipper uses for
// asset tags). Install fetches THESE urls: a content change produces a new URL, which
// guarantees an HTTP-cache miss. Precaching the bare path instead can read a stale
// copy the HTTP cache is allowed to keep for `static_cache_max_age` seconds, pinning
// an outdated bundle into the new SW cache (deploys invisible until a hard reload).
function versionAssets(root, precache) {
	return precache.map((assetPath) => {
		const absolute = path.join(root, assetPath.replace(/^\//, ''));
		try {
			const stats = fs.statSync(absolute);
			return `${assetPath}?v=${stats.size}-${Math.floor(stats.mtimeMs)}`;
		} catch (err) {
			return assetPath;
		}
	});
}

function computeCacheHash(root, precache) {
	const hash = crypto.createHash('md5');
	precache.forEach((assetPath) => {
		const absolute = path.join(root, assetPath.replace(/^\//, ''));
		try {
			const stats = fs.statSync(absolute);
			hash.update(`${assetPath}:${stats.size}-${Math.floor(stats.mtimeMs)}`);
		} catch (err) {
			hash.update(`${assetPath}:missing`);
		}
	});
	return hash.digest('hex').slice(0, 12);
}

function main() {
	const root = processCwd();
	const { opts, shared } = loadConfig(root);

	if (!opts.enable_service_worker) {
		// Feature disabled: publish the kill-switch worker instead of deleting the
		// file. Deleting only produces a 404, which browsers act on solely during a
		// full navigation's update check — it never repairs the session already
		// painting from a frozen cache, and page-side teardown code can't reach
		// clients whose stale bundle is served by the old worker itself. The
		// kill-switch reaches every zombie through the one channel the old worker
		// cannot poison: the /sw.js byte-diff.
		const publicDir = path.join(root, 'public');
		fs.mkdirSync(publicDir, { recursive: true });
		fs.copyFileSync(KILL_TEMPLATE_PATH, path.join(publicDir, 'sw.js'));
		console.log('VanillaJet - service worker disabled; kill-switch published at public/sw.js');
		return;
	}

	const swOptions = opts.service_worker || {};
	const baseSlug = slugify(swOptions.cache_prefix || shared.site_name || 'vanillajet');
	// activate() purges every cache whose name starts with this base (and != current),
	// so a rebuild rotates the cache AND legacy schemes (e.g. "<base>-<appVersion>") get cleaned up.
	const cachePrefix = baseSlug;
	const onDemandPrefixes = Array.isArray(swOptions.on_demand_prefixes)
		? swOptions.on_demand_prefixes
		: DEFAULT_ON_DEMAND_PREFIXES;

	const precache = buildPrecacheList(root, opts, shared);
	const precacheUrls = versionAssets(root, precache);
	const cacheName = `${baseSlug}-sw-${computeCacheHash(root, precache)}`;

	let template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
	template = template
		.replace(/__CACHE_NAME__/g, cacheName)
		.replace(/__CACHE_PREFIX__/g, cachePrefix)
		.replace('__PRECACHE_ASSETS__', JSON.stringify(precache, null, '\t'))
		.replace('__PRECACHE_URLS__', JSON.stringify(precacheUrls, null, '\t'))
		.replace('__ON_DEMAND_PREFIXES__', JSON.stringify(onDemandPrefixes, null, '\t'));

	const publicDir = path.join(root, 'public');
	fs.mkdirSync(publicDir, { recursive: true });
	const outputPath = path.join(publicDir, 'sw.js');
	fs.writeFileSync(outputPath, template, 'utf8');

	console.log(`VanillaJet - service worker generated at public/sw.js (cache: ${cacheName}, ${precache.length} precached)`);
}

main();

module.exports = main;
