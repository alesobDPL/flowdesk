# Diseño del MVP de FlowDesk

[Diseños](README.md) · [Plan](../plans/2026-11-22-flowdesk-mvp.md) · [Documentación](../../README.md)

Fecha: 2026-11-22. Estado: **Aprobado por el propietario el 2026-11-22.** Redactado por Claude Code a partir del descubrimiento cerrado. La aprobación del diseño no autoriza implementar: el plan elaborado con writing-plans requiere su propia aprobación.

## Cómo leer este documento

Cada decisión lleva una de estas marcas:

- **[Aprobado]**: decisión del propietario ya registrada, con su fecha. Se cita, no se reabre.
- **[Propuesto]**: decisión de diseño de Claude Code que el propietario aprueba o corrige al aprobar este documento.
- **[Constructor]**: detalle que Codex puede resolver durante la implementación sin cambiar lo que se construye.
- **[Aplazado]**: fuera del MVP; se conserva para evolución posterior.

Fuentes: el descubrimiento con el propietario, los criterios de calidad aprobados, la comparativa de stack y el estado del servidor. Se conservan en un archivo privado fuera del repositorio; este documento recoge todo lo necesario para construir el MVP.

---

## 1. Intención, destinatarios y éxito

**Qué es.** FlowDesk centraliza solicitudes internas de una empresa que hoy se pierden entre correo, chat y hojas de cálculo. El MVP cubre un único flujo: **un empleado solicita acceso a una herramienta de software, un aprobador decide, un técnico de TI concede el acceso manualmente y todo queda trazado.**

**Para qué.** [Aprobado 2026-11-04] Es una demostración profesional de portafolio con una empresa ficticia y datos ficticios. Debe demostrar capacidades Full Stack (arquitectura, datos, API, autenticación, permisos, reglas de negocio, pruebas y despliegue) y que el propietario pueda explicar cada decisión.

**Destinatarios.** Reclutadores y desarrolladores que llegan desde GitHub, LinkedIn o el portafolio y prueban la demo sin registrarse [Aprobado 2026-11-20].

**Criterios de éxito** [Aprobado 2026-11-04], convertidos en aceptación verificable en la sección 11:

1. El flujo principal funciona de principio a fin.
2. Los permisos y las reglas críticas se verifican correctamente.
3. Las pruebas principales se ejecutan satisfactoriamente.
4. El despliegue es reproducible.
5. Un reclutador comprende el proyecto mediante GitHub y prueba sus funciones principales de forma segura.

**Resultados que harían fracasar el MVP aunque "funcione":**

- Un visitante ve o modifica datos de otro visitante.
- La autorización depende de lo que envía el navegador (rol, identidad o identificador de espacio).
- Una persona aprueba o ejecuta su propia solicitud.
- Dos técnicos quedan asignados a la misma solicitud.
- La demo pública agota la memoria o el disco del VPS.
- El código es tan elaborado que el propietario no puede explicarlo.

## 2. Alcance

### Incluido [Propuesto]

| Área | Contenido |
| --- | --- |
| Bienvenida | Página breve: qué es FlowDesk, qué problema resuelve y botón «Probar demo». |
| Espacio de demo | Creación automática sin registro, tres identidades ficticias, cambio de identidad, reinicio de la demo, caducidad y limpieza. |
| Solicitudes | Crear una solicitud de nuevo acceso a software para la cuenta propia. |
| Aprobación | Bandeja del aprobador; aprobar con comentario opcional o rechazar con motivo obligatorio. |
| Ejecución | Cola compartida de TI; tomar una solicitud, liberarla con motivo o marcarla como completada. |
| Consulta | Listados por rol con filtro por estado y búsqueda por texto; detalle con historial completo. |
| Datos de ejemplo | Solicitudes precargadas en distintos estados al crear cada espacio. |
| Recorrido guiado | Panel lateral con los pasos del recorrido de 3 a 5 minutos. |
| Calidad | Validación en frontend y backend, autorización por recurso, control de concurrencia, pruebas unitarias, de integración y end-to-end, CI y despliegue reproducible. |

### Excluido del MVP [Propuesto]

| Exclusión | Motivo | Estado |
| --- | --- | --- |
| Rol de administrador y su interfaz | Con tres identidades fijas por espacio no surgen los conflictos que lo justificaban (ver 3.3). Una interfaz administrativa también abriría operaciones peligrosas en una demo pública. | [Aplazado] |
| Aprobador alternativo ante conflicto | Depende del administrador. Se sustituye por un bloqueo explícito al crear (ver 3.3). | [Aplazado] |
| Liberación forzada por administrador | Depende del administrador. Se mantiene la liberación voluntaria. | [Aplazado] |
| Modificación y eliminación de accesos | Decidido en el descubrimiento. | [Aplazado] |
| Solicitudes para terceros | Requiere reglas adicionales. | [Aplazado] |
| Cancelación por el solicitante y solicitudes «no ejecutables» | No forman parte del flujo principal. El técnico puede liberar con motivo. | [Aplazado] |
| Solicitar información adicional | No definido en el descubrimiento; añade estados. | [Aplazado] |
| Catálogo de software, roles por aplicación, formularios dinámicos, adjuntos | Excluidos en el descubrimiento. | [Aplazado] |
| Notificaciones por correo o tiempo real | No son necesarias para el recorrido; la interfaz refleja el estado al recargar o navegar. | [Aplazado] |
| Integraciones externas y concesión automática | Restricción del propietario: concesión manual. | [Aprobado 2026-11-04] |
| Multiempresa, organizaciones o infraestructura por visitante | Restricción aprobada. | [Aprobado 2026-11-04 y 2026-11-20] |
| Inicio de sesión real con contraseña | La demo no lo necesita; ver la separación de la sección 6.3. | [Aplazado] |
| SLA, escalamiento, reasignación automática, balanceo | Excluidos en el descubrimiento. | [Aplazado] |

