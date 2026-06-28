# VanillaJet — Documento maestro

> Documento canónico del proyecto: qué es, cómo funciona de punta a punta, cómo se construye,
> cómo corre en runtime, cómo se prueba y cómo mejorar su performance.
> Si solo vas a leer un archivo de este repo, lee este.

- **Paquete npm:** `vanilla-jet`
- **Versión actual:** `1.4.3`
- **Tipo:** framework + CLI para construir y servir SPAs (single page apps) sobre Node.js puro (sin Express).
- **Docs relacionadas:** [`README.md`](./README.md), [`CHANGELOG.md`](./CHANGELOG.md), [`ROADMAP_INTEGRAL.md`](./ROADMAP_INTEGRAL.md), [`docs/router.md`](./docs/router.md), [`docs/benchmark-static.md`](./docs/benchmark-static.md), [`docs/deployment/`](./docs/deployment/).

---

## 1. Qué es VanillaJet

VanillaJet es un framework "todo en uno" para apps de página única (SPA) que cubre dos roles:

1. **Build pipeline (Gulp):** toma los fuentes de un proyecto consumidor (`assets/`) y produce artefactos optimizados en `public/` (JS minificado y concatenado, CSS compilado desde LESS, HTML compilado desde Nunjucks, y versiones `.gz`).
2. **Servidor de runtime (Node http/http2):** sirve esos artefactos y resuelve rutas dinámicas a través de "endpoints" (clases) y un router estilo Backbone.

Punto clave para entenderlo: **este repositorio es el _paquete_ del framework, NO una app.** No contiene `assets/`, `public/`, `config.js` ni `vanillaJet.package.json`. Esos archivos viven en el **proyecto consumidor** que hace `npm install vanilla-jet`. El framework opera sobre el `process.cwd()` del consumidor.

---

## 2. Arquitectura de alto nivel

```
┌──────────────────────────────────────────────────────────────────────┐
│ PROYECTO CONSUMIDOR (cwd)                                              │
│                                                                        │
│  assets/                         public/  (generado por el build)      │
│   ├─ pages/home.html              ├─ pages/home.html(.gz)              │
│   ├─ templates/**/*.html          ├─ scripts/vanilla.min.js(.gz)       │
│   ├─ scripts/**/*.js              ├─ styles/app.min.css(.gz)           │
│   └─ styles/less/admin.less       ├─ images/ fonts/ anims/            │
│  config.js                                                             │
│  vanillaJet.package.json                                               │
│           │                                  ▲                         │
│           │ require('vanilla-jet')           │ sirve artefactos        │
│           ▼                                  │                         │
│  ┌─────────────────────  node_modules/vanilla-jet  ─────────────────┐ │
│  │  index.js → { Server }                                           │ │
│  │  framework/  server · router · request · response · dipper · ... │ │
│  │  gulpfile.js + scripts/compile_html.js  (build)                  │ │
│  │  bin.js  (CLI: setup | dev | build)                              │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

Dos planos de ejecución que conviene NO confundir:

- **Build-time:** Gulp + `scripts/compile_html.js`. Corre Nunjucks, LESS, uglify, gzip. Genera `public/`.
- **Run-time:** `framework/server.js` levanta un servidor Node. Para páginas HTML **no** vuelve a renderizar Nunjucks: hace _stream_ del archivo ya compilado en `public/pages/`. Para assets estáticos hace _stream_ desde `public/`. Para rutas dinámicas invoca el método del endpoint.

---

## 3. Estructura del repositorio (el paquete)

| Ruta | Rol |
|---|---|
| `index.js` | Punto de entrada del paquete: `module.exports = { Server }`. |
| `bin.js` | CLI (`vanilla-jet setup\|dev\|build`). Despacha a Gulp vía `npx`. |
| `framework/server.js` | Clase `Server`: arma `global.render` (Nunjucks), `global.dipper`, crea el servidor http/http2, instancia router y endpoints. |
| `framework/router.js` | Clase `Router`: matching de rutas (regex estilo Backbone), serving de estáticos (caché de metadata, negociación br/gz, `304`, streaming). |
| `framework/request.js` | Clase `Request`: parseo de URL, método, params GET/POST, body, `accept-encoding`. |
| `framework/response.js` | Clase `Response`: headers, status, `respond()`, y `render()` (stream de páginas precompiladas con fallback `.br/.gz/original`). |
| `framework/dipper.js` | "Dipper" = gestor de recursos: registra/encola scripts, styles, fonts, animaciones, meta tags, Sentry, environment, y URLs versionadas. |
| `framework/functions.js` | `Functions.hydrate(dipper)`: lee `vanillaJet.package.json` y registra scripts/styles/fonts core + meta tags + Open Graph. |
| `gulpfile.js` | Pipeline de build (tareas Gulp). |
| `scripts/compile_html.js` | Compila `assets/pages/home.html` + templates a `public/pages/home.html` (+ `.gz`). |
| `scripts/benchmark-static.js` | Benchmark reproducible de serving estático (warm/cold). |
| `.scripts/generate_packages_json.js` | Genera `vanillaJet.package.json` base si no existe (comando `setup`). |
| `test/` | Harness de pruebas (smoke tests con `node --test`). Ver §10. |
| `docs/` | Router, benchmark y plantillas de despliegue (nginx + docker). |

---

## 4. Estructura esperada del proyecto consumidor

VanillaJet asume esta convención en el consumidor:

```
assets/
  pages/home.html              # página raíz del SPA (incluye templates con include::)
  templates/**/*.html          # parciales Nunjucks (los *template.html se inyectan en bloque)
  scripts/**/*.js              # JS de la app (controllers, views, api, core, plugins)
  styles/less/admin.less       # entry point LESS
