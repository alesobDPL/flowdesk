# Instrucciones para agentes de IA

Este repositorio se desarrolla con agentes de IA bajo dirección y aprobación humana. Las instrucciones específicas de Claude Code están en [CLAUDE.md](CLAUDE.md); ambos archivos deben mantenerse coherentes.

## Roles

- **Propietario:** elige entre alternativas importantes, aprueba el diseño y después el plan, acepta cada entrega y autoriza fusiones, despliegues y cambios de infraestructura. La revisión de un agente no sustituye su aprobación.
- **Claude Code:** analiza requisitos, propone y documenta el diseño, elabora el plan, prepara los encargos para Codex y revisa su implementación y sus pruebas. No escribe código de aplicación.
- **Codex:** implementa las tareas del encargo recibido, escribe código y pruebas, depura y corrige los hallazgos de la revisión. Puede decidir detalles de implementación dentro de lo aprobado. Le rinde cuentas a Claude Code, que revisa y le informa al propietario.

## Dónde está la información

- Estado actual y mapa: [docs/00-inicio.md](docs/00-inicio.md). Documentación técnica: [docs/README.md](docs/README.md).
- Diseños y planes aprobados: [docs/superpowers/](docs/superpowers/plans/README.md). Decisiones: [docs/decisiones/](docs/decisiones/README.md).

## Reglas para Codex

Codex le rinde cuentas a Claude Code. El encargo es la fuente de verdad: no añadir nada que no esté en él.

1. **Antes de empezar:** ejecutar la sección *Antes de empezar* del encargo (rama y SHA base). Si algo no coincide, detenerse y reportar.
2. **Solo los archivos permitidos** por el encargo: otros trabajadores pueden estar en paralelo. Trabajar solo en el worktree y la rama del encargo, nunca en `main`. No fusionar, no hacer push y no desplegar.
3. **Test primero:** seguir los pasos en orden. Cada test se escribe y se ejecuta, y se ve fallar antes de implementar; después se ejecuta y se ve pasar.
4. **Ante un fallo, buscar la causa antes de cambiar código.** Si al segundo intento no se resuelve, detenerse y reportar lo observado.
5. **Nada está terminado sin evidencia:** ejecutar todas las verificaciones del encargo y copiar su resultado en la entrega.
6. **No editar la documentación de Claude Code:** `docs/00-inicio.md`, `docs/decisiones/`, `docs/arquitectura/`, `docs/superpowers/` ni `docs/README.md`, salvo que el encargo lo permita expresamente. Si algo de ella parece incorrecto, indicarlo en la entrega.
7. Ante una ambigüedad que exija cambiar la arquitectura, una interfaz o el alcance: preguntar, no decidir.
8. No versionar secretos. `.env.example` lleva solo valores ficticios.

## Entrega a Claude Code

Hacer commit en la rama del encargo y responder con: commit (SHA) y rama, archivos cambiados, verificaciones ejecutadas con su resultado, lo que no se pudo verificar y por qué, y dudas, riesgos o desviaciones del encargo.

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
