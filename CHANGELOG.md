# Changelog

All notable project changes are documented in this file.

The format follows a structure inspired by Keep a Changelog and semantic versioning.

## [1.6.3] - 2026-07-16

### Fixed

- **SW precache no longer reads stale bundles from the browser's HTTP cache:** install now fetches
  the fingerprinted urls (`?v=size-mtime`, guaranteed HTTP-cache miss) with `cache: 'no-cache'` as a
  second guard. Previously it fetched the bare asset paths through the HTTP cache; with
  `static_cache_max_age` set, a new SW could pin an outdated bundle into a brand-new cache and —
  because serving is cache-first with `ignoreSearch` — every deploy became invisible to returning
  users for up to `static_cache_max_age` seconds unless they hard-reloaded (which bypasses the SW
  per spec but never rewrites its Cache Storage). Diagnosed in production on a consumer app.

## [1.6.2] - 2026-06-30

### Fixed

- **Template externalization now self-cleans:** disabling `externalize_templates` (or never enabling it)
  removes any previously generated `public/scripts/templates.js` (+ `.gz`/`.br`), so toggling the flag
  never leaves a stale 749 KB file behind (which the service worker would otherwise precache).

### Notes

- **`externalize_templates` caveat (WebView):** it shrinks the initial HTML for web browsers, but it injects
  all templates via one synchronous `innerHTML`. On slower JS engines (native WebViews — WKWebView /
  Android WebView) that block can stall the boot. **Prefer it OFF for apps loaded primarily inside a
  WebView**; keep it ON only for pure-web apps that benefit from a smaller first byte.

## [1.6.1] - 2026-06-29

### Security

- **Removed unused dependencies that carried known vulnerabilities:** `jsrsasign` (multiple high/critical
  crypto advisories), `jwt-simple`, `blueimp-md5`, `js-beautify`, and `nodemon`. None were used by the
  framework; this drops a large vulnerability + install-size footprint for consumers.

### Added

- **`settings.profile.static_cache_max_age`** (seconds, default `0`): sets `Cache-Control: public, max-age=N`
  for NON-versioned static assets (images, fonts, animation JSON…), so they are reused across references
  and reloads instead of revalidating every time. Versioned (`?v=`) assets stay `immutable`; `0` keeps the
  previous `no-cache` behavior. Pairs with the service worker for clients without it (e.g. WebViews).

## [1.6.0] - 2026-06-29

### Added

- **Template externalization (opt-in):** `settings.profile.externalize_templates`. `compile_html.js`
  moves `<script type="text/template">` blocks out of the page into a cacheable `public/scripts/templates.js`
  (loaded `defer` before the app bundle, so views still find their templates in the DOM at boot). Shrinks
  the initial HTML dramatically; the templates file is brotli + immutable + service-worker cached. The SW
  precache now includes `templates.js`.

### Fixed

- **Watch keeps precompressed assets fresh:** `compressBr` now runs in the LESS/JS watch series, so `.gz`/`.br`
  no longer go stale on incremental dev rebuilds.

### Notes

