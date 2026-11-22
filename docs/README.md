# Documentación de FlowDesk

FlowDesk centraliza las solicitudes internas de una empresa con un flujo trazable. La primera versión es una demo pública: un empleado pide acceso a una herramienta, un aprobador decide y un técnico de TI concede el acceso.

| Documento | Contenido | Estado |
| --- | --- | --- |
| [Diseño del MVP](superpowers/specs/2026-11-22-flowdesk-mvp-design.md) | Alcance, permisos, estados, pantallas, arquitectura, datos, API, seguridad de la demo, pruebas y despliegue | Aprobado el 2026-11-22 |
| [Plan de implementación](superpowers/plans/2026-11-22-flowdesk-mvp.md) | Tareas pequeñas y verificables, agrupadas en encargos | Aprobado el 2026-11-22 |

**Stack:** Next.js + TypeScript, API Node.js + TypeScript (Fastify) y PostgreSQL.

**Cómo se trabaja:** primero se diseña, luego se planifica y por último se implementa con pruebas. Cada etapa necesita una aprobación explícita. Las reglas para los agentes de IA que colaboran en el proyecto están en [AGENTS.md](../AGENTS.md) y [CLAUDE.md](../CLAUDE.md).

Las convenciones de cada carpeta están en [specs](superpowers/specs/README.md) y [plans](superpowers/plans/README.md).
