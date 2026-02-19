# ROADMAP INTEGRAL - VanillaJet

Documento canonico de planeacion por epicas e historias.
Cada historia incluye su ciclo completo: fases, tareas, entregables, metricas, criterios y documentacion.

## Objetivo

- Modernizar el framework con `Vite` como base de DX.
- Reducir dependencia de Node para servir frontend.
- Adoptar `nginx` y Docker al final, con evidencia y sin romper legacy.

## Reglas de ejecucion

- Retrocompatibilidad primero.
- Cambios sensibles con flags.
- Todo cambio con medicion antes/despues.
- Entregas pequenas y reversibles.

---

## EPIC 1 - Estabilidad base

### HU 1.1 - Cache metadata + 304 (completada `v1.3.3`)

#### Fases
- F1: cache metadata.
- F2: validacion condicional.
- F3: no-regresion.

#### Tareas
- Cache `size/mtime/etag`.
- Soporte `If-None-Match` y `If-Modified-Since`.

#### Entregables
- `framework/router.js` actualizado.

#### Metricas
- Menor latencia y menor I/O en estaticos repetidos.

#### Criterios
- `304` correcto.
- Sin impacto en dinamico.

#### Documentacion
- `CHANGELOG.md`.

### HU 1.2 - Negociacion `br/gz` estaticos (completada `v1.3.4`)

#### Fases
- F1: flag opt-in.
- F2: fallback seguro.
- F3: validacion.

#### Tareas
- `.br -> .gz -> original`.
- `Vary: Accept-Encoding`.

#### Entregables
- `framework/router.js`.

#### Metricas
- Menor transferencia en cliente.

#### Criterios
- Fallback sin 404.

#### Documentacion
- `README.md`, `CHANGELOG.md`.

### HU 1.3 - Fallback precompressed HTML (completada `v1.3.5`)

#### Fases
- F1: fallback runtime HTML.
- F2: pruebas de ausencia de artefactos.
- F3: release.

#### Tareas
- Resolver `.br/.gz/original` en `render`.

#### Entregables
- `framework/response.js`.

#### Metricas
- Menor peso de HTML inicial.

#### Criterios
- Sin errores por artefactos faltantes.

#### Documentacion
- `README.md`, `CHANGELOG.md`.

### HU 1.4 - Hardening de bugs conocidos (completada `v1.3.6`)

#### Fases
- F1: correccion.
- F2: smoke tests.
- F3: patch release.

#### Tareas
- [x] `node_mudules -> node_modules`.
- [x] fixes en `dipper`.
- [x] fix script `test`.

#### Entregables
- Patch de estabilidad.

#### Metricas
- Menos errores silenciosos en runtime/build.

#### Criterios
- [x] `npm test` estable.

#### Documentacion
- `CHANGELOG.md` con nota de compatibilidad.

---

## EPIC 2 - Vite first (foco actual)

### HU 2.1 - `dev:vite` y `build:vite` sin romper legacy (completada `v1.4.0`)

#### Fases
- F1: baseline.
- F2: integrar scripts Vite.
- F3: coexistencia con legacy.
- F4: validacion en consumidor real.

#### Tareas
- [x] Config Vite (JS/LESS).
- [x] Mantener Nunjucks en esta etapa.
- [x] Documentar `dev` legacy vs `dev:vite`.

#### Entregables
- Config y scripts de Vite.

#### Metricas
- Arranque dev >= 40% mas rapido.
- Rebuild incremental >= 50% mas rapido.

#### Criterios
- HMR estable.
- Legacy intacto.

#### Documentacion
- `README.md` + `CHANGELOG.md`.

### HU 2.2 - Node deja de servir frontend en modo moderno (pendiente)

#### Fases
- F1: contrato `legacy` vs `modern`.
- F2: flag de transicion.
- F3: validacion de compatibilidad.

#### Tareas
- Node solo API/dinamico en modo moderno.
- Frontend servido por Vite (dev) y luego Nginx (prod).

#### Entregables
- Contrato por entorno.

#### Metricas
- Menos carga de static serving en Node.

#### Criterios
- Modo moderno sin dependencia de `response.render()`.
- Modo legacy intacto.

#### Documentacion
- Guia de migracion de modo.

---

## EPIC 3 - Benchmark y decision gate

### HU 3.1 - Go/No-Go de Nginx basado en datos (pendiente)

#### Fases
- F1: dise;o benchmark A/B.
- F2: ejecucion.
- F3: analisis.
- F4: decision.

#### Tareas
- Medir p50/p95/p99, throughput, CPU, memoria.
- Definir umbrales minimos de aprobacion.

#### Entregables
- Reporte benchmark.
- Decision log Go/No-Go.

#### Criterios
- Decision trazable con evidencia.

#### Documentacion
- Documento benchmark + resumen tecnico.

---

## EPIC 4 - Adopcion final de infraestructura

### HU 4.1 - Nginx oficial para consumidores (pendiente)

#### Fases
- F1: template.
- F2: staging.
- F3: guia de operacion.

#### Tareas
- `try_files`, SPA fallback, proxy a Node, cache y precompressed.

#### Entregables
- Template y guia.

#### Documentacion
- `docs/deployment/` + `README.md`.

### HU 4.2 - Docker de referencia (pendiente)

#### Fases
- F1: Dockerfile.
- F2: docker-compose.
- F3: validacion server.

#### Tareas
- Definir imagenes, puertos y variables.
- Documentar rollback.

#### Entregables
- Dockerfile y compose de referencia.

#### Documentacion
- `docs/deployment/` + `README.md`.

---

## Secuencia oficial de ejecucion

1. HU 1.4
2. HU 2.1
3. HU 2.2
4. HU 3.1
5. HU 4.1
6. HU 4.2

## Estado global

- Completado: HU 1.1, HU 1.2, HU 1.3, HU 1.4, HU 2.1.
- Pendiente: HU 2.2, HU 3.1, HU 4.1, HU 4.2.
