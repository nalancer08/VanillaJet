# VanillaJet

Node.js framework for building SPA applications with a JS/CSS/HTML build pipeline, HTTP/HTTPS server, internal router, and template rendering utilities.

![VanillaJet logo](https://github.com/nalancer08/App-Builders/blob/master/Logos/logo_monocromatico_horizontal_.png)

## Current version

- Version: `1.3.5`
- Changelog: see [`CHANGELOG.md`](./CHANGELOG.md)
- Improvement plan (performance and backward compatibility): see `ROADMAP_INTEGRAL.md`

## Requirements

- Node.js `>=16` recommended
- npm `>=8`

## Installation

```bash
npm install vanilla-jet
```

If you are working in this local repository:

```bash
npm install
```

## Quick start

### 1) Export the server from your project

```js
const { Server } = require('vanilla-jet');
```

### 2) Define endpoints (classes)

Each endpoint should expose a `name` and register routes with the router in the constructor.

```js
class AppEndpoint {
  constructor(router) {
    this.name = 'AppEndpoint';
    router.addRoute('get', '/', 'AppEndpoint.index');
  }

  index(request, response) {
    response.setBody('Hello VanillaJet');
    response.respond();
  }
}
```

### 3) Start the server

```js
const { Server } = require('vanilla-jet');
const Config = require('./config');

new Server(Config, [AppEndpoint]).start();
```

## Available commands

From this repository:

- `npm run setup`: generates a base `vanillaJet.package.json` if it does not exist.
- `npm run dev`: build + watcher for development.
- `npm run build:qa`: build for QA.
- `npm run build:staging`: build for staging.
- `npm run build:prod`: build for production.

As CLI (`bin.js`):

- `npx vanilla-jet setup`
- `npx vanilla-jet dev`
- `npx vanilla-jet build`

## Expected consumer project structure

VanillaJet expects a structure similar to:

- `assets/pages/home.html`
- `assets/templates/**/*.html`
- `assets/scripts/**/*.js`
- `assets/styles/less/admin.less`
- `public/` (compiled output)
- `config.js`
- `vanillaJet.package.json`

## Build pipeline (summary)

- Minifies JS and concatenates into `public/scripts/vanilla.min.js`
- Compiles LESS and generates `public/styles/app.min.css`
- Compiles templates and generates `public/pages/home.html`
- Generates `.gz` versions of JS/CSS/HTML for compressed delivery

## Compression negotiation (optional)

You can enable precompressed static negotiation from `settings.profile`:

```js
module.exports = {
  settings: {
    profile: {
      // Enables priority: .br -> .gz -> original file
      enable_precompressed_negotiation: true
    }
  }
};
```

Behavior details:

- Default (`false`): keeps existing gzip behavior for supported static assets.
- Enabled (`true`): if client accepts Brotli, server tries `.br` first.
- Safe fallback: if `.br` or `.gz` does not exist, server serves the original file.
- HTML rendering (`response.render`) also uses safe runtime fallback for precompressed templates (`.br`/`.gz`/original).

## Additional documentation

- Router: `docs/router.md`
- Version history: [`CHANGELOG.md`](./CHANGELOG.md)
- Roadmap and improvements: `ROADMAP_INTEGRAL.md`
- Deployment templates (nginx + docker): `docs/deployment/`
