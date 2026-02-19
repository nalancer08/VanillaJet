# Changelog

All notable project changes are documented in this file.

The format follows a structure inspired by Keep a Changelog and semantic versioning.

## [1.3.3] - 2026-02-18

### Added

- Static metadata in-memory cache in `framework/router.js` (`size`, `lastModified`, `etag`) to reduce repeated filesystem work.
- Conditional request handling for static files using `If-None-Match` and `If-Modified-Since`.
- Static response headers: `ETag`, `Last-Modified`, and `Cache-Control: no-cache, must-revalidate`.

### Changed

- Static files can now return `304 Not Modified` when validators match, reducing transfer for repeated requests.
- Conditional requests force metadata refresh before deciding `304`, so clients can still see new content without hard reload.

### Compatibility note

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
