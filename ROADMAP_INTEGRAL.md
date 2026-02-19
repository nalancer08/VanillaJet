# ROADMAP INTEGRAL - VanillaJet

Documento canonico de planeacion por epicas e historias.
Cada historia incluye su ciclo completo: fases, tareas, entregables, metricas, criterios y documentacion.

## Objetivo

- Maximizar performance de serving estatico sobre Node sin romper compatibilidad.
- Acelerar el pipeline de compilacion en tiempo real (watch/recompile) para DX diaria.
- Mejorar flujo `dev` con apertura automatica de navegador y live reload estable.

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

## EPIC 2 - Performance Node + DX de compilacion (foco actual)

### HU 2.1 - Fast path de estaticos en Node (completada `v1.4.2`)

#### Fases
- F1: profiling de request estatico.
- F2: optimizacion de lectura/respuesta.
- F3: validacion de no-regresion.

#### Tareas
- [x] Optimizar resolucion de archivo y headers para evitar trabajo repetido.
- [x] Revisar estrategia de `fs`/stream para minimizar latencia en assets grandes.
- [x] Agregar benchmark local reproducible (cold/warm cache).

#### Entregables
- [x] Patch de performance en `framework/router.js`.
- [x] Script de benchmark local documentado.

#### Metricas
- p95 de estaticos >= 20% mejor en escenario warm.
- Menor uso de CPU en serving concurrente.

#### Criterios
- [x] Sin romper cache condicional (`304`) ni negociacion precompressed.
- [x] Sin impacto en rutas dinamicas.

#### Documentacion
- [x] `README.md` + `CHANGELOG.md` + guia de benchmark.

### HU 2.2 - Recompile en tiempo real mas rapido (pendiente)

#### Fases
- F1: baseline de tiempos por tarea de build.
- F2: optimizacion incremental.
- F3: validacion en proyecto consumidor.

#### Tareas
- Reducir trabajo redundante en `gulpfile.js` (globs, minify y concatenacion).
- Mejorar estrategia de watch para recompilar solo lo tocado.
- Medir tiempo de recompile por tipo de cambio (JS, LESS, HTML).

#### Entregables
- Pipeline `dev` optimizado y medido.

#### Metricas
- Recompile JS >= 35% mas rapido.
- Recompile LESS >= 30% mas rapido.

#### Criterios
- Output final equivalente al flujo actual.
- Sin cambios obligatorios en estructura de proyectos consumidores.

#### Documentacion
- `README.md` + `CHANGELOG.md`.

---

## EPIC 3 - Developer Experience en `dev`

### HU 3.1 - Runner `dev` con navegador auto-open + live reload estable (pendiente)

#### Fases
- F1: contrato de ejecucion unificado.
- F2: implementacion runner.
- F3: validacion en Mac/Windows/Linux.

#### Tareas
- Abrir navegador automaticamente al iniciar `dev`.
- Disparar live reload al terminar recompile de assets/templates.
- Mantener modo fallback para entornos sin navegador.

#### Entregables
- Nuevo flujo `npm run dev` mas simple para consumidores.

#### Metricas
- Tiempo a primer render local menor.
- Menos pasos manuales de arranque en onboarding.

#### Criterios
- Reload confiable tras cada recompile exitoso.
- Sin romper el modo actual para usuarios legacy.

#### Documentacion
- `README.md` + `CHANGELOG.md` + guia de migracion de scripts.

---

## EPIC 4 - Hardening operativo del runtime Node

### HU 4.1 - Observabilidad y protecciones de runtime (pendiente)

#### Fases
- F1: logging y metricas base.
- F2: alarmas y limites.
- F3: guia operativa.

#### Tareas
- Estandarizar logs de serving estatico y errores.
- Exponer metricas clave (latencia/errores/cache hits).
- Documentar manejo de picos y rollback.

#### Entregables
- Guia de operacion y checklist de hardening.

#### Documentacion
- `docs/` + `README.md`.

### HU 4.2 - Paquete de referencia para despliegue Node (pendiente)

#### Fases
- F1: templates de entorno.
- F2: validacion en staging.
- F3: guia final.

#### Tareas
- Definir variables, puertos y recomendaciones de cache.
- Incluir ejemplo de despliegue reproducible para consumidores.

#### Entregables
- Template de despliegue y guia de puesta en marcha.

#### Documentacion
- `docs/` + `README.md`.

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