config.js                      # settings (profile / shared / security)
vanillaJet.package.json        # dependencias front (scripts/styles/fonts/anims)
public/                        # SALIDA del build (no se edita a mano)
```

### `config.js` (lo consume `Server`)
```js
module.exports = {
  settings: {
    profile: {                 // obj.options
      port: 8080,
      https_server: false,
      enable_precompressed_negotiation: false,  // .br -> .gz -> original
      request_timeout_ms: 30000,
      headers_timeout_ms: 35000,
      keep_alive_timeout_ms: 5000,
      api_url: 'https://...'   // expuesto al cliente vía includeEnvironment()
    },
    shared: {                  // datos compartidos build + cliente
      site_name: 'Mi App',
      description: '...',
      environment: 'development',
      version: '1.0.0',
      sentry: { /* dsn_js, bundleVersion, bundleSha, sampleRate, ... */ }
    },
    security: {
      pass_salt: '...', token_salt: '...', version: '1.0',
      self_managed_certs: false, key: '...', cert: '...'  // para http2 TLS propio
    }
  }
};
```

### `vanillaJet.package.json` (lo consume `Functions.hydrate` y `Dipper`)
```jsonc
{
  "coreDependencies": { "jquery": "//cdn...", "underscore": "//cdn...", ... },
  "dependencies": { "miLib:dependeDe": "ruta/o/url.js" },  // ":dep" declara orden de carga
  "styles": { "theme": "tema.css" },
  "fonts": { "Roboto": [300,400,700] },
  "anims": { "loader": "anims/loader.json" }
}
```

### Arranque típico del consumidor (`index.js` del consumidor)
```js
const { Server } = require('vanilla-jet');
const Config = require('./config');

class AppEndpoint {
  constructor(router) {
    this.name = 'AppEndpoint';
    router.setDefaultRoute('home');             // mapea la raíz '/'
    router.addRoute('get', '/home', 'AppEndpoint.home');
  }
  home(request, response) {
    response.render(request, 'home.html');      // stream de public/pages/home.html
    return true;                                 // <- IMPORTANTE: marca la request como atendida
  }
}

