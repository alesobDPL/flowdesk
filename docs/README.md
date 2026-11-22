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

Desde la raíz, `pnpm test` ejecuta los proyectos `shared`, `api-unit`, `api-integration` y `web`. Solo `api-integration` necesita Docker para iniciar PostgreSQL mediante Testcontainers. `pnpm --filter @flowdesk/api test` ejecuta ambos proyectos de la API y `pnpm --filter @flowdesk/web test` ejecuta las pruebas web en jsdom.

Para ejecutar las pruebas compartidas, unitarias de la API y web, sin Docker:

```sh
pnpm exec vitest run --config vitest.workspace.ts --project shared --project api-unit --project web
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

## Base HTTP (Task 8)

[`buildApp`](../apps/api/src/http/app.ts) recibe la configuración, la base de datos y un reloj opcional. Registra cookies, límites globales por hash de sesión o IP, control de origen para mutaciones, resolución de sesión y errores JSON uniformes. Los logs JSON omiten las cabeceras y truncan las IP a IPv4 /24 o IPv6 /48. `GET /api/v1/health` ejecuta `SELECT 1`; `GET /api/v1/session` devuelve `SessionInfo`.

Además del límite por sesión (`RATE_LIMIT_PER_MIN`, 120 por defecto), un limitador global independiente por IP aplica `RATE_LIMIT_PER_IP_MIN` (300 por defecto) antes de resolver sesiones. Incluye salud y rutas desconocidas; rotar cookies falsas no reinicia ese cupo. Ambos límites por minuto respetan `TRUST_PROXY_CIDR` y devuelven el formato estándar `429 RATE_LIMITED`.

Con las variables de entorno configuradas, `pnpm --filter @flowdesk/api dev` inicia el modo de desarrollo y `pnpm --filter @flowdesk/api start` inicia la API. Ambos usan `tsx`; el proceso escucha en `0.0.0.0:PORT`. `SIGTERM` y `SIGINT` cierran la aplicación, detienen el programador de limpieza y cierran el pool. `pnpm --filter @flowdesk/api migrate` ejecuta las migraciones; no se ejecutan al recibir peticiones.

Las pruebas unitarias de HTTP se ejecutan sin Docker con el comando anterior. Con Docker disponible:

```sh
pnpm exec vitest run --config vitest.workspace.ts --project api-integration http-foundation
```

Las pruebas de origen y `trustProxy` usan `POST /api/v1/test-mutation`, registrada solo dentro de las pruebas. El helper [`newVisitor`](../apps/api/test/helpers/http.ts) crea un visitante y añade su cookie, origen y tipo JSON a las peticiones siguientes.

## Rutas HTTP (Task 9)

Las rutas de [`demo`](../apps/api/src/http/routes/demo.ts), [`sesión`](../apps/api/src/http/routes/session.ts), [`solicitudes`](../apps/api/src/http/routes/requests.ts) y [`recorrido`](../apps/api/src/http/routes/tour.ts) usan el prefijo `/api/v1`. Solo salud y creación de espacios permiten peticiones sin sesión. Las rutas protegidas resuelven la identidad actual del servidor en cada petición; los identificadores o roles enviados por el cliente no construyen el actor.

Crear un espacio con una sesión vigente devuelve `200 SessionInfo` sin crear otro espacio ni renovar la cookie; crear uno nuevo o reiniciar devuelve `201 SessionInfo` y establece `fd_session` con los atributos de la configuración. Las creaciones y los reinicios comparten una sola instancia del limitador por IP y hora, además de los límites globales por minuto. La reanudación no consume el cupo horario de creación: el límite de creación se evalúa después de comprobar si la sesión está vigente. Se usa un limitador compartido porque la configuración por ruta del plugin crea almacenes independientes incluso con la misma clave.

Los cuerpos y filtros se validan con los esquemas compartidos; la fecha de creación se evalúa con el reloj inyectado en `America/Santiago`. Un identificador que no sea UUID produce `404 NOT_FOUND`. Un cursor inválido produce `400 VALIDATION_ERROR` en `details.fields.cursor` antes de llegar al servicio o a SQL.

Con Docker disponible, las pruebas de Task 9 se ejecutan con:

```sh
pnpm exec vitest run --config vitest.workspace.ts --project api-integration routes-
```

Incluyen el recorrido de nueve pasos, permisos, identidad desactualizada, cuota, concurrencia y aislamiento. La prueba de asignación concurrente inserta un segundo usuario con rol `it_agent` y sesión propia; en esa fixture reutiliza el alias de demo `employee`, liberado para respetar su unicidad por espacio. Las pruebas unitarias de los adaptadores HTTP, validaciones y límites también se ejecutan sin Docker.

## Base web (Task 10)

`pnpm --filter @flowdesk/web dev` inicia Next.js en el puerto 3000; en desarrollo, `/api/*` se reenvía a la API local del puerto 4000. Para los comandos de Next.js se usa `NEXT_TELEMETRY_DISABLED=1` (en PowerShell: `$env:NEXT_TELEMETRY_DISABLED = '1'`). Desarrollo y build usan Webpack con `extensionAlias` para resolver los imports ESM `.js` de `@flowdesk/shared` a su fuente TypeScript. El build transpila ese paquete y usa fuentes del sistema.

La raíz redirige a `/es` si `Accept-Language` empieza por `es`, y a `/en` en los demás casos. La bienvenida consulta la sesión y permite continuarla o crear una demo con el idioma de entrada. La ruta interna `/demo-expired` se muestra como `/es/demo-caducada` o `/en/demo-expired`. El selector cambia el idioma sin mutar la sesión. Las páginas de `/app` se implementan en las tareas 11–13; todavía pueden devolver 404.

Los mensajes de ambos idiomas comparten claves verificadas por pruebas, incluidos los errores de API y los códigos de validación. El cliente envía JSON y credenciales del mismo origen; el navegador añade `Origin` a las mutaciones. Las pruebas de bienvenida cubren reanudación, creación, doble envío, capacidad, límite de peticiones y nueva demo tras caducar. La comprobación manual con la API y un navegador queda a cargo del revisor.
