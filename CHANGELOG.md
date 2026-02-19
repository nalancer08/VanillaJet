# Changelog

All notable project changes are documented in this file.

The format follows a structure inspired by Keep a Changelog and semantic versioning.

## [1.3.5] - 2026-02-19

### Highlights (v1.3.5)

- Added safe precompressed fallback in `response.render()` for HTML templates: `.br` (when enabled and accepted) -> `.gz` (when accepted) -> original HTML.
- Wired `Response` to server profile options, so HTML negotiation follows `settings.profile.enable_precompressed_negotiation`.
- Added `Vary: Accept-Encoding` for negotiated HTML responses and support for `Accept-Encoding` quality params.
- Updated documentation and roadmap status for HU 1.3.

## [1.3.4] - 2026-02-19

### Highlights

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
- Future improvements are planned with backward compatibility in mind. See `ROADMAP.md`.

[1.3.3]: https://github.com/nalancer08/VanillaJet/releases/tag/v1.3.3
[1.3.2]: https://github.com/nalancer08/VanillaJet/releases/tag/v1.3.2
[1.3.4]: https://github.com/nalancer08/VanillaJet/releases/tag/v1.3.4
[1.3.5]: https://github.com/nalancer08/VanillaJet/releases/tag/v1.3.5