- Recommended: enable caching features (`enable_service_worker`, `externalize_templates`, precompression,
  immutable) in `qa`/`production`; keep `enable_service_worker` **off in development` so a cache-first SW does
  not serve stale assets during rapid rebuilds.

## [1.5.5] - 2026-06-28

### Changed

- **Fingerprinted assets are now cached immutably.** Static requests carrying a `?v=` (the
  `?v=size-mtime` fingerprint from `dipper.versionedUrl`) are served `Cache-Control: public,
  max-age=31536000, immutable`; non-versioned assets keep `no-cache, must-revalidate`. This eliminates
  per-asset revalidation round-trips for clients without the service worker (notably native WebViews).

## [1.5.4] - 2026-06-28

### Fixed

- Added missing static MIME types so self-hosted web fonts and icons serve correctly:
  `woff`, `woff2`, `eot`, `ico`. Previously `.woff2`/`.woff` returned 404 (only `ttf` was mapped),
  forcing font fallbacks and wasted requests.

## [1.5.3] - 2026-06-28

### Changed

- **Static compression now applies to ALL compressible assets, not just the app bundle.**
  `framework/router.js` negotiates `.br`/`.gz` for any `css`/`js` request that has a precompressed
  sibling (falling back to the original otherwise) — previously only `vanilla.min.js`/`app.min.css`.
  This makes self-hosted vendor libraries serve gzip/brotli instead of uncompressed.
- `scripts/compress_br.js` now walks `public/scripts`, `public/styles`, `public/pages` and emits
  `.gz` + `.br` for every `.js`/`.css`/`.html` (was: only three named files).

### Why

- Self-hosting third-party libs (to cut CDN origins) only helps if they're served compressed;
  otherwise a large lib (e.g. a 369 KB bundle) would ship uncompressed and regress vs the CDN.

## [1.5.2] - 2026-06-28

### Added

- **Brotli precompression** of build outputs (`scripts/compress_br.js` + Gulp `compressBr`): generates
  `.br` for `vanilla.min.js`, `app.min.css` and `public/pages/home.html`. The server already negotiates
  `.br -> .gz -> original` when `settings.profile.enable_precompressed_negotiation` is true and the client
  sends `Accept-Encoding: br`. Additive and safe: clients that don't accept brotli keep getting gzip.
- **`settings.profile.defer_scripts`** (default `false`): when enabled, `dipper.includeScript()` adds
  `defer` to non-async scripts so they don't block HTML parsing (document order preserved). Opt-in.

## [1.5.1] - 2026-06-28

### Changed

- **Service worker precache is now fully derived from `vanillaJet.package.json`.** `scripts/generate_sw.js`
  reads the Dipper's full local registry (`coreDependencies` + `dependencies` + `styles` that resolve to
  `/public/...`) instead of only the enqueued subset, so first-party assets like `coreLib/*` are precached
  automatically. Consumers no longer need to hardcode a `service_worker.precache` list.
- Added `service_worker.precache_exclude` (opt-out by path) for declared assets you don't want cached.
  `service_worker.precache` remains as an optional escape hatch for extras not declared in the package file.

### Compatibility notes

- Backward compatible: an explicit `service_worker.precache` still works (merged with the derived set).

## [1.5.0] - 2026-06-27

### Added

- **Service worker support (opt-in)** — `settings.profile.enable_service_worker`.
  - `framework/sw.template.js`: generic cache-first worker (precache + on-demand prefixes).
  - `scripts/generate_sw.js` + Gulp task `generateServiceWorker`: generates `public/sw.js` at build time.
    - Precache list = core bundles (`app.min.css`, `vanilla.min.js`, `core/vanillaJet.min.js`) + LOCAL resources enqueued by the Dipper + `service_worker.precache` extras (existing files only).
    - Cache name is content-pinned (md5 of `path:size-mtime`), so any asset change rotates the cache; `activate()` purges stale caches.
    - Matches use `{ ignoreSearch: true }` to stay compatible with fingerprinted (`?v=`) asset URLs.
  - `framework/router.js`: serves `/sw.js` from root scope with `Service-Worker-Allowed: /` and `Cache-Control: no-cache` when enabled.
  - `framework/dipper.js`: `includeServiceWorker()` inline registration helper (web-only; honors `window.__VJ_DISABLE_SW__` to opt out and tear down inside native WebViews).
  - Config knobs: `service_worker.precache`, `service_worker.on_demand_prefixes`, `service_worker.cache_prefix`.

### Fixed

- **Build-time environment injection regression (backward compatibility):** `scripts/compile_html.js`
  again resolves the build environment (passed by Gulp via `--env`, forwarded as argv) and reads
  `settings[env]`, restoring correct `api_url`/`environment` injection (`includeEnvironment()`). The 1.4.x
  rewrite read a literal `settings['profile']` and also rendered the page content as a template name,
  producing `API_URL="undefined"` and `template not found` for 1.3.x-shaped configs. `gulpfile.js` now
  forwards `--env` to both `compile_html.js` and `generate_sw.js`.
- **Broken dependency removed:** dropped `zlib@1.0.5` from `dependencies`. The framework uses Node's
  built-in `zlib` (core modules take precedence), and the npm package has a native `node-waf` build step
  that fails on modern Node — it broke `npm install`/`npm ci` for consumers. Pure dead weight.
- **CLI build commands regression (backward compatibility):** `bin.js` again handles
  `build:qa`, `build:staging` and `build:prod` (they map to `gulp build --env <env>`). 1.3.x consumers
  call `npx vanilla-jet build:<env>`; the 1.4.x CLI had dropped these, so the build silently did nothing.
- **Profile resolution regression (backward compatibility):** `framework/server.js` now resolves
  `settings[options.profile] || settings['profile']`. Legacy consumers (1.3.x) that key settings by the
  active profile name (e.g. `qa`, `production`) again receive their profile options instead of `{}`.
- **PaaS port binding:** server now honors `process.env.PORT` (Cloud Run / Heroku) before `settings.profile.port`.
- **Ephemeral port (`port: 0`) preserved:** port selection uses a nullish check instead of `|| 8080`, so a
  deliberate `0` binds an ephemeral port instead of falling back to `8080`.

### Testing

- Added a real test harness (`test/`, `node --test`, no new deps) wired to `npm test`:
  router, dipper, config-shape resolution, static serving (`200`/`304`/`404`), and service worker
  generation + serving.

### Compatibility notes

- Service worker is **off by default**; existing apps are unaffected until they opt in.
- Profile-resolution fix is backward compatible with both the legacy and the nested config shapes.

## [1.4.3] - 2026-02-19

### Removed

- Grunt build artifacts: removed `.grunt/` folder, `build_styles_task.js`, and `compile_html.js`.
- Build pipeline now uses only Gulp; template compilation moved to `scripts/compile_html.js`.

### Changed

- `gulpfile.js`: `compileTemplates` now invokes `node scripts/compile_html.js` instead of `.grunt/compile_html.js`.
- `framework/dipper.js`, `.scripts/generate_packages_json.js`: removed `.grunt` references from `processCwd` helpers.

### Fixed

- **Reliability under rapid reloads (F5)**: server no longer stops responding after repeated refreshes.
  - Removed `fs.watch` per static file (`staticFileWatchers`); could exhaust resources with prolonged use.
  - Added fallback to `404` for routes without a handled static extension (avoids hanging requests).
  - Destroy file streams when client disconnects (`res.on('close')`) to avoid orphaned streams.
  - Applied same stream cleanup in `response.render()` for HTML template delivery.
- Added defensive server timeouts: `requestTimeout`, `headersTimeout`, `keepAliveTimeout` (configurable via `settings.profile`).

### Compatibility notes

- No public API changes.
- Build output and route behavior unchanged; only internal reliability improvements.

## [1.4.2] - 2026-02-19

### Changed

- Version bump to 1.4.2.

## [1.4.1] - 2026-02-19

### Highlights (v1.4.1)

- Completed HU 2.1 (`Fast path de estaticos en Node`).
- Optimized static serving in `framework/router.js`:
  - Added warm-path static resolution cache (`route + accept-encoding`) to avoid repeated candidate resolution work.
  - Keeps strict conditional metadata revalidation so content changes are visible on reload without stale `304`.
  - Consolidated static header assembly and reused mime header maps.
  - Kept stream-based delivery for large assets and tuned `createReadStream` chunk size.
- Added asset URL versioning in `framework/dipper.js` (`?v=size-mtime`) for local scripts/styles.
- Updated `gulp dev` watch flow so JS/CSS recompiles also trigger template compilation and refresh asset URLs in HTML.
- Added reproducible local benchmark:
  - New script: `npm run benchmark:static`.
  - New guide: `docs/benchmark-static.md`.

### Compatibility notes (v1.4.1)

- No public API changes.
- Preserves static conditional caching (`304`) and precompressed negotiation fallback.
- No intended behavior changes for dynamic routes.

## [1.3.6] - 2026-02-19

### Highlights (v1.3.6)

- Fixed protected directory typo in `framework/router.js`: `node_mudules` -> `node_modules`.
- Fixed stability issues in `framework/dipper.js`:
  - `includeAnimations()` now calls the existing `includeAnimation()`.
  - `dequeueStyle()` and `dequeueScript()` now read `item.requires` correctly.
  - Dependency dequeue now runs only when explicitly requested (`dependencies === true`).
- Fixed `package.json` recursive `test` script to avoid infinite loop and keep `npm test` stable.
- Completed HU 1.4 hardening milestone and updated roadmap tracking.

### Compatibility notes (v1.3.6)

- No public API changes.
- No route contract changes.
- This patch only hardens runtime behavior and developer workflow reliability.

## [1.3.5] - 2026-02-19

### Highlights (v1.3.5)

- Added safe precompressed fallback in `response.render()` for HTML templates: `.br` (when enabled and accepted) -> `.gz` (when accepted) -> original HTML.
- Wired `Response` to server profile options, so HTML negotiation follows `settings.profile.enable_precompressed_negotiation`.
- Added `Vary: Accept-Encoding` for negotiated HTML responses and support for `Accept-Encoding` quality params.
- Updated documentation and roadmap status for HU 1.3.

## [1.3.4] - 2026-02-19

### Highlights (v1.3.4)

- Added optional static precompressed negotiation flag: `settings.profile.enable_precompressed_negotiation`.
- Static files now resolve safely with fallback chain: `.br` (when enabled and accepted) -> `.gz` (when accepted) -> original file.
- Static compression negotiation now handles `Accept-Encoding` values with quality params (for example `gzip;q=1.0`).
- `Vary: Accept-Encoding` is set for negotiated static responses.

## [1.3.3] - 2026-02-18

### Added

- Static metadata in-memory cache in `framework/router.js` (`size`, `lastModified`, `etag`) to reduce repeated filesystem work.
- Conditional request handling for static files using `If-None-Match` and `If-Modified-Since`.
- Static response headers: `ETag`, `Last-Modified`, and `Cache-Control: no-cache, must-revalidate`.

### Changed

- Static files can now return `304 Not Modified` when validators match, reducing transfer for repeated requests.
- Conditional requests force metadata refresh before deciding `304`, so clients can still see new content without hard reload.

### Compatibility notes

- No route or filename contract changes.
- No impact on dynamic endpoints behavior.

## [1.3.2] - 2026-02-18

### Current documented state

- Released version `1.3.2` of `vanilla-jet`.
- The framework exports `Server` from `index.js` for simple integration in Node.js projects.
- Includes a Gulp-based build pipeline for:
  - JavaScript minification and concatenation.
  - LESS/CSS compilation and minification.
  - HTML template compilation with Nunjucks.
  - Generation of compressed `.gz` artifacts.
- Includes HTTP server and optional HTTPS server (self-managed certificates) in `framework/server.js`.
- Includes internal router with Backbone-style route support (`:param`, `*splat`, optional segments).
- Includes resource utilities (scripts, styles, meta tags, sentry, environment) in `framework/dipper.js`.

### Compatibility note

- This version keeps the historical behavior expected by existing projects.
- Future improvements are planned with backward compatibility in mind. See `ROADMAP_INTEGRAL.md`.

[1.3.3]: https://github.com/nalancer08/VanillaJet/releases/tag/v1.3.3
[1.3.2]: https://github.com/nalancer08/VanillaJet/releases/tag/v1.3.2
[1.3.4]: https://github.com/nalancer08/VanillaJet/releases/tag/v1.3.4
[1.3.5]: https://github.com/nalancer08/VanillaJet/releases/tag/v1.3.5
[1.3.6]: https://github.com/nalancer08/VanillaJet/releases/tag/v1.3.6
[1.4.2]: https://github.com/nalancer08/VanillaJet/releases/tag/v1.4.2
[1.4.3]: https://github.com/nalancer08/VanillaJet/releases/tag/v1.4.3
[1.4.1]: https://github.com/nalancer08/VanillaJet/releases/tag/v1.4.1