new Server(Config, [AppEndpoint]).start();
```

---

## 5. Build pipeline (build-time) — paso a paso

Definido en `gulpfile.js`. Tarea `build` (`gulp.series`):

1. **`cleanBuildJS`** → borra `public/scripts/vanilla.min.js`.
2. **`uglifyJs`** → minifica todo `assets/scripts/**/*.js` (con `gulp-newer`, solo lo cambiado) a `public/scripts/**/*.min.js`.
3. **`concatJs`** → concatena controllers + views + api + raíz en `public/scripts/vanilla.min.js` (excluye `core/` y `plugins/`).
4. **`cleanMinified`** → borra los `.min.js` intermedios (api/controllers/views/app.min.js) ya concatenados.
5. **`buildLess`** → compila `assets/styles/less/admin.less` → `public/styles/app.min.css` (LESS + `clean-css`) + livereload.
6. **`compileTemplates`** → `node scripts/compile_html.js` (ver §6).
7. **`gulp.parallel(compressJs, compressCss)`** → genera `.gz` (nivel 9) de `vanilla.min.js` y `app.min.css`.

Tarea **`dev`** = `build` + `watchFiles` (watchers de LESS, HTML y JS con livereload).

Comandos:
- `npm run dev` → `gulp dev --env development`
- `npm run build:qa | build:staging | build:prod`
- CLI: `npx vanilla-jet dev | build | setup`

> ⚠️ El build necesita la estructura del **consumidor** (`assets/`, `config.js`, `vanillaJet.package.json`). En este repo (el paquete) no existe, así que `gulp build` aquí no produce nada útil — se prueba dentro de un proyecto consumidor o con el harness (§10).

---

## 6. Compilación de HTML (`scripts/compile_html.js`)

No usa el bundler de Nunjucks a runtime; es un compilador propio orientado a un SPA de **una sola página**:

1. Lee `assets/pages/home.html`.
2. Lo renderiza con Nunjucks (contexto `{ app: dipper }`, así el template puede llamar `app.includeScripts()`, `app.metaTags()`, etc.).
3. Recorre línea por línea buscando directivas `include::<nombre>`:
   - `include::templates` → inyecta **todos** los parciales cuyo archivo contiene `template.html`.
   - `include::otro.html` → inyecta ese parcial específico.
4. Minifica el resultado con `html-minifier-terser` (colapsa whitespace, quita comentarios, minifica JS inline, etc.).
5. Escribe `public/pages/home.html` y su `home.html.gz` (gzip nivel 9).

`Dipper` se hidrata aquí vía `Functions.hydrate(dipper)` para que los helpers de recursos estén disponibles dentro del template.

---

## 7. Runtime — flujo de una request

`framework/server.js` crea el servidor y delega cada request a `router.onRequest(req, res)`:

```
req → new Response(res, options)
    → new Request(req, { onDataReceived })   // junta body, parsea GET/POST, lee accept-encoding
    → (al terminar el body) onDataReceived():
        1. si path == '' → path = defaultRoute
        2. recorre routes[get|post]; si regex matchea → handler "Clazz.metodo"
              → validateCallback busca el endpoint y su método
              → handled = callback(request, response, server)   // el endpoint responde
        3. si NO se atendió y NO hubo match:
              → ¿la extensión es un mime conocido? (png, css, js, svg, woff/ttf, pdf, json, ...)
                 sí → serving estático (ver §8)
                 no → 404
