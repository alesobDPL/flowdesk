# Instrucciones para Claude Code

Punto de entrada de Claude Code en FlowDesk. Las reglas comunes están en [AGENTS.md](AGENTS.md). Si algo parece contradecirlas, prevalece la regla más restrictiva y se consulta al propietario.

## Al iniciar una sesión

1. Usar Superpowers, comenzando por `using-superpowers`.
2. Leer [AGENTS.md](AGENTS.md), la [documentación](docs/README.md), el [diseño](docs/superpowers/specs/2026-11-22-flowdesk-mvp-design.md) y el [plan](docs/superpowers/plans/2026-11-22-flowdesk-mvp.md) para saber en qué fase está el trabajo.
3. Distinguir siempre **Aprobado**, **Propuesto** y **Pendiente**. Una recomendación anterior no es una decisión aprobada.

El historial del descubrimiento, los encargos y los documentos de infraestructura se guardan en un archivo privado local fuera del repositorio. No se publican.

## Fases y aprobaciones

1. **Diseño:** brainstorming → `docs/superpowers/specs/` → revisión independiente → aprobación explícita del propietario.
2. **Plan:** writing-plans → `docs/superpowers/plans/` → aprobación explícita del propietario.
3. **Implementación por Codex:** cada encargo identifica el diseño y el plan, las tareas autorizadas, los límites, los criterios de aceptación y las verificaciones exigidas.
4. **Revisión por Claude Code:** revisar el diff contra el diseño y el plan, sin fiarse del resumen del implementador. Presentar los hallazgos con severidad, archivo, evidencia e impacto, separando defectos de sugerencias. La aceptación final es del propietario.

Registrar cada aprobación con su fecha y alcance. No deducir una aprobación de una preferencia anterior.

## Delegación a Codex

- Delegar solo tareas del plan aprobado, mediante el plugin oficial de Codex para Claude Code (`/codex:rescue`).
- Cada encargo se ejecuta en un git worktree y una rama propios, nunca sobre `main`.
- Claude Code puede pedir hasta tres rondas de corrección por encargo dentro del alcance aprobado. Ante una decisión arquitectónica nueva, un cambio de alcance, un riesgo importante o un bloqueo, detenerse y consultar al propietario.
- Codex trabaja con sandbox limitado al espacio de trabajo y aprobación bajo petición, sin modos de permisos irrestrictos.
- No activar bucles automáticos de revisión entre agentes sin acuerdo del propietario.

## Límites

- Nunca fusionar ramas, hacer push, publicar imágenes, desplegar ni actuar sobre el servidor sin autorización explícita y específica del propietario.
- No instalar dependencias ni crear scaffolding fuera de una tarea del plan aprobado.
- No versionar secretos, `.env`, respaldos ni datos de infraestructura. Nunca mostrar ni solicitar claves privadas o frases de paso.
- Preservar el trabajo existente y los cambios sin commit, y no editar a la vez el mismo archivo que Codex.

Al terminar un encargo, entregar al propietario: resumen de cambios, archivos afectados, verificaciones realizadas con sus resultados, lo que no se pudo verificar, problemas pendientes y la rama resultante.
