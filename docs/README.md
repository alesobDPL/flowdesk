# Documentación de FlowDesk

FlowDesk centraliza las solicitudes internas de una empresa con un flujo trazable. La primera versión es una demo pública: un empleado pide acceso a una herramienta, un aprobador decide y un técnico de TI concede el acceso.

| Documento | Contenido | Estado |
| --- | --- | --- |
| [Diseño del MVP](superpowers/specs/2026-11-22-flowdesk-mvp-design.md) | Alcance, permisos, estados, pantallas, arquitectura, datos, API, seguridad de la demo, pruebas y despliegue | Aprobado el 2026-11-22 |
| [Plan de implementación](superpowers/plans/2026-11-22-flowdesk-mvp.md) | Tareas pequeñas y verificables, agrupadas en encargos | Aprobado el 2026-11-22 |

**Stack:** Next.js + TypeScript, API Node.js + TypeScript (Fastify) y PostgreSQL.

**Cómo se trabaja:** primero se diseña, luego se planifica y por último se implementa con pruebas. Cada etapa necesita una aprobación explícita. Las reglas para los agentes de IA que colaboran en el proyecto están en [AGENTS.md](../AGENTS.md) y [CLAUDE.md](../CLAUDE.md).

Las convenciones de cada carpeta están en [specs](superpowers/specs/README.md) y [plans](superpowers/plans/README.md).

## Pruebas

Desde la raíz, `pnpm test` ejecuta los proyectos `shared`, `api-unit` y `api-integration`. Solo `api-integration` necesita Docker para iniciar PostgreSQL mediante Testcontainers. `pnpm --filter @flowdesk/api test` ejecuta ambos proyectos de la API.

Para ejecutar las pruebas compartidas y unitarias de la API, sin Docker:

```sh
pnpm exec vitest run --config vitest.workspace.ts --project shared --project api-unit
```

En PowerShell, si la política de ejecución bloquea `pnpm.ps1`, se puede usar `pnpm.cmd` con los mismos argumentos.

La prueba de integración de espacios y sesiones se ejecuta con Docker disponible:

```sh
pnpm exec vitest run --config vitest.workspace.ts --project api-integration apps/api/test/integration/demo-session.test.ts
```

## Espacios y sesiones de demo

La configuración de la API se valida con Zod en [`config.ts`](../apps/api/src/config.ts). `DATABASE_URL` es obligatoria; [`.env.example`](../.env.example) documenta los valores de desarrollo y los límites por defecto del plan. El proxy de confianza queda desactivado si no se define `TRUST_PROXY_CIDR`.

[`DemoSpaceService`](../apps/api/src/demo/spaces/space.service.ts) crea cada espacio en una transacción con tres identidades, cinco solicitudes de ejemplo en español o inglés y una sesión de empleado. Los ejemplos no consumen cuota; el contador de códigos empieza en cinco. La reserva de capacidad usa un bloqueo asesor transaccional para serializar las creaciones concurrentes.

[`SessionService`](../apps/api/src/demo/session/session.service.ts) resuelve el token por su hash SHA-256 y construye el actor con los usuarios y roles del espacio. La caducidad combina el límite absoluto con la ventana de inactividad; la actividad se escribe como máximo una vez por minuto. Ambos servicios reciben un reloj inyectable.

[`createDemoScopeHooks`](../apps/api/src/demo/limits/scope-hooks.ts) reserva la cuota y asigna el código de cada solicitud dentro de la transacción de `RequestService`. Las actualizaciones condicionales impiden superar la cuota con creaciones concurrentes. Los cinco ejemplos no consumen cuota y las nuevas solicitudes empiezan en `FD-0006`.

[`runCleanup`](../apps/api/src/demo/cleanup/cleanup.ts) borra los espacios caducados en lotes, respetando el margen de limpieza configurado. Usa un bloqueo asesor transaccional distinto del de creación; toda la ejecución ocupa una misma conexión y el bloqueo se libera al confirmar o revertir. `startCleanupScheduler` registra el recuento, si la ejecución se omitió y la duración en milisegundos; registra errores sin detener la programación. Su función de parada cancela el temporizador.

[`getTourProgress`](../apps/api/src/demo/tour/tour.service.ts) calcula los cuatro pasos del recorrido a partir de las solicitudes del visitante y sus eventos. Los ejemplos y los datos de otros espacios quedan excluidos; liberar una solicitud no borra el paso de asignación ya realizado.

Con Docker disponible, las pruebas de integración de Task 7 se ejecutan con:

```sh
pnpm exec vitest run --config vitest.workspace.ts --project api-integration demo-limits cleanup tour
```