```

Notas finas:
- El handler **debe retornar truthy** (`return true`) para marcar la request como atendida; si no, el router intentará tratarla como estático y probablemente caerá en `404`.
- La raíz `/` llega como `path === ''` (se quita el slash final), por eso se usa `router.setDefaultRoute('home')` para mapearla.
- `isProtectedFile()` bloquea (`404`) rutas dentro de `framework/`, `external/`, `node_modules/` y archivos de primer nivel.

---

## 8. Serving estático (corazón de la perf en Node)

En `framework/router.js`, para una ruta con extensión conocida:

1. **Candidatos** (`getStaticCandidates`): para `vanilla.min.js`/`app.min.css` con cliente compatible, arma la lista `[.br?, .gz?, original]` según `enable_precompressed_negotiation` y `Accept-Encoding` (con soporte de `q=`). El resto de assets: solo el original.
2. **Resolución con caché** (`resolveFirstAvailableStaticFile`): clave `route|accept-encoding`. Cachea qué archivo concreto sirve cada combinación (`staticResolutionCache`) y la metadata `size/mtime/etag` (`staticMetadataCache`).
3. **Revalidación condicional**: si la request trae `If-None-Match`/`If-Modified-Since`, se fuerza refresh de metadata; si valida, responde `304` sin cuerpo.
4. **Headers** (`buildStaticHeaders`): `Content-Type`, `Content-Length`, `ETag` (`W/"size-mtime"`), `Last-Modified`, `Vary: Accept-Encoding` (si hubo negociación), y `Cache-Control: no-cache, must-revalidate`.
5. **Streaming**: `fs.createReadStream` (chunk 128 KB), con limpieza si el cliente cierra la conexión (`res.on('close')`).

> 📌 **Importante (ver §12):** ese `Cache-Control: no-cache, must-revalidate` se aplica a **todos** los assets, lo que obliga a revalidar cada archivo en cada carga. Es el principal candidato a "se siente lento" en visitas repetidas, y es un cambio respecto a 1.3.2.

`response.render()` (páginas HTML) usa la misma idea de fallback `.br → .gz → original` pero **no** fija `Cache-Control` (lo deja al heurístico del navegador, correcto para HTML).

---

## 9. El "Dipper" (gestor de recursos)

`framework/dipper.js` es el helper que los templates usan para construir el `<head>`/`<body>`:

- **Registro/encolado:** `registerScript/Style`, `enqueueScript/Style`, `dequeueScript/Style` (resuelven dependencias vía `requires`).
- **Inclusión:** `includeScripts()`, `includeStyles()`, `includeAnimations()`, `includeManifest()`, `metaTags()`.
- **URLs versionadas:** `script()`/`style()` pasan por `versionedUrl()`, que añade `?v=<size>-<mtime>` leyendo el archivo en disco (cache-busting determinista). `img()`/`pdf()` **no** versionan.
- **Integraciones:** `includeSentry()` (CDN + init según `shared.sentry`), `includeEnvironment()` (expone `ENVIRONMENT`, `API_URL`, `VERSION` al cliente).
- **Fonts:** `get_google_fonts()` arma la URL de Google Fonts a partir de `vanillaJet.package.json#fonts`.

`Functions.hydrate(dipper)` es lo que conecta `vanillaJet.package.json` con el Dipper: registra fonts, styles, dependencies (en orden por `clave:dependencia`), el core `vanillaJet.min.js`, el bundle `vanilla.min.js`, y los meta tags básicos + Open Graph.

---

## 10. Harness de pruebas (`test/`)

Antes no existían pruebas (`npm test` era un `console.log`). Se agregó un harness con el runner nativo `node --test` (sin dependencias nuevas):

| Archivo | Cubre |
|---|---|
| `test/router.test.js` | `routeToRegExp` (params/optionals/splats), `isProtectedFile`, `supportsEncoding` (con `q=`). |
| `test/dipper.test.js` | `urlTo`, `versionedUrl` (`?v=` y passthrough de URLs externas), register/enqueue/dequeue, salida de `includeScript`/`includeStyle`. |
| `test/server.test.js` | Levanta un `Server` real en puerto efímero contra un workspace temporal: ruta dinámica → `200`; estático → `200` + headers + `304` con `If-None-Match`; ruta protegida y archivo inexistente → `404`. |
| `test/helpers.js` | Utilidades: crear workspace temporal, levantar/cerrar server, request HTTP. |

