# VanillaJet

Node.js framework for building SPA applications: a Gulp build pipeline (JS/CSS/HTML), a lightweight
HTTP/HTTPS server, an internal router, and template/resource utilities — with first-class, opt-in
performance features (Brotli, immutable caching, deferred scripts, and template externalization).

![VanillaJet logo](https://github.com/nalancer08/App-Builders/blob/master/Logos/logo_monocromatico_horizontal_.png)

## Current version

- Version: `1.7.0`
- Changelog: [`CHANGELOG.md`](./CHANGELOG.md)
- **Full project docs (architecture, runtime, build, deployment, perf): [`master.md`](./master.md)**
- Roadmap: [`ROADMAP_INTEGRAL.md`](./ROADMAP_INTEGRAL.md)

## Requirements

- Node.js `>= 18` (tested on 24)
- npm `>= 8`

## Installation

```bash
npm install vanilla-jet
```

## Quick start

```js
// index.js
const { Server } = require('vanilla-jet');
const Config = require('./config');

class AppEndpoint {
  constructor(router) {
    this.name = 'AppEndpoint';
    router.setDefaultRoute('home');                  // maps "/"
    router.addRoute('get', '/home', 'AppEndpoint.home');
  }
  home(request, response) {
    response.render(request, 'home.html');           // streams public/pages/home.html
    return true;                                      // <- mark the request as handled
  }
}

new Server(Config, [AppEndpoint]).start();
```

## Configuration (`config.js`)

Two shapes are supported (both resolved automatically):

```js
// Legacy (keyed by active profile name, selected with `--p qa`)
module.exports = {
  profile: process.argv... ,                 // 'development' | 'qa' | 'production'
  settings: {
    development: { port: 1234, api_url: '...' },
    qa:          { port: 443,  api_url: '...' },
    production:  { port: 443,  api_url: '...' },
    shared:   { site_name: 'My App', environment: 'qa', sentry: {...} },
    security: { pass_salt: '...', token_salt: '...' }
  }
};

// Nested (single profile)
module.exports = { settings: { profile: { port: 8080, api_url: '...' }, shared: {...}, security: {...} } };
```

### Profile options (all optional)

| Option | Default | What it does |
|---|---|---|
| `port` | `8080` | Listen port. `process.env.PORT` wins (Cloud Run/Heroku). |
| `enable_precompressed_negotiation` | `false` | Serve `.br` → `.gz` → original via `Accept-Encoding`. |
| `enable_service_worker` | — | **Removed in 1.7.0** (ignored, build warns if set). The caching worker is gone; every build publishes a kill-switch at `/sw.js` that self-destructs leftover workers. |
| `defer_scripts` | `false` | Add `defer` to non-async scripts so they don't block parsing. |
| `externalize_templates` | `false` | Move `<script type="text/template">` blocks out of the page into a cacheable `public/scripts/templates.js`. |
| `request_timeout_ms` / `headers_timeout_ms` / `keep_alive_timeout_ms` | `30000` / `35000` / `5000` | Defensive server timeouts. |
| `https_server` / `self_managed_certs` | `false` | HTTP/2 with self-managed `key`/`cert`. |

## Commands

CLI (`bin.js`): `npx vanilla-jet setup | dev | build | build:qa | build:staging | build:prod`

From this repo: `npm run dev` · `npm run build:prod` · `npm test` · `npm run benchmark:static`

## Expected consumer structure

```
assets/pages/home.html · assets/templates/**/*.html · assets/scripts/**/*.js · assets/styles/less/admin.less
config.js · vanillaJet.package.json · public/ (build output)
```

## Build pipeline (Gulp)

- Minifies + concatenates JS → `public/scripts/vanilla.min.js`
- Compiles LESS → `public/styles/app.min.css`
- Compiles templates → `public/pages/home.html` (+ optional `templates.js`)
- Precompresses every `.js`/`.css`/`.html` to `.gz` + `.br`
- Publishes the service-worker kill-switch at `public/sw.js` (always)

## Performance features (opt-in)

- **Brotli + gzip** precompression with `Accept-Encoding` negotiation and safe fallback.
- **Immutable caching**: fingerprinted assets (`?v=size-mtime`) are served `Cache-Control: public,
  max-age=31536000, immutable`; HTML and unversioned assets stay `no-cache`.
- **`defer` scripts** and **template externalization** to shrink the render-blocking critical path.
- **No service worker** (removed in 1.7.0 after zombie-cache incidents in production): freshness is
  plain HTTP semantics. Every build still publishes a kill-switch at `/sw.js`, and
  `dipper.includeServiceWorker()` now emits a page-side teardown snippet — both heal clients that
  still run a leftover worker, and both must keep shipping indefinitely.

See [`master.md`](./master.md) §12–§17 and [`docs/benchmark-static.md`](./docs/benchmark-static.md).

## Testing

```bash
npm test                 # node --test (router, dipper, config, static serving, service worker)
npm run benchmark:static # reproducible static-serving benchmark (cold/warm)
```

## Deployment

Templates (nginx + Docker) in [`docs/deployment/`](./docs/deployment/). Honors `process.env.PORT`, so
PaaS runtimes (Cloud Run, Heroku) work without config changes. Enable caching features in prod/qa
profiles; keep them off in `development` for fresh iteration.

## More docs

- **[`master.md`](./master.md)** — full architecture, runtime flow, perf playbook, upgrade notes.
- [`docs/router.md`](./docs/router.md) · [`CHANGELOG.md`](./CHANGELOG.md) · [`ROADMAP_INTEGRAL.md`](./ROADMAP_INTEGRAL.md)