### Evolución prevista sin construirla

El modelo usa una tabla de tipos de solicitud con un único tipo («Acceso a software»). Añadir otro tipo, como uno de Recursos Humanos, significaría añadir una fila, su configuración de aprobador y su formulario. No se construye un motor de flujos ni formularios dinámicos [Propuesto].

## 3. Roles, permisos y visibilidad

### 3.1 Identidades de la demo [Aprobado 2026-11-20]

Cada espacio de demo tiene tres usuarios ficticios. Los nombres son [Constructor]; por ejemplo:

| Identidad | Usuario ficticio | Rol |
| --- | --- | --- |
| Empleado | Laura Méndez, Marketing | `requester` |
| Aprobador | Diego Rojas, Jefe de TI | `approver` |
| Técnico de TI | Ana Torres, Soporte TI | `it_agent` |

### 3.2 Matriz de permisos [Propuesto]

El modelo admite varios roles por usuario (tabla `user_roles`), porque en una empresa real una persona puede ser solicitante y aprobador a la vez. En la demo cada identidad tiene un solo rol.

| Acción | `requester` | `approver` | `it_agent` | Regla adicional comprobada en el backend |
| --- | --- | --- | --- | --- |
| Crear solicitud | Sí | No | No | El solicitante es siempre el usuario de la sesión. |
| Ver solicitud | Las propias | Las asignadas a él para aprobar | Las de estado `approved`, `in_progress`, `completed` | Siempre dentro del mismo espacio. |
| Aprobar / rechazar | No | Sí | No | Debe ser el aprobador asignado, distinto del solicitante, y el estado debe ser `pending_approval`. |
| Tomar de la cola | No | No | Sí | Estado `approved`, sin técnico asignado y técnico distinto del solicitante. |
| Liberar | No | No | Sí | Solo el técnico asignado, con motivo obligatorio. |
| Completar | No | No | Sí | Solo el técnico asignado, distinto del solicitante. |

Las reglas de no decidir ni ejecutar solicitudes propias [propuestas por el usuario en el descubrimiento] se implementan en el dominio y se cubren con pruebas unitarias, aunque la demo no pueda provocarlas.

### 3.3 Conflictos con tres identidades [Propuesto]

En la demo solo el Empleado puede crear solicitudes, así que el aprobador y el técnico nunca coinciden con el solicitante. Para el producto se definen dos reglas, ambas validadas en el backend:

- Si el tipo no tiene aprobador configurado, se rechaza el envío con un mensaje claro (código `APPROVER_NOT_CONFIGURED`). Coincide con la propuesta del descubrimiento.
- Si el aprobador configurado es el propio solicitante, también se rechaza el envío (`SELF_APPROVAL_CONFLICT`). El descubrimiento proponía dejar la solicitud pendiente de un aprobador alternativo designado por un administrador. Como el MVP no tiene administrador, esa solicitud quedaría bloqueada para siempre. Rechazar el envío es más sencillo y no deja datos huérfanos. **Decisión que el propietario debe confirmar.**

## 4. Ciclo de vida de una solicitud

### 4.1 Estados y transiciones [Propuesto]

```
                 aprobar                 tomar                  completar
pending_approval ───────▶ approved ─────────────▶ in_progress ───────────▶ completed
       │                     ▲                         │
       │ rechazar            └──────── liberar ────────┘
       ▼
   rejected
```

| Estado | Etiqueta en la interfaz | Significado |
| --- | --- | --- |
| `pending_approval` | Pendiente de aprobación | Creada; espera la decisión del aprobador asignado. |
| `rejected` | Rechazada | Estado final, con motivo. |
| `approved` | Aprobada · en cola de TI | En la cola compartida, sin técnico. |
| `in_progress` | En ejecución | Un técnico la tomó y es responsable. |
| `completed` | Completada | Estado final: el técnico registró la concesión manual. |

| Transición | Actor | Datos exigidos |
| --- | --- | --- |
| crear → `pending_approval` | requester | Campos del formulario (4.3). |
| `pending_approval` → `approved` | aprobador asignado | Comentario opcional (≤ 500 caracteres). |
| `pending_approval` → `rejected` | aprobador asignado | Motivo obligatorio (10–500 caracteres). |
| `approved` → `in_progress` | it_agent ≠ solicitante | Ninguno. |
| `in_progress` → `approved` (liberar) | técnico asignado | Motivo obligatorio (10–500 caracteres). La aprobación y el historial se conservan. |
| `in_progress` → `completed` | técnico asignado ≠ solicitante | Nota de finalización opcional (≤ 500 caracteres). |

Cualquier otra transición devuelve `409 INVALID_TRANSITION`. Los estados `rejected` y `completed` son finales.

### 4.2 Historial [Propuesto]

Tabla `request_events` de solo inserción. Cada transición, incluida la creación, inserta un evento con: tipo (`created`, `approved`, `rejected`, `assigned`, `released`, `completed`), actor, estado anterior, estado nuevo, comentario o motivo y fecha. El evento se inserta **en la misma transacción** que el cambio de estado. El detalle muestra el historial como línea de tiempo. La solicitud también guarda columnas de consulta rápida: `approver_id`, `decided_at`, `assignee_id`, `completed_by`, `completed_at`.

### 4.3 Formulario de nueva solicitud [Propuesto]