Correr:
```bash
npm test                 # node --test test/
node --test test/server.test.js   # un archivo
npm run benchmark:static # benchmark de serving estático (warm/cold)
```

El harness sirve como **red de seguridad para los cambios de performance**: cambia el `Cache-Control`, la negociación o el bundling, y `npm test` confirma que el contrato de routing/estáticos/404/304 sigue intacto. La regla del roadmap "todo cambio con medición antes/después" se apoya en `npm test` + `npm run benchmark:static`.

---

## 11. Despliegue

Plantillas en `docs/deployment/` (nginx + docker-compose + Dockerfile). Patrón recomendado:

- **nginx al frente** sirviendo `public/` (estáticos) con HTTP/2, brotli/gzip y cache headers fuertes; proxy_pass a Node solo para rutas dinámicas.
- **Node** corriendo el `Server` (puerto interno), detrás de nginx.
- Variables clave: `port`, `enable_precompressed_negotiation`, certificados (si `self_managed_certs`), `SENTRY_RELEASE`.

CI: `.github/workflows/deploy.yml` publica a npm en push a `main` (setup-node → `npm ci` → `npm run build --if-present` → `npm test` → `npm publish` → tag).

---

## 12. Diagnóstico de performance y recomendaciones

> **Hallazgo medido:** el serving estático de Node **no** es el cuello de botella. El benchmark
> (`npm run benchmark:static`, archivo de 512 KB en localhost) da **p95 warm ~0.5 ms / cold ~0.8 ms**,
> ~2900 req/s. El servidor responde rapidísimo. La lentitud percibida ("las apps tardan en renderizar")
> viene del **cliente/red** y del **build**, no del CPU de Node.

Recomendaciones priorizadas (de mayor impacto / menor riesgo, hacia abajo):

### P0 — Caché de assets (regresión vs 1.3.2, alto impacto en visitas repetidas)
Hoy **todos** los estáticos salen con `Cache-Control: no-cache, must-revalidate` (`router.js:282`). Como los assets ya van con fingerprint `?v=size-mtime`, esto es contraproducente: cada carga revalida cada archivo (round-trip por asset, aunque devuelva `304`). En 1.3.2 no había ese header.
- **Acción:** servir los assets versionados (`vanilla.min.js`, `app.min.css`, y todo lo que lleve `?v=`) con `Cache-Control: public, max-age=31536000, immutable`. Dejar `no-cache` **solo** para HTML.
- **Pre-requisito:** extender `versionedUrl()` también a imágenes (`img()`) antes de marcarlas `immutable`; lo no versionado puede quedarse con `ETag` + `max-age` moderado.
- **Impacto esperado:** elimina N round-trips de revalidación por carga; visible sobre todo en redes reales (no localhost).

### P0 — Scripts no bloqueantes
jQuery, Underscore, Modernizr, respond.js, el core `vanillaJet.min.js` y el bundle `vanilla.min.js` se cargan como `<script>` bloqueantes. `registerScript` ya soporta `defer`/`async`; hoy no se usan.
- **Acción:** marcar `defer` en core + bundle; evaluar quitar **Modernizr 2.8.3** y **respond.js** (solo sirven para IE ≤8, muertos).
- **Impacto:** adelanta el first render; menos requests bloqueantes.

### P0 — Google Fonts bloqueante
`get_google_fonts()` genera un `<link rel=stylesheet>` bloqueante.
- **Acción:** cargar como `async` (el Dipper ya soporta `registerStyle(..., async)` con `preload`+`onload`) y/o `font-display: swap`; añadir `preconnect` a `fonts.googleapis.com`/`fonts.gstatic.com`.

