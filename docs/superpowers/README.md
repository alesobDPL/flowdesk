# Superpowers

[Volver al índice](../00-indice.md)

Las skills locales están en [`.agents/skills`](../../.agents/skills/using-superpowers/SKILL.md). Consultar su versión instalada al realizar cada tarea.

## Flujo para nuevas funcionalidades

1. Consultar la documentación relevante y usar [brainstorming](../../.agents/skills/brainstorming/SKILL.md) para aclarar necesidades, restricciones y decisiones pendientes.
2. Presentar los enfoques viables con sus ventajas y costes; acordar un enfoque antes de redactar el diseño.
3. Redactar el diseño en [specs](specs/README.md). Para proyectos, aplicar la revisión prevista por brainstorming antes de entregarlo al usuario.
4. Obtener aprobación explícita del documento de diseño y registrar su fecha y contexto. Una propuesta pendiente no autoriza implementación.
5. Usar [writing-plans](../../.agents/skills/writing-plans/SKILL.md) y guardar el plan en [plans](plans/README.md), enlazado al diseño aprobado.
6. Antes de implementar, revisar el plan con el usuario y acordar el método de ejecución según la skill y las instrucciones vigentes.
7. Actualizar la documentación afectada y aplicar [verification-before-completion](../../.agents/skills/verification-before-completion/SKILL.md) antes de declarar el trabajo completado.

La solicitud actual prepara únicamente documentación e instrucciones; no autoriza implementar funcionalidades ni define un diseño de aplicación.

## Convenciones

| Documento | Ruta desde la raíz |
| --- | --- |
| Diseño | `docs/superpowers/specs/YYYY-MM-DD-<tema>-design.md` |
| Plan | `docs/superpowers/plans/YYYY-MM-DD-<tema>.md` |

Usar la fecha real de creación y un tema breve en minúsculas, separado por guiones. No crear diseños o planes ficticios para rellenar las carpetas. Sus páginas README documentan las convenciones y mantienen las carpetas en Git.