| Campo | Obligatorio | Validación |
| --- | --- | --- |
| Software o herramienta | Sí | Texto de 2 a 100 caracteres, sin espacios iniciales ni finales. Texto libre, sin catálogo. |
| Nivel de acceso | Sí | `read` (Lectura), `edit` (Edición), `admin` (Administración) u `other` (Otro). |
| Detalle del rol | Solo si el nivel es `other` | Texto de 2 a 100 caracteres. |
| Justificación | Sí | Texto de 10 a 1000 caracteres. |
| Fecha requerida | No | Fecha igual o posterior a hoy, en la zona horaria del servidor, America/Santiago [Constructor]. |
| Comentarios | No | Hasta 1000 caracteres. |

El tipo de operación no se muestra: en el MVP solo existe «nuevo acceso» y el tipo de solicitud es único. Se guarda `request_type_id` para la evolución futura; no se crea un campo `operation` [Propuesto]. El backend registra automáticamente solicitante, fecha de creación, UUID interno y un código legible por espacio (`FD-0001`, `FD-0002`, …). El formulario incluye un aviso: «No incluyas contraseñas ni credenciales».

### 4.4 Concurrencia [Propuesto]

Cada transición se ejecuta como una única sentencia `UPDATE` condicional dentro de una transacción, con el evento insertado a continuación:

```sql
UPDATE requests
   SET status = 'in_progress', assignee_id = $actor, version = version + 1, updated_at = now()
 WHERE id = $id AND demo_space_id = $space
   AND status = 'approved' AND assignee_id IS NULL AND requester_id <> $actor
RETURNING *;
```

Si no se actualiza ninguna fila, el servicio relee la solicitud para devolver un error preciso: `404` si no existe en ese espacio, `403` si el actor no tiene permiso y `409` si cambió de estado. Así, dos técnicos que toman la misma solicitud a la vez obtienen un `200` y un `409`, sin bloqueos explícitos. Las restricciones `CHECK` de la base de datos refuerzan las invariantes: `in_progress` exige `assignee_id`, y `approved` y `pending_approval` lo prohíben.

## 5. Experiencia y pantallas

### 5.1 Recorrido [Propuesto, objetivo de 3 a 5 minutos]

Los 9 pasos del recorrido son:

1. Ingresar como empleado.
2. Crear una solicitud de acceso a software.
3. Consultar su estado inicial.
4. Ingresar como aprobador.
5. Encontrar la solicitud pendiente y aprobarla.
6. Ingresar como técnico de TI.
7. Tomar la solicitud de la cola de trabajo.
8. Registrar que el acceso se concedió manualmente.
9. Volver a la cuenta del empleado y consultar el estado final y el historial.

Se muestran como instrucciones en un panel lateral plegable, «Recorrido guiado». Solo se marcan como hechos los cuatro pasos que dejan datos: crear, decidir (aprobar o rechazar), tomar y completar. Además, solo cuentan las solicitudes creadas por el visitante (`is_sample = false`). Los pasos de solo consulta («Ingresar como…», «Consultar el estado», «Ver el historial») son guía sin casilla. No se guarda el estado del recorrido ni un registro de cambios de identidad, y el panel no impone un orden. [Propuesto, ajustado tras la revisión del constructor]

### 5.2 Pantallas [Propuesto]

```
┌──────────────────────────────────────────────────────────────────┐
│ FlowDesk   Demo · caduca en 1 h 52 min        Viendo como: [Laura Méndez · Empleado ▾] │
├──────────┬───────────────────────────────────────────────────────┤
│ Mis      │  Mis solicitudes                     [+ Nueva solicitud] │
│ solicitu-│  [Estado ▾] [Buscar…            ]                      │
│ des      │  FD-0006  Figma        Pendiente de aprobación   hoy    │
│          │  FD-0001  Salesforce   Completada               12 nov  │
│          │  …                                                      │
│ Recorrido│                                                         │
│ guiado ▸ │                                    [Reiniciar demo]    │
└──────────┴───────────────────────────────────────────────────────┘
```

| Ruta | Pantalla | Visible para |
| --- | --- | --- |
| `/` | Redirección al idioma (5.4); bienvenida en `/es` o `/en` con «Probar demo» | Todos |
| `/app` | Redirige al listado del rol activo | Con sesión |
| `/app/solicitudes` | Mis solicitudes | requester |
| `/app/solicitudes/nueva` | Formulario de nueva solicitud | requester |
| `/app/aprobaciones` | Bandeja: pestañas «Pendientes» y «Decididas» | approver |
| `/app/cola` | Cola de TI: pestañas «Disponibles», «Asignadas a mí» y «Completadas» | it_agent |
| `/app/solicitudes/[id]` | Detalle: datos, estado, acciones disponibles para el rol e historial | Según la matriz 3.2 |
| `/demo-caducada` | Aviso de demo caducada con botón para empezar otra | Todos |

Elementos comunes: el selector de identidad en la cabecera cambia de rol sin perder datos; el tiempo restante del espacio; «Reiniciar demo», con confirmación, crea un espacio nuevo. Acciones con confirmación y diálogo de motivo cuando corresponda; mensajes de éxito y error comprensibles; estados vacíos útiles («No hay solicitudes en la cola. Aprueba una como Diego para verla aquí»).

Si la API devuelve `403` en una ruta del frontend porque el rol cambió (por ejemplo, el detalle de una solicitud que el nuevo rol no puede ver), se redirige al listado del rol con un aviso. No se muestra un error técnico.

### 5.3 Calidad visual y accesibilidad [Propuesto]

- Responsive desde 360 px de ancho; en móvil, la navegación lateral pasa a un menú.
- Objetivo WCAG 2.2 AA: contraste, foco visible, navegación completa por teclado, etiquetas y errores asociados a cada campo, y estados que no dependan solo del color (insignia con texto).
- Comprobación automática con axe en las pruebas end-to-end; ninguna infracción grave o crítica.
- **Idiomas** [Aprobado 2026-11-22: español e inglés]. Ver 5.4.