### P1 — Brotli realmente activo
`enable_precompressed_negotiation` busca `.br`, pero el build solo genera `.gz`. Activar el flag hoy **no** sirve porque no existen los `.br`.
- **Acción:** agregar tarea Gulp que genere `.br` (brotli) de `vanilla.min.js`/`app.min.css`/`home.html`. Brotli ~15-20% más chico que gzip.

### P1 — Edge estático con nginx
Aprovechar las plantillas de `docs/deployment/`: que **nginx** sirva `public/` con HTTP/2 + brotli + cache inmutable y Node solo atienda dinámico. Quita CPU de Node y mejora TTFB de assets.

### P2 — Velocidad de BUILD (si "renderiza tardan" se refiere a compilar)
Esto es la HU 2.2 del roadmap (pendiente):
- `gulp-watch` está deprecado (polling pesado) → usar `gulp.watch` nativo.
- `uglify` es lento; **esbuild** minifica/empaqueta 10-100× más rápido (gran win de DX en `dev`).
- Cualquier cambio recompila el template completo; medir por tipo de cambio (JS/LESS/HTML).

### P2 — Otros
- `drop_console: false` en uglify → `true` para prod (menos ruido/peso).
- `request.js` usa `url.parse()` (deprecado, warning en Node 24) → migrar a `new URL()`.
- Mega-bundle único (`vanilla.min.js` = todos los controllers/views/api): para apps grandes, considerar code-splitting/lazy por ruta.
- Nunjucks runtime con `noCache:true`: solo afecta `dipper.template()`; si se usa, cachear en prod.

### Cómo medir antes/después
1. **Servidor:** `npm run benchmark:static` (igual `BENCH_*` antes y después).
2. **Cliente:** Lighthouse + pestaña Network del navegador en un consumidor real (mirar TTFB, waterfall de revalidaciones `304`, blocking time de scripts/fonts).
3. **Build:** cronometrar `gulp build` y cada watcher por tipo de cambio.

---

## 13. Historial 1.3.2 → 1.4.3 (¿qué cambió y qué "jala"?)

`1.3.2` (commit `658c1e3`) fue la última versión "que jalaba de maravilla". De ahí en adelante:

| Versión | Cambios | ¿Aplica/funciona? |
|---|---|---|
| 1.3.3 | Caché de metadata estática + `304` (`If-None-Match`/`If-Modified-Since`) + headers `ETag`/`Last-Modified`/`Cache-Control: no-cache`. | ✅ Funciona. ⚠️ Introduce el `no-cache, must-revalidate` global (ver P0). |
| 1.3.4 | Negociación precompressed opt-in (`.br→.gz→original`) + `Vary`. | ✅ Funciona (pero `.br` no se genera en build → §P1). |
| 1.3.5 | Fallback precompressed en `response.render()` (HTML). | ✅ Funciona. |
| 1.3.6 | Hardening: `node_mudules→node_modules`, fixes en Dipper (`includeAnimations`, `dequeue*`), fix del `npm test` recursivo. | ✅ Funciona. |
| 1.4.1 | Fast-path estáticos: caché de resolución `route+accept-encoding`; versionado `?v=size-mtime`; watch JS/CSS dispara compile de templates; benchmark. | ✅ Funciona (benchmark verde, +35% warm vs cold). |
| 1.4.2/1.4.3 | Migración total a Gulp (fuera Grunt), `compile_html.js` movido a `scripts/`, timeouts defensivos del server, limpieza de streams en disconnect. | ✅ Funciona. |

**Veredicto:** los commits de 1.3.2 hacia adelante **sí aplican y corren bien** (server arranca, sirve estáticos, negocia compresión, hace 304). No hay regresión funcional bloqueante. Las "asperezas" son de **performance percibida** (caché agresiva en assets), no de que algo se rompa, más dos detalles de higiene:

