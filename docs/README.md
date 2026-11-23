# Documentación de FlowDesk

FlowDesk implementa un flujo de solicitudes de acceso a software: el empleado
solicita, el aprobador decide y TI registra la concesión manual. La demo usa datos
ficticios, tres identidades por visitante y espacios temporales aislados.

## Referencias

| Documento | Contenido |
| --- | --- |
| [README en inglés](../README.md) / [español](../README.es.md) | Presentación, capturas, recorrido, arquitectura y ejecución local |
| [Diseño del MVP](superpowers/specs/2026-11-22-flowdesk-mvp-design.md) | Diseño aprobado por el propietario el 2026-11-22 |
| [Rediseño visual](superpowers/specs/2026-11-23-flowdesk-visual-redesign-design.md) | Diseño aprobado por el propietario el 2026-11-23 |
| [Plan de implementación](superpowers/plans/2026-11-22-flowdesk-mvp.md) | Plan aprobado el 2026-11-22, tareas y verificaciones |
| [Plan del rediseño visual](superpowers/plans/2026-11-23-flowdesk-visual-redesign.md) | Plan aprobado el 2026-11-23: encargos E8 a E12 |
| [Guía de despliegue](despliegue/README.md) | Imágenes, Compose, Caddy, migraciones, prueba local y mediciones pendientes; VPS bloqueado |
| [Convenciones de diseños](superpowers/specs/README.md) / [planes](superpowers/plans/README.md) | Organización de los documentos |

## Componentes implementados

| Componente | Responsabilidad |
| --- | --- |
| [shared](../packages/shared/src/index.ts) | Tipos de dominio, DTO, fechas de Santiago y validación Zod compartida |
| [web](../apps/web/package.json) | Next.js con next-intl (es/en), formularios, listados por rol, detalle e historial, selector de identidad, cuenta atrás, reinicio y recorrido guiado |
| [core](../apps/api/src/core/requests/service.ts) | Políticas y transiciones de solicitudes; actualizaciones condicionales y eventos en la misma transacción |
| [demo](../apps/api/src/demo/session/session.service.ts) | Sesión por cookie, construcción del `Actor`, espacios, ejemplos, cuotas, caducidad, recorrido y limpieza |
| [HTTP](../apps/api/src/http/app.ts) | Fastify bajo `/api/v1`, autorización, validación, control de origen, límites, errores JSON y salud |
| [datos](../apps/api/src/db/schema.ts) | PostgreSQL y Drizzle; aislamiento por `demo_space_id`, claves foráneas compuestas y borrado en cascada |
| [e2e](../apps/web/playwright.config.ts) | Playwright en escritorio y Pixel 7, recorridos es/en, ciclo de demo, aislamiento, doble envío y axe |

La API obtiene el actor de la sesión del servidor; las consultas de `core` filtran
por `scopeId`. Next.js consume la API desde el mismo origen y no accede a la base
de datos. En desarrollo reenvía `/api/*` al puerto 4000; `API_PROXY_URL` permite
configurar ese destino y habilita el proxy en un build de producción explícito.

## Comandos principales

Desde la raíz, con Node.js 26 y Docker disponible para integración y navegador:

| Acción | Comando |
| --- | --- |
| Preparar pnpm | `npm install -g corepack@latest`, después `corepack enable` |
| Instalar | `pnpm install` |
| Iniciar PostgreSQL | `docker compose -f compose.dev.yaml up -d --wait` |
| Migrar | `pnpm --filter @flowdesk/api migrate` |
| Desarrollo API | `pnpm --filter @flowdesk/api dev` |
| Desarrollo web, en otra terminal | `pnpm --filter @flowdesk/web dev` |
| Todas las pruebas Vitest | `pnpm test` |
| Solo integración, con Testcontainers | `pnpm exec vitest run --config vitest.workspace.ts --project api-integration` |
| End-to-end | `pnpm test:e2e` |
| Capturas de documentación | `pnpm screenshots` |
| Vídeo del recorrido en inglés | `pnpm demo:video` |
| Lint / tipos / formato | `pnpm lint` / `pnpm typecheck` / `pnpm format:check` |
| Compilar web | `pnpm --filter @flowdesk/web build` |
| Compilar API (esbuild) | `pnpm --filter @flowdesk/api build` |

Antes de migrar o iniciar la API, exportar `DATABASE_URL` y `APP_ORIGIN` con los
valores locales de [`.env.example`](../.env.example). La API no carga `.env`
automáticamente. Los README incluyen los pasos para Bash y PowerShell; en este
último se puede usar `pnpm.cmd` si la política bloquea `pnpm.ps1`.

Pruebas unitarias, compartidas y web sin Docker:

```sh
pnpm exec vitest run --config vitest.workspace.ts --project shared --project api-unit --project web
```

Para e2e y capturas, instalar Chromium una vez con
`pnpm --filter @flowdesk/web exec playwright install chromium`.
[El orquestador](../scripts/e2e.mjs) prepara PostgreSQL, migraciones y build e
inicia los servidores mediante Playwright. Usa `DATABASE_URL` o su valor local
de ejemplo y los puertos `E2E_WEB_PORT` (3100) y `E2E_API_PORT` (4000).
Detener antes los servidores de desarrollo para que use el origen de pruebas.

Con `PLAYWRIGHT_BASE_URL`, el orquestador omite esa preparación y Playwright no
inicia servidores. Para el Compose de despliegue ejecutar solo `tour`, siguiendo
la [guía local](despliegue/README.md#prueba-local-desde-cero-revisor).

[Las capturas](../apps/web/e2e/screenshots.spec.ts) generan siete PNG en
`docs/assets/`, en inglés, con un viewport de escritorio de 1280 × 800 y otro
Pixel 7. Se excluyen de la suite e2e normal. [CI](../.github/workflows/ci.yml)
ejecuta las verificaciones, integración y e2e; guarda el informe si falla e2e.

El [vídeo del recorrido](../apps/web/e2e/demo-video.spec.ts), aprobado por el
propietario el 2026-11-23 como pulido posterior al MVP junto con la actualización
de Actions y Dependabot, usa la misma preparación local que las capturas.
`pnpm demo:video` graba solo en Chromium de escritorio, a 1280 × 720, y guarda el
resultado correcto en `apps/web/demo-video/flowdesk-tour.webm` (ignorado por Git).
El revisor convierte ese vídeo con ffmpeg a `docs/assets/flowdesk-tour.gif`,
referenciado en ambos README. El caso `@video` queda excluido de e2e y capturas.
Añadir `-- --list` a `pnpm test:e2e`, `pnpm screenshots` o `pnpm demo:video` lista
los casos sin Docker, servidores ni navegador.

Las reglas de contribución y proceso están en [AGENTS.md](../AGENTS.md) y
[CLAUDE.md](../CLAUDE.md).