### 5.4 Idiomas [Aprobado 2026-11-22: español e inglés; mecanismo Propuesto]

- **Rutas con prefijo de idioma:** `/es/...` y `/en/...`. La raíz `/` redirige según `Accept-Language` (español si empieza por `es`; si no, inglés). Así un enlace compartido en LinkedIn abre siempre en el idioma elegido. Las rutas de 5.2 se entienden bajo ese prefijo.
- **Selector de idioma** en la cabecera y en la bienvenida. Cambiar de idioma no cambia la sesión ni los datos.
- **Librería:** next-intl, con archivos de mensajes `messages/es.json` y `messages/en.json` en `apps/web`. Una prueba falla si las dos lenguas no tienen exactamente las mismas claves.
- **La API no traduce.** Devuelve códigos estables (`INVALID_TRANSITION`, códigos de validación por campo) y la interfaz los traduce. El campo `message` de la API queda en inglés, solo para depuración.
- **Datos de ejemplo en el idioma de entrada.** `POST /demo/spaces` recibe `{ "locale": "es" | "en" }` y genera los usuarios ficticios y las 5 solicitudes de ejemplo en ese idioma. Si el visitante cambia de idioma después, la interfaz cambia, pero los textos ya escritos (justificaciones, motivos) se quedan como están, igual que en una aplicación real.
- **Fechas y números** se formatean con `Intl` según el idioma activo.
- **README:** `README.md` en inglés, el idioma por defecto en GitHub, y `README.es.md` en español, enlazados entre sí.
- **Documentación interna** (`docs/`): se mantiene en español.

## 6. Arquitectura

### 6.1 Enfoques considerados

| Enfoque | Ventaja | Coste | Decisión |
| --- | --- | --- | --- |
| A. Next.js + API Node.js + TypeScript + PostgreSQL | Stack conocido por el propietario; esfuerzo centrado en el producto. | Dos aplicaciones que coordinar. | **[Aprobado 2026-11-22]** |
| B. Next.js + API en Go + PostgreSQL | Aprendizaje de Go. | Más incertidumbre de esfuerzo. | Descartado |
| Next.js completo (route handlers como API) | Una sola aplicación. | El propietario prefiere una API independiente; mezcla interfaz y dominio. | Descartado en el descubrimiento |

Para el aislamiento entre visitantes:

| Opción | Decisión |
| --- | --- |
| Columna `demo_space_id` en las tablas de negocio y filtrado obligatorio en los repositorios, con claves foráneas compuestas | **[Propuesto]**: la más simple de explicar y probar. |
| Row Level Security de PostgreSQL | Descartada: más difícil de depurar y de explicar para este alcance. Podría añadirse después como defensa adicional. |
| Esquema o base de datos por visitante | Prohibido por la restricción aprobada. |

### 6.2 Componentes [Propuesto]

```
Navegador ──HTTPS──▶ Caddy (VPS, nativo)
                       ├── /api/*  ──▶ api (Node.js, contenedor, 127.0.0.1)
                       └── /*      ──▶ web (Next.js, contenedor, 127.0.0.1)
                                         api ──▶ postgres (contenedor, red interna)
```

- **Mismo origen.** Caddy publica la web y la API bajo un único dominio. La cookie de sesión es de primera parte y no se necesita CORS.
- **web.** Next.js (App Router) como interfaz. Los componentes cliente llaman a `/api/*` desde el navegador. No hay lógica de negocio ni acceso a la base de datos en Next.js; tampoco una capa BFF. En desarrollo, Next.js reenvía `/api/*` a la API mediante `rewrites`.
- **api.** Aplicación Node.js modular. Única autoridad de sesión, autorización y reglas.
- **postgres.** Solo accesible desde la red interna de Docker.

### 6.3 Módulos de la API y separación de la lógica de demo [Propuesto]

```
apps/api/src/
  core/                 reglas de FlowDesk, sin conocimiento de la demo
    requests/           entidad, máquina de estados, políticas de permisos, servicio, repositorio
    users/              usuarios y roles
  demo/                 todo lo específico de la demo pública
    spaces/             creación de espacios, datos de ejemplo, reinicio
    session/            cookie, identidad activa, cambio de identidad
    limits/             cuotas y límites de frecuencia
    cleanup/            caducidad y limpieza
  http/                 rutas, validación de entrada, mapeo de errores
  db/                   esquema, migraciones y conexión
```

El núcleo recibe en cada operación un **actor** construido por el backend:

```ts
type Actor = { userId: string; roles: Role[]; scopeId: string };
```

- `core` no sabe qué es una demo. Solo exige que toda lectura y escritura filtre por `scopeId` y compruebe permisos y reglas sobre el recurso.
- `demo/session` es el único código que traduce la cookie en un `Actor`. En una instalación empresarial futura se sustituiría por un inicio de sesión real que construya el mismo `Actor`, con un único `scopeId` fijo, sin tocar `core`.
- La columna se llama `demo_space_id` en la base de datos por claridad. En `core` se maneja como `scopeId` [Constructor: mantener esta convención].

### 6.4 Tecnologías propuestas [Propuesto]

Versiones: la estable vigente con soporte de cada herramienta, verificada y fijada en el plan. No se fijan aquí números que puedan quedar desactualizados.

