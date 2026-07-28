// Publishes the kill-switch service worker at public/sw.js.
//
// VanillaJet no longer ships a caching service worker. The feature was removed
// in 1.7.0 after production incidents where not-yet-updated workers ("zombies")
// kept answering fresh HTML with a previous generation's bundles — mismatched
// document/assets, missing templates, missing functions. Asset freshness is
// handled by plain HTTP semantics instead: rendered pages are no-cache,
// fingerprinted (?v=) assets are immutable, and non-versioned statics honor
// `static_cache_max_age`.
//
// The kill-switch (framework/sw.kill.template.js) must keep being published on
// every build, indefinitely: a previously installed worker byte-diffs /sw.js
// on its next update check, installs the kill-switch and self-destructs (wipes
// Cache Storage, unregisters, reloads the windows it controlled). Deleting the
// file only produces a 404, which never repairs a session already painting
// from a frozen cache. The page-side counterpart is the teardown snippet
// emitted by Dipper.includeServiceWorker().

const fs = require('fs');
const path = require('path');

const KILL_TEMPLATE_PATH = path.join(__dirname, '..', 'framework', 'sw.kill.template.js');

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

// Only read to warn consumers that still set the removed flag.
function loadActiveProfile(root) {
	try {
		const config = require(path.join(root, 'config.js'));
		const settings = config.settings || {};
		const env = resolveEnv(config);
		return settings[env] || settings[config.profile] || settings['profile'] || {};
	} catch (err) {
		return {};
	}
}

function main() {
	const root = processCwd();

	if (loadActiveProfile(root).enable_service_worker) {
		console.warn('VanillaJet - `enable_service_worker` is no longer supported (the caching service worker was removed in 1.7.0); publishing the kill-switch instead. Remove the flag from config.js.');
	}

	const publicDir = path.join(root, 'public');
	fs.mkdirSync(publicDir, { recursive: true });
	fs.copyFileSync(KILL_TEMPLATE_PATH, path.join(publicDir, 'sw.js'));
	console.log('VanillaJet - kill-switch service worker published at public/sw.js');
}

main();

module.exports = main;