- ⚠️ **`deploy.yml` (cambio sin commitear en working tree):** revierte la sintaxis a `::set-output name=...` (deshabilitada por GitHub Actions) y **borra** la línea `git push origin v<version>`. Esto **rompería el CI de publish**. Recomendación: descartar ese cambio local (`git checkout -- .github/workflows/deploy.yml`) y quedarse con la versión commiteada (`>> "$GITHUB_OUTPUT"` + push del tag).
- `.DS_Store` aparece modificado/trackeado; conviene `git rm --cached .DS_Store` y agregarlo a `.gitignore`.

---

## 14. Convenciones y gotchas

- **`process.cwd()` mágico:** varios helpers (`getCwd`, `processCwd`, `staticBasePath`) limpian sufijos como `/node_modules`, `/vanilla-jet`, `/.scripts`, `/scripts`, `core/framework`. Es para que el framework resuelva rutas relativas al **proyecto consumidor** sin importar desde dónde se invoque.
- **Globals:** `global.render` (Nunjucks) y `global.dipper` se setean en el constructor de `Server`. `dipper.template()` runtime depende de `global.render`.
- **`autoescape:false` en Nunjucks:** los templates confían en su propio contenido; cuidado con inyección si se renderiza input de usuario.
- **El endpoint debe `return true`** tras responder, o el router intentará servir estático y caerá en 404.
- **Raíz `/`:** mapéala con `router.setDefaultRoute('algo')` + ruta `get '/algo'`.
- **Sin tests históricos:** ahora hay harness (`test/`); úsalo como gate antes de tocar router/estáticos.

---

## 15. Mapa rápido "quiero tocar X → mira aquí"

| Quiero… | Archivo |
|---|---|
| Cambiar headers/caché de estáticos | `framework/router.js` (`buildStaticHeaders`, `getStaticCandidates`) |
| Cambiar fallback/headers de páginas HTML | `framework/response.js` (`render`) |
| Cómo se cargan scripts/styles/fonts/meta | `framework/dipper.js` + `framework/functions.js` |
| Versionado `?v=` de assets | `framework/dipper.js` (`versionedUrl`) |
| Matching de rutas | `framework/router.js` (`routeToRegExp`, `addRoute`, `onRequest`) |
| Pipeline de build / minify / gzip | `gulpfile.js` |
| Compilación de la página | `scripts/compile_html.js` |
| Timeouts / http2 / TLS del server | `framework/server.js` |
| Medir performance | `scripts/benchmark-static.js`, `docs/benchmark-static.md` |
| Pruebas / smoke | `test/` (`npm test`) |
| Service worker (cache offline) | `framework/sw.template.js`, `scripts/generate_sw.js`, `dipper.includeServiceWorker()` |

---

## 16. Service Worker (caché cache-first, opt-in) — desde v1.5.0

Para que las apps "vuelen" en visitas repetidas y redes lentas, VanillaJet puede generar y servir un
**service worker cache-first** que guarda los bundles locales y los sirve sin tocar la red. Es la
contraparte cliente del versionado `?v=` y evita las revalidaciones `304` por asset.

### Activación (`config.js`)
```js
profile: {
  enable_service_worker: true,
  service_worker: {                      // todo opcional
    precache: ['/public/scripts/plugins/velocity.min.js'], // extras explícitos
    on_demand_prefixes: ['/public/animations/', '/public/images/'],
    cache_prefix: 'm1-app'               // default: slug de shared.site_name
  }
}
```

### Cómo funciona (3 piezas)
1. **Build** — la tarea Gulp `generateServiceWorker` (en la serie `build` y en los watchers) corre
   `scripts/generate_sw.js`, que parte de `framework/sw.template.js` y genera `public/sw.js`:
   - **Precache** = core (`app.min.css`, `vanilla.min.js`, `core/vanillaJet.min.js`) + recursos
     **locales** que el Dipper tiene encolados + los de `service_worker.precache` (solo archivos que existen).
   - **Cache name** = `<prefix>-sw-<hash>` donde el hash es md5 de `ruta:size-mtime` de lo precacheado →
     cualquier cambio de asset rota el cache y `activate()` purga los viejos.
   - Los `match` usan `{ ignoreSearch: true }`, así el cache sigue sirviendo aunque cambie el `?v=`.
   - Si el flag está apagado, **borra** cualquier `public/sw.js` previo (deja de controlar clientes).