| Necesidad | Propuesta | Motivo |
| --- | --- | --- |
| Monorepo | pnpm workspaces: `apps/web`, `apps/api`, `packages/shared` | Comparte esquemas de validación y tipos sin publicar paquetes. |
| Runtime | Node.js LTS activa | Soporte de seguridad durante el proyecto. |
| Framework de API | Fastify | Validación por esquema, buen soporte de TypeScript, ligero y con plugins oficiales de cookies y límite de frecuencia. |
| Validación | Zod en `packages/shared`, usado por el formulario y por la API | Una sola definición de reglas para frontend y backend; el backend siempre vuelve a validar. |
| Acceso a datos | Drizzle ORM con migraciones SQL versionadas de drizzle-kit | SQL explícito y legible, adecuado para explicar las sentencias condicionales de concurrencia; tipos generados a partir del esquema. |
| Base de datos | PostgreSQL estable vigente | Aprobado. |
| Interfaz | Next.js + Tailwind CSS + componentes accesibles basados en Radix (shadcn/ui) | Calidad SaaS sin diseñar componentes base desde cero; los componentes se copian al repositorio y se pueden leer y explicar. |
| Formularios | React Hook Form con el resolver de Zod | Validación en el cliente con los mismos esquemas. |
| Internacionalización | next-intl | Soporte del App Router para rutas con prefijo de idioma y mensajes tipados. |
| Datos en el cliente | TanStack Query | Caché, recarga tras mutaciones y estados de carga y error coherentes. |
| Logs | pino (incluido en Fastify), JSON estructurado | Sin datos personales; las IP no se registran completas. |
| Pruebas | Vitest (unitarias e integración), PostgreSQL real con Testcontainers, Playwright + axe (end-to-end) | Ver la sección 10. |
| Calidad estática | TypeScript estricto, ESLint y Prettier | — |
| CI | GitHub Actions: lint, tipos, pruebas y build de imágenes | Reproducible y visible en el repositorio público. |

## 7. Modelo de datos [Propuesto]

```
demo_spaces (id uuid PK, created_at, hard_expires_at, last_seen_at,
             status ['active','ended'], ended_at NULL, request_seq int, requests_created int)

users       (id uuid PK, demo_space_id FK → demo_spaces ON DELETE CASCADE,
             display_name, job_title, demo_identity ['employee','approver','it_agent'] NULL,
             UNIQUE (demo_space_id, id), UNIQUE (demo_space_id, demo_identity))

user_roles  (demo_space_id, user_id, role ['requester','approver','it_agent'],
             PK (user_id, role), FK (demo_space_id, user_id) → users)

request_types (id smallint PK, key 'software_access', name)                      -- global, semilla de migración

approver_assignments (demo_space_id, request_type_id, approver_id,
             PK (demo_space_id, request_type_id), FK (demo_space_id, approver_id) → users)

requests    (id uuid PK, demo_space_id, code text, request_type_id,
             requester_id, approver_id, assignee_id NULL,
             software_name, access_level, access_detail NULL, justification,
             needed_by date NULL, comments NULL,
             status, decision_comment NULL, decided_at NULL,
             completion_note NULL, completed_by NULL, completed_at NULL,
             is_sample bool, version int, created_at, updated_at,
             UNIQUE (demo_space_id, code), UNIQUE (demo_space_id, id),
             FK (demo_space_id, requester_id|approver_id|assignee_id|completed_by) → users (demo_space_id, id),
             CHECK coherencia estado/assignee (4.4))

request_events (id bigserial PK, demo_space_id, request_id, type, actor_id,
             from_status NULL, to_status, note NULL, created_at,
             FK (demo_space_id, request_id) → requests (demo_space_id, id) ON DELETE CASCADE,
             FK (demo_space_id, actor_id) → users (demo_space_id, id))

sessions    (id uuid PK, token_hash bytea UNIQUE, demo_space_id FK ON DELETE CASCADE,
             active_user_id, created_at,
             FK (demo_space_id, active_user_id) → users (demo_space_id, id))
```

Decisiones clave:

- **Cascada completa.** Todas las tablas con `demo_space_id` tienen una clave foránea `demo_space_id → demo_spaces(id) ON DELETE CASCADE`: `users`, `user_roles`, `approver_assignments`, `requests`, `request_events` y `sessions`. Las claves compuestas hacia `users` y `requests` usan `NO ACTION`, no `RESTRICT`. Así PostgreSQL las comprueba al final de la sentencia de borrado en cascada y no la bloquea.

- **Claves foráneas compuestas con `demo_space_id`.** La base de datos impide relacionar una solicitud con un usuario de otro espacio, aunque el código tuviera un error.
- **Borrado en cascada desde `demo_spaces`.** La limpieza elimina un espacio y todos sus datos con una sola sentencia por espacio.
- **Código legible.** `FD-0001` se genera con `UPDATE demo_spaces SET request_seq = request_seq + 1 … RETURNING request_seq` dentro de la transacción de creación. Es seguro ante concurrencia y la numeración es propia de cada espacio.
- **Índices** [Constructor, con estos mínimos]: `requests (demo_space_id, status)`, `requests (demo_space_id, requester_id)`, `requests (demo_space_id, approver_id)`, `request_events (request_id, created_at)`, `demo_spaces (hard_expires_at)`, `demo_spaces (last_seen_at)`.
- `request_types` es global porque es configuración del producto. `approver_assignments` vive dentro del espacio porque apunta a usuarios del espacio.

### Datos de ejemplo por espacio [Propuesto]

Al crear un espacio, `demo/spaces` inserta en una transacción los tres usuarios, sus roles, la asignación del aprobador y **5 solicitudes de ejemplo** con historial coherente, todas de la Empleada:

| Código | Software | Estado | Para qué sirve |
| --- | --- | --- | --- |
| FD-0001 | Salesforce | `completed` | Historial completo para consultar. |
| FD-0002 | Adobe Acrobat Pro | `rejected` | Rechazo con motivo. |
| FD-0003 | Jira | `in_progress`, asignada a Ana | Ejemplo de «Asignadas a mí». |
| FD-0004 | Tableau | `approved` | Ya disponible en la cola de TI. |
| FD-0005 | Notion | `pending_approval` | Ya visible en la bandeja de Diego. |

