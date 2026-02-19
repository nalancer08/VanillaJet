# Changelog

All notable project changes are documented in this file.

The format follows a structure inspired by Keep a Changelog and semantic versioning.

## [1.4.1] - 2026-02-19

### Highlights (v1.4.1)

- Completed HU 2.1 (`Fast path de estaticos en Node`).
- Optimized static serving in `framework/router.js`:
  - Added warm-path static resolution cache (`route + accept-encoding`) to avoid repeated candidate resolution work.
  - Added bounded metadata revalidation window for conditional requests to reduce repeated `fs.stat` pressure.
  - Consolidated static header assembly and reused mime header maps.
  - Kept stream-based delivery for large assets and tuned `createReadStream` chunk size.
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
[1.4.1]: https://github.com/nalancer08/VanillaJet/releases/tag/v1.4.1