2. **Serve** — el router atiende `GET /sw.js` desde scope raíz con `Service-Worker-Allowed: /` y
   `Cache-Control: no-cache` (solo cuando el flag está activo; si no, `/sw.js` da `404`).
3. **Registro** — `app.includeServiceWorker()` (helper del Dipper, úsalo en `home.html` como
   `includeSentry()`) inyecta el registro inline **web-only**. En WebViews nativas, el consumidor puede
   poner `window.__VJ_DISABLE_SW__ = true` antes de que corra para no registrar y desinstalar uno previo.

### Notas
- **Opt-in y backward compatible:** apagado por defecto; no afecta apps existentes.
- Para apps en WebView (ej. Flutter), registrar el SW no aporta y un SW atascado es difícil de recuperar
  → por eso el guard `__VJ_DISABLE_SW__`.
- En `1.3.1` (sin versionado `?v=`) el SW casa por URL exacta; en `1.4.1+` (con `?v=`) **se requiere**
  `ignoreSearch`, que la plantilla del framework ya trae.

---

## 17. Compatibilidad de `config.js` (fix v1.5.0)

Existen dos formas de `config.js` y el server soporta ambas (`settings[options.profile] || settings['profile']`):

- **Legacy (1.3.x):** `module.exports = { profile, settings: { development:{...}, qa:{...}, production:{...}, shared, security } }`.
  El server indexa por el perfil activo (`settings[profile]`).
- **Anidada (docs nuevas):** `module.exports = { settings: { profile:{...}, shared, security } }`.

> ⚠️ Entre 1.3.1 y 1.4.3 esto se rompió (`settings['profile']` literal): un consumidor legacy recibía
> `{}` (sin puerto/`api_url`/environment). **Restaurado en v1.5.0.** Si vas a actualizar un proyecto desde
> 1.3.x, esta es la razón por la que el upgrade fallaba. Además, el server ahora respeta `process.env.PORT`
> (Cloud Run/Heroku) antes del puerto de config.

### Regresiones 1.3.1 → 1.4.x corregidas en v1.5.0 (checklist de upgrade)

El refactor 1.4.x rompió varias cosas para consumidores 1.3.x (como Broker-App). Todas restauradas en v1.5.0:

1. **`server.js` perfil:** `settings[options.profile] || settings['profile']` (antes `settings['profile']` literal → `opts={}`).
2. **`bin.js`:** restaurados `build:qa` / `build:staging` / `build:prod` (el CLI 1.4.x solo tenía `build` → el build no hacía nada).
3. **`compile_html.js` entorno:** resuelve `settings[env]` (env pasado por gulp `--env` → argv) e inyecta `api_url`/`environment` correctos; ya no renderiza el contenido del page como nombre de template (antes: `API_URL="undefined"` y `template not found`).
4. **`gulpfile.js`:** reenvía `--env` a `compile_html.js` y `generate_sw.js`.
5. **`port: 0`** preservado (nullish), y `process.env.PORT` con prioridad.
6. **`zlib@1.0.5`** eliminado de `dependencies` (rompía `npm ci` con `node-waf`).

> Para Broker-App el SW vive ahora en el framework: `assets/sw.js` y su serving se eliminaron; `config.js`
> declara `enable_service_worker: true` + `service_worker.precache` (lista de plugins) + `cache_prefix: 'broker-app'`.
> El registro web-only + teardown nativo se queda en `assets/scripts/app.js` (registra `/sw.js`, que ahora sirve el framework).
```