Los ejemplos tienen `is_sample = true` y fechas relativas a la creación del espacio. No cuentan para la cuota de creación. Las nuevas solicitudes del visitante continúan desde `FD-0006`. El panel del recorrido solo considera las solicitudes con `is_sample = false`.

## 8. API [Propuesto]

Prefijo `/api/v1`. JSON. Toda ruta, salvo la creación del espacio y la salud, exige una sesión válida.

| Método y ruta | Uso | Notas |
| --- | --- | --- |
| `POST /demo/spaces` | Crear un espacio y su sesión | Devuelve la cookie y el perfil activo (Empleada). Si la petición trae una sesión vigente, **no crea nada** y devuelve esa sesión para reanudarla. La bienvenida muestra «Continuar demo» cuando `GET /session` responde 200. |
| `POST /demo/spaces/reset` | Reiniciar la demo | Marca el espacio actual como `ended`, que deja de contar para el tope de 500, y crea uno nuevo. Cuenta para el límite por IP. |
| `GET /session` | Sesión actual | Identidad activa, roles, identidades disponibles y `expiresAt`. |
| `PUT /session/identity` | Cambiar de identidad | Cuerpo `{ "identity": "approver" }`. El backend busca ese usuario **en el espacio de la sesión**. |
| `GET /requests` | Listado según el rol | `?view=mine\|approvals_pending\|approvals_decided\|queue\|assigned\|completed&status=&q=&cursor=` |
| `POST /requests` | Crear | requester |
| `GET /requests/:id` | Detalle con historial y `allowedActions` | `allowedActions` lo calcula el backend; la interfaz solo lo usa para mostrar botones. |
| `POST /requests/:id/approve` | Aprobar | `{ comment? }` |
| `POST /requests/:id/reject` | Rechazar | `{ reason }` |
| `POST /requests/:id/assign` | Tomar de la cola | — |
| `POST /requests/:id/release` | Liberar | `{ reason }` |
| `POST /requests/:id/complete` | Completar | `{ note? }` |
| `GET /demo/tour` | Progreso del recorrido | Calculado a partir de los datos del espacio. |
| `GET /health` | Salud | Comprueba la conexión a la base de datos; sin datos sensibles. |

Las acciones son rutas explícitas en lugar de un `PATCH` genérico del estado. Cada una corresponde a una regla del dominio y se prueba por separado.

**Paginación y búsqueda.** Paginación por cursor, 20 elementos por página. Búsqueda `q` con `ILIKE` sobre `code` y `software_name`, con un máximo de 100 caracteres. Con como mucho 35 solicitudes por espacio no se necesita búsqueda de texto completo.

**Errores.** Formato uniforme:

```json
{ "error": { "code": "INVALID_TRANSITION", "message": "La solicitud ya fue tomada por otra persona.", "details": {} } }
```

| HTTP | Uso |
| --- | --- |
| 400 `VALIDATION_ERROR` | Entrada inválida; `details` incluye los errores por campo. |
| 401 `SESSION_REQUIRED` / `SESSION_EXPIRED` | Sin sesión o sesión caducada; la interfaz lleva a `/demo-caducada`. |
| 403 `FORBIDDEN` | El rol no permite la acción sobre un recurso visible. |
| 404 `NOT_FOUND` | No existe **o pertenece a otro espacio**. No se revela la diferencia. |
| 409 `INVALID_TRANSITION` | El estado cambió o la transición no es válida. |
| 422 `APPROVER_NOT_CONFIGURED`, `SELF_APPROVAL_CONFLICT`, `QUOTA_EXCEEDED` | Regla de negocio o cuota. |
| 429 `RATE_LIMITED` / 503 `DEMO_AT_CAPACITY` | Límites de la demo (sección 9). |
| 500 `INTERNAL_ERROR` | Mensaje genérico; el detalle solo va al log con un identificador de petición. |

## 9. Sesión, aislamiento, límites y limpieza [Propuesto]

### 9.1 Sesión e identidad

- `POST /demo/spaces` genera un token aleatorio de 32 bytes (`crypto.randomBytes`). La base de datos guarda **solo su hash SHA-256**.
- La cookie `fd_session` es `HttpOnly`, `Secure` (en producción), `SameSite=Lax`, `Path=/` y sin `Domain`. Su `Max-Age` llega hasta `hard_expires_at` y no se renueva.
- **Caducidad.** La sesión no tiene caducidad propia: vale mientras su espacio esté vigente. Un espacio está vigente si cumple tres condiciones: `status = 'active'`; `now() < hard_expires_at`, que es 2 horas después de la creación; y `now() < last_seen_at + 30 min`, una ventana de inactividad que se desliza con el uso.
- **Escrituras de actividad.** `last_seen_at` se actualiza como mucho una vez por minuto por espacio (`UPDATE … WHERE last_seen_at < now() - interval '1 minute'`), para no escribir en cada petición.
- **Cuenta atrás.** `GET /session` devuelve `expiresAt = min(hard_expires_at, last_seen_at + 30 min)`, y la cabecera muestra ese valor.
- En cada petición, la API busca la sesión por hash y comprueba que su espacio esté vigente. Después construye el `Actor` con `active_user_id`, sus roles y el `demo_space_id`. Nada del cliente interviene en el `Actor`.
- Cambiar de identidad solo modifica `active_user_id`, tras comprobar que el usuario pertenece al espacio de la sesión.
- **CSRF.** Además de `SameSite=Lax`, toda petición que cambia datos debe llevar la cabecera `Origin` igual al origen configurado y `Content-Type: application/json`; si no, devuelve `403`. Las acciones sin datos (`assign`, `reset` y `POST /demo/spaces`) envían `{}` como cuerpo.
- **Cabeceras.** Caddy y Next.js añaden `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy` y `frame-ancestors 'none'` [Constructor: la CSP concreta].

