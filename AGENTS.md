# Instrucciones para agentes de IA

Este repositorio se desarrolla con agentes de IA bajo dirección y aprobación humana. Las instrucciones específicas de Claude Code están en [CLAUDE.md](CLAUDE.md); ambos archivos deben mantenerse coherentes.

## Roles

- **Propietario:** elige entre alternativas importantes, aprueba el diseño y después el plan, acepta cada entrega y autoriza fusiones, despliegues y cambios de infraestructura. La revisión de un agente no sustituye su aprobación.
- **Claude Code:** analiza requisitos, propone y documenta el diseño, elabora el plan, prepara los encargos para Codex y revisa su implementación y sus pruebas. No escribe código de aplicación.
- **Codex:** implementa las tareas del plan aprobado, escribe código y pruebas, depura y corrige los hallazgos de la revisión. Puede decidir detalles de implementación dentro de lo aprobado. Comunica, en lugar de resolver por su cuenta, cualquier ambigüedad que exija cambiar la arquitectura, una interfaz o el alcance.

## Reglas comunes

- Partir del [diseño aprobado](docs/superpowers/specs/2026-11-22-flowdesk-mvp-design.md) y del [plan aprobado](docs/superpowers/plans/2026-11-22-flowdesk-mvp.md). No añadir funcionalidades que no estén en ellos.
- Trabajar en el worktree y la rama del encargo recibido, nunca en `main`. No fusionar, no hacer push y no desplegar.
- Aplicar las prácticas de [Superpowers](https://github.com/obra/superpowers): test-driven-development, systematic-debugging ante fallos y verification-before-completion antes de declarar una tarea terminada.
- Mantener actualizada la documentación afectada y sus enlaces relativos.
- No versionar secretos. `.env.example` lleva solo valores ficticios.
- Antes de entregar, ejecutar las verificaciones de la tarea e informar de sus resultados y de lo que no se pudo verificar.

## Comandos

Desde la raíz; Node.js 26. Preparar pnpm con `npm install -g corepack@latest` y
`corepack enable`. Exportar las variables locales de [`.env.example`](.env.example)
antes de migrar o iniciar la API; los pasos están en el [README](README.es.md).

| Acción | Comando |
| --- | --- |
| Instalar | `pnpm install` |
| PostgreSQL local | `docker compose -f compose.dev.yaml up -d --wait` |
| Migrar | `pnpm --filter @flowdesk/api migrate` |
| Desarrollo, en dos terminales | `pnpm --filter @flowdesk/api dev` / `pnpm --filter @flowdesk/web dev` |
| Pruebas unitarias, web e integración | `pnpm test` (integración necesita Docker) |
| End-to-end | `pnpm test:e2e` (necesita Docker y Chromium de Playwright) |
| Capturas | `pnpm screenshots` (misma preparación que e2e) |
| Lint | `pnpm lint` |
| Tipos | `pnpm typecheck` |
| Formato | `pnpm format:check` |
| Compilar web | `pnpm --filter @flowdesk/web build` |

En PowerShell, usar `pnpm.cmd` si la política bloquea `pnpm.ps1`.
