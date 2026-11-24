# Instrucciones para Claude Code

Punto de entrada de Claude Code en FlowDesk. Las reglas comunes están en [AGENTS.md](AGENTS.md). Si algo parece contradecirlas, prevalece la regla más restrictiva y se consulta al propietario.

## Al iniciar una sesión

1. Usar Superpowers, comenzando por `using-superpowers`.
2. Usar la skill `proyecto-ordenado` en modo **retomar**: leer solo el bloque de estado de [docs/00-inicio.md](docs/00-inicio.md) y la nota que enlaza en `docs/privado/bitacora/`. Abrir la [documentación técnica](docs/README.md), specs o plans solo si el siguiente paso lo exige.
3. Distinguir siempre **Aprobado**, **Propuesto** y **Pendiente**. Una recomendación anterior no es una decisión aprobada.

El descubrimiento, los encargos, la infraestructura del VPS y la bitácora están en `docs/privado/`: ignorado por este repo y versionado en su propio repo privado. No se publican. Al terminar una sesión, usar `proyecto-ordenado` en modo **cerrar**.

Solo Claude Code edita `docs/` (estado, bitácora, ADR, arquitectura, specs y plans). Cada decisión de arquitectura aprobada genera un ADR en `docs/decisiones/`.

## Fases y aprobaciones

1. **Diseño:** brainstorming → `docs/superpowers/specs/` → revisión independiente → aprobación explícita del propietario.
2. **Plan:** writing-plans → `docs/superpowers/plans/` → aprobación explícita del propietario.
3. **Implementación por Codex:** cada encargo identifica el diseño y el plan, las tareas autorizadas, los límites, los criterios de aceptación y las verificaciones exigidas.
4. **Revisión por Claude Code:** revisar el diff contra el diseño y el plan, sin fiarse del resumen del implementador. Presentar los hallazgos con severidad, archivo, evidencia e impacto, separando defectos de sugerencias. La aceptación final es del propietario.

Registrar cada aprobación con su fecha y alcance. No deducir una aprobación de una preferencia anterior.

## Delegación a Codex

- Delegar solo tareas del plan aprobado, mediante el plugin oficial de Codex para Claude Code (`/codex:rescue`).
- Cada encargo se guarda en `docs/privado/encargos/` desde su plantilla y se envía **completo** a Codex: SHA base, archivos permitidos, rutas exactas de spec y plan, pasos con sus tests y verificaciones. Codex no ve `docs/privado/` ni usa Superpowers: la disciplina viaja en el encargo y en [AGENTS.md](AGENTS.md).
- Cada encargo se ejecuta en un git worktree y una rama propios, nunca sobre `main`. Varios encargos en paralelo solo si el plan los marca sin archivos ni dependencias compartidos.
- Claude Code puede pedir hasta tres rondas de corrección por encargo dentro del alcance aprobado. Ante una decisión arquitectónica nueva, un cambio de alcance, un riesgo importante o un bloqueo, detenerse y consultar al propietario.
- Codex trabaja con sandbox limitado al espacio de trabajo y aprobación bajo petición, sin modos de permisos irrestrictos.
- No activar bucles automáticos de revisión entre agentes sin acuerdo del propietario.

## Límites

- Nunca fusionar ramas, hacer push, publicar imágenes, desplegar ni actuar sobre el servidor sin autorización explícita y específica del propietario.
- No instalar dependencias ni crear scaffolding fuera de una tarea del plan aprobado.
- No versionar secretos, `.env`, respaldos ni datos de infraestructura. Nunca mostrar ni solicitar claves privadas o frases de paso.
- Preservar el trabajo existente y los cambios sin commit, y no editar a la vez el mismo archivo que Codex.

Al terminar un encargo, entregar al propietario: resumen de cambios, archivos afectados, verificaciones realizadas con sus resultados, lo que no se pudo verificar, problemas pendientes y la rama resultante.