### 9.2 Valores propuestos

| Parámetro | Valor | Motivo |
| --- | --- | --- |
| Duración máxima de un espacio | 2 horas desde su creación | Suficiente para el recorrido y para explorar; acota los datos acumulados. |
| Caducidad por inactividad | 30 minutos sin peticiones | Libera espacios abandonados antes. |
| Solicitudes creadas por espacio | 30 (los 5 ejemplos no cuentan) | Permite repetir el recorrido muchas veces. |
| Creación de espacios por IP | 10 por hora | Frena la creación automatizada. |
| Espacios activos en total | 500 | Tope de seguridad para el VPS; por encima, `503 DEMO_AT_CAPACITY` con un mensaje amable. |
| Peticiones por sesión | 120 por minuto, mutaciones incluidas | Frena scripts sin molestar a una persona. |
| Tamaño máximo del cuerpo | 16 KB | Ningún formulario se acerca. |

Todos son configurables por variables de entorno. Se revisarán con mediciones reales en el VPS. El límite por IP se mantiene en memoria del proceso (`@fastify/rate-limit`), basta con una instancia de la API y no persiste las IP. La API confía en `X-Forwarded-For` solo cuando la conexión viene del proxy. Caddy corre en el host y la API en un contenedor, así que la API no ve loopback como origen, sino la puerta de enlace de la red Docker. Por eso `trustProxy` recibe la subred fija de esa red, definida en `compose.yaml` y pasada por la variable `TRUST_PROXY_CIDR`. Una prueba de integración comprueba dos cosas: desde la red de confianza, dos IP distintas en `X-Forwarded-For` tienen cubos de límite separados; desde cualquier otra procedencia, la cabecera se ignora.

### 9.3 Limpieza

- Una tarea dentro de la API se ejecuta cada 10 minutos. Toma `pg_try_advisory_lock` para que nunca corran dos limpiezas a la vez.
- Borra en lotes de 50 los espacios cuya vigencia terminó hace más de 15 minutos: `hard_expires_at < now() - 15 min`, `last_seen_at < now() - 45 min` o `status = 'ended' AND ended_at < now() - 15 min`. La cascada elimina usuarios, solicitudes, eventos y sesiones.
- **Margen de 15 minutos.** Una petición que validó su sesión justo antes de caducar termina su transacción antes de que la limpieza borre el espacio. Si aun así la limpieza ya lo borró, una transición no actualiza filas y la relectura devuelve `404`; una creación falla por clave foránea y recibe un error controlado. En ningún caso quedan datos huérfanos. La cookie de un espacio ya borrado produce `401 SESSION_REQUIRED`, y la de un espacio caducado que aún no se borró, `401 SESSION_EXPIRED`.
- La tarea registra cuántos espacios borró y cuánto tardó. Una prueba de integración verifica que borra lo caducado y nada más.

### 9.4 Operaciones peligrosas

No hay rutas administrativas, de borrado masivo ni de configuración expuestas. La configuración del aprobador solo se crea por código al generar el espacio. Las migraciones se ejecutan en el despliegue, nunca desde una petición.

## 10. Estrategia de pruebas [Propuesto]

| Nivel | Herramienta | Qué cubre como mínimo |
| --- | --- | --- |
| Unitarias del dominio | Vitest | Máquina de estados: todas las transiciones válidas e inválidas. Políticas: la matriz 3.2 completa. Reglas: no aprobar ni ejecutar lo propio (con usuarios de varios roles), aprobador no configurado, conflicto de autoaprobación, motivos obligatorios. Esquemas Zod de entrada. |
| Integración API + PostgreSQL real | Vitest + Testcontainers | Todas las rutas con su autorización. **Aislamiento:** con la sesión del espacio A, leer, listar o modificar una solicitud del espacio B devuelve `404` y no cambia nada. **Cambio de identidad:** no puede apuntar a un usuario de otro espacio. **Concurrencia:** dos `assign` simultáneos dan un `200` y un `409` y queda un único evento `assigned`. Sesión caducada → `401`. Cuotas y límites → `422` y `429`. Limpieza. Origen inválido → `403`. Formato de errores. |
| End-to-end | Playwright | El recorrido completo de 9 pasos en escritorio y en un viewport móvil, en español; una pasada del recorrido en inglés. Reiniciar demo. Demo caducada. Dos contextos de navegador simultáneos que no ven los datos del otro. axe sin infracciones graves en cada pantalla principal. |

Las pruebas de integración y end-to-end corren en CI con PostgreSQL en contenedor. Cada encargo de Codex se acepta con las pruebas de su tarea en verde, según el plan.

## 11. Aceptación verificable del MVP [Propuesto]

La aceptación tiene dos hitos:

- **Hito 1, «listo para desplegar».** Cierra el plan de implementación. Incluye todo lo verificable en el repositorio y en CI, más un despliegue de prueba local con el mismo `compose.yaml`.
- **Hito 2, «desplegado».** Requiere el dominio y una autorización específica del propietario para actuar en el VPS. Sus pasos entran en el plan como tareas bloqueadas hasta esa autorización.

En la tabla, la marca (H2) señala lo que pertenece al segundo hito.

| Criterio aprobado | Evidencia de aceptación |
| --- | --- |
| Flujo principal de principio a fin | La prueba end-to-end del recorrido pasa en CI y en el despliegue local con `compose.yaml`. (H2) Una prueba manual en el despliegue público lo completa en 5 minutos o menos. |
| Permisos y reglas críticas | Pruebas unitarias y de integración de la matriz 3.2, las transiciones de 4.1, el aislamiento y la concurrencia, todas en verde. |
| Pruebas principales | CI en verde en la rama principal: lint, tipos, unitarias, integración y end-to-end. |
| Despliegue reproducible | Despliegue local desde cero siguiendo solo el README de despliegue y el `compose.yaml` versionado; `/api/v1/health` responde OK. (H2) Lo mismo en el VPS. |
| Comprensible y seguro para un reclutador | README público con problema, capturas, arquitectura, decisiones y cómo ejecutar. (H2) Enlace a la demo, accesible por HTTPS sin registro. |

## 12. Despliegue futuro [Propuesto, sin ejecutar]

**No se realizará ningún cambio en el VPS sin una autorización específica del propietario.**

- **Imágenes.** Dockerfiles multi-etapa para `web` (salida `standalone` de Next.js) y `api`. Se construyen en GitHub Actions y se publican en GitHub Container Registry, para no compilar en el VPS, que no tiene swap.
- **Ejecución.** `compose.yaml` con `web`, `api` y `postgres`. `web` y `api` publican puertos solo en `127.0.0.1`; `postgres` no publica puertos. Límites de memoria por servicio (valores iniciales [Constructor], ajustados con mediciones). `restart: unless-stopped` y healthchecks.
- **Entrada.** Caddy nativo, ya instalado, con un sitio para el dominio: HTTPS automático, `/api/*` → api y el resto → web.
- **Secretos.** Archivo `.env` en el VPS con permisos 0600, fuera del repositorio. El repositorio solo incluye `.env.example` con valores ficticios.
- **Migraciones.** Paso explícito del despliegue (`api migrate`) antes de arrancar la nueva versión.
- **Respaldo.** Los datos de la demo son efímeros; no se respaldan las solicitudes. Lo que hay que poder recrear es el código, las imágenes, el `compose.yaml`, la configuración de Caddy y el `.env`, documentados en el README de despliegue.
- **Pendiente para el propietario:** el dominio o subdominio de la demo. No bloquea el desarrollo; sí el despliegue.

## 13. Secuencia de entregas [Propuesto]

El plan dividirá cada fase en tareas pequeñas para Codex:

1. **Base.** Monorepo, herramientas, CI, PostgreSQL en desarrollo, esquema y migraciones.
2. **Dominio.** Máquina de estados, políticas y servicio de solicitudes con pruebas unitarias.
3. **Demo y sesión.** Espacios, datos de ejemplo, cookie, cambio de identidad, límites y limpieza, con pruebas de integración de aislamiento.
4. **API.** Rutas, validación, errores y pruebas de integración de permisos y concurrencia.
5. **Interfaz.** Internacionalización (es/en), bienvenida, selector de identidad, listados, formulario, detalle con acciones, recorrido guiado y accesibilidad.
6. **End-to-end y pulido.** Playwright, axe y README público en inglés y español.
7. **Despliegue.** Imágenes, `compose.yaml` y configuración de Caddy preparados en el repositorio. La ejecución en el VPS requiere autorización aparte.

## 14. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Memoria del VPS (2 CPU, sin swap) | Compilación fuera del VPS, límites por contenedor, tope de espacios activos y mediciones antes de publicar. |
| Abuso automatizado de la demo | Límites por IP y por sesión, cuotas por espacio, tope global y caducidad corta. |
| Fuga entre espacios por un error de código | Filtro obligatorio por `scopeId` en los repositorios, claves foráneas compuestas y pruebas de integración de aislamiento en cada ruta. |
| Complejidad que el propietario no pueda explicar | Sin RLS, sin colas externas, sin tiempo real; SQL explícito; módulos pequeños; cada encargo de Codex se revisa y se explica. |
| Dependencias desactualizadas | Versiones fijadas en el plan tras verificarlas y lockfile versionado. |

## 15. Lo que queda a criterio de Codex

Nombres ficticios y textos de la interfaz; organización interna de carpetas dentro de los módulos de 6.3; estilos visuales dentro de Tailwind y shadcn/ui; CSP concreta; límites de memoria iniciales; índices adicionales; detalles de los scripts de pnpm. Cualquier cosa que cambie la matriz de permisos, los estados, el modelo de aislamiento o el alcance requiere consultar al propietario.

## 16. Decisiones que el propietario debe revisar

1. Excluir el rol de administrador y sus funciones del MVP (sección 2).
2. Rechazar el envío ante un conflicto de autoaprobación en lugar de dejar la solicitud pendiente de un aprobador alternativo (3.3).
3. Solo la identidad Empleado crea solicitudes en la demo (3.2).
4. Los valores de caducidad y límites de 9.2.
5. Las tecnologías de 6.4: Fastify, Drizzle, Zod, Tailwind + shadcn/ui, TanStack Query, next-intl, Vitest, Testcontainers y Playwright.
6. El conjunto de 5 solicitudes de ejemplo (sección 7).
7. El mecanismo de idiomas de 5.4: rutas con prefijo y datos de ejemplo en el idioma de entrada. Los dos idiomas ya están aprobados.
8. La aceptación en dos hitos, con el despliegue en el VPS como tareas bloqueadas hasta tu autorización (sección 11).

## Registro de aprobación

- 2026-11-22: el propietario aprueba el stack A: Next.js + TypeScript, API Node.js + TypeScript y PostgreSQL.
- 2026-11-22: el propietario decide que la interfaz y el README público estén en español e inglés.
- **2026-11-22: el propietario aprueba el documento completo**, incluidas las decisiones de la sección 16 tal como están redactadas. Alcance: el diseño del MVP. No aprueba el plan ni autoriza implementar, desplegar ni actuar en el VPS. El dominio de la demo sigue pendiente.
