# FlowDesk

[English](README.md) · **Demo: próximamente**

FlowDesk es una demo de portafolio de un flujo de solicitudes de acceso a
software, construida con Next.js, Fastify y PostgreSQL. Usa una empresa ficticia y
datos de ejemplo.

## Problema y solución

Las solicitudes de acceso repartidas entre correo, chat y hojas de cálculo hacen
difícil saber quién debe actuar o por qué se tomó una decisión. FlowDesk da a cada
solicitud un responsable, un estado y un historial: un empleado pide acceso, un
aprobador decide y un técnico de TI registra que se concedió manualmente.

El visitante puede probar las tres perspectivas sin registrarse. Cada visitante
recibe un espacio de demo aislado y temporal. El cambio de identidad simula los
roles de la demo; no es un sistema de inicio de sesión para producción. El MVP
cubre nuevos accesos a software para el solicitante, sin concesión automática,
integraciones externas ni interfaz de administración.

## Capturas de pantalla

Interfaz en inglés, viewport de escritorio de 1280 × 800 y Pixel 7. Las capturas
incluyen la página completa para mostrar el historial del detalle. Las imágenes
se generan con `pnpm screenshots`; los comandos se indican más abajo.

| Pantalla                 | Vista previa                                                                |
| ------------------------ | --------------------------------------------------------------------------- |
| Bienvenida               | ![Bienvenida y entrada a la demo](docs/assets/welcome-en.png)               |
| Solicitudes del empleado | ![Solicitudes con estado y búsqueda](docs/assets/requester-list-en.png)     |
| Nueva solicitud          | ![Formulario de acceso a software](docs/assets/new-request-en.png)          |
| Detalle                  | ![Solicitud completada con su historial](docs/assets/request-detail-en.png) |
| Bandeja de aprobación    | ![Solicitudes pendientes del aprobador](docs/assets/approvals-inbox-en.png) |
| Cola de TI               | ![Solicitudes aprobadas disponibles para TI](docs/assets/it-queue-en.png)   |
| Formulario móvil         | ![Nueva solicitud en un Pixel 7](docs/assets/mobile-new-request-en.png)     |

## Funcionalidades y recorrido guiado

- Creación de solicitudes, filtro por estado, búsqueda y detalle para el empleado.
- Bandeja del aprobador con comentarios de aprobación y motivos de rechazo obligatorios.
- Cola de TI con asignación, liberación con motivo y notas de finalización.
- Historial con responsable, evento, fecha y nota opcional.
- Interfaz en español e inglés, navegación adaptable y panel de recorrido guiado.
- Cinco solicitudes de ejemplo, continuación, reinicio y caducidad de la demo.

Reserva **3–5 minutos** para el recorrido guiado:

1. Elige **Probar demo** para entrar como Laura, la empleada.
2. Crea una **Nueva solicitud** con el software y la justificación.
3. Consulta su estado **Pendiente de aprobación** y la primera entrada del historial.
4. Usa **Viendo como** para cambiar a Diego, el aprobador.
5. Abre tu solicitud en la bandeja y apruébala.
6. Cambia a Ana, la técnica de TI.
7. Abre tu solicitud en la cola de TI y elige **Asignarme**.
8. Elige **Completar** y registra que el acceso se concedió manualmente.
9. Vuelve a Laura y consulta la solicitud completada y sus cuatro entradas de historial.

El panel **Recorrido guiado** marca creación, decisión, asignación y finalización
a partir de las solicitudes del visitante; los ejemplos no cuentan. **Reiniciar
demo** abre un espacio nuevo. Por defecto, el espacio caduca a las dos horas o
tras 30 minutos de inactividad y permite crear 30 solicitudes, sin contar los
ejemplos. Los límites son configurables en [la referencia de entorno](.env.example).

## Arquitectura

Rutas entre componentes del [diseño aprobado](docs/superpowers/specs/2026-11-22-flowdesk-mvp-design.md):

```mermaid
flowchart LR
    Browser[Navegador] -->|HTTPS| Caddy[Caddy: rutas del mismo origen]
    Caddy -->|/api/*| API[API: Node.js / Fastify]
    Caddy -->|resto de rutas| Web[Web: Next.js]
    API --> DB[(PostgreSQL)]
```

En desarrollo, Next.js reenvía `/api/*` a la API. El navegador siempre usa el origen de
la web; la API controla sesiones, autorización y reglas de negocio. Next.js no
contiene lógica de negocio ni accede a la base de datos.

| Componente                                      | Responsabilidad                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| [apps/web](apps/web/package.json)               | Páginas traducidas, formularios, vistas por rol y consultas a la API |
| [apps/api](apps/api/package.json)               | API HTTP bajo `/api/v1`, reglas de solicitudes y ciclo de la demo    |
| [packages/shared](packages/shared/src/index.ts) | Tipos del dominio, DTO, fechas y esquemas Zod                        |

## Decisiones clave

- **Aislamiento por espacio.** Las consultas filtran por el `scopeId` del actor.
  Las claves foráneas compuestas incluyen `demo_space_id` e impiden referencias
  entre espacios en la base de datos. El borrado de un espacio caducado elimina
  sus datos en cascada.
- **Actualizaciones condicionales e historial transaccional.** Cada transición
  usa un `UPDATE` condicionado a la versión, el estado y la asignación aplicable.
  El cambio de estado y la inserción del evento comparten transacción. Dos
  intentos simultáneos de asignación no pueden crear dos responsables ni eventos
  de asignación duplicados; el intento que pierde recibe `409`.
- **Separación entre `core` y `demo`.** `core` aplica las reglas de solicitudes
  usando un `Actor` con `userId`, roles y `scopeId`. `demo` resuelve la sesión y
  construye ese actor en el servidor; también gestiona espacios, cuotas y limpieza.
  El navegador no puede proporcionar el actor ni elegir un identificador de espacio.
- **Sesión y caducidad.** La cookie `fd_session` es `HttpOnly`, `SameSite=Lax` y
  `Secure` en producción. Solo se almacena su hash SHA-256. Cada petición a la API
  comprueba la vigencia del espacio y la identidad actual del servidor. Las
  mutaciones exigen el origen configurado y contenido JSON. La limpieza elimina
  los espacios caducados en lotes tras un período de margen.

## Stack

| Área                | Herramientas                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Entorno y workspace | Node.js 26, pnpm 12, TypeScript 6                                                           |
| Web                 | Next.js 16, React 19, next-intl, TanStack Query, React Hook Form, Tailwind CSS 4, shadcn/ui |
| API y datos         | Fastify 5, Drizzle ORM, PostgreSQL 18, Zod 4                                                |
| Verificación        | Vitest, Testing Library, Testcontainers, Playwright, axe, ESLint, Prettier, GitHub Actions  |

## Ejecución local

Para probar las imágenes con Compose y Caddy, seguir la
[guía de despliegue](docs/despliegue/README.md). Incluye el recorrido contra
`PLAYWRIGHT_BASE_URL`; cualquier actuación en el VPS requiere autorización expresa.

Requisitos: **Node.js 26** (ver [.nvmrc](.nvmrc)), Docker con Compose v2 y el motor
de Docker iniciado. Ejecuta los comandos desde la raíz del repositorio después
de clonarlo. Corepack se instala explícitamente porque Node.js 26 no lo incluye.

```sh
npm install -g corepack@latest
corepack enable
pnpm install
docker compose -f compose.dev.yaml up -d --wait
```

La API no carga automáticamente un archivo `.env` de la raíz. En la terminal
donde ejecutarás las migraciones e iniciarás la API, exporta estos valores de
desarrollo local tomados de [.env.example](.env.example).

Bash:

```sh
export DATABASE_URL='postgresql://flowdesk:flowdesk_dev_only@127.0.0.1:5432/flowdesk'
export APP_ORIGIN='http://localhost:3000'
```

PowerShell:

```powershell
$env:DATABASE_URL = 'postgresql://flowdesk:flowdesk_dev_only@127.0.0.1:5432/flowdesk'
$env:APP_ORIGIN = 'http://localhost:3000'
```

Ejecuta las migraciones e inicia la API en esa misma terminal (puerto 4000 por defecto):

```sh
pnpm --filter @flowdesk/api migrate
pnpm --filter @flowdesk/api dev
```

En una segunda terminal, inicia la aplicación web:

```sh
pnpm --filter @flowdesk/web dev
```

Abre [español](http://localhost:3000/es) o [inglés](http://localhost:3000/en).
La ruta de salud de la API es `http://localhost:4000/api/v1/health`. No hay un
comando raíz `pnpm dev`: inicia los dos procesos por separado. Si el puerto 3000
está ocupado, configura `APP_ORIGIN` de la API como `http://localhost:3100` antes
de iniciarla y ejecuta `pnpm --filter @flowdesk/web exec next dev --webpack -p 3100`
para la web.

Para verificar la compilación de producción de la web:

```sh
pnpm --filter @flowdesk/web build
```

## Pruebas

| Nivel                       | Cobertura                                                                                                        | Comando                                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Unitarias y componentes web | Validación compartida, máquina de estados, permisos, adaptadores de API y comportamiento de la interfaz          | `pnpm exec vitest run --config vitest.workspace.ts --project shared --project api-unit --project web` |
| Integración de API          | PostgreSQL real: rutas, autorización, aislamiento, concurrencia, caducidad, cuotas, limpieza y control de origen | `pnpm exec vitest run --config vitest.workspace.ts --project api-integration`                         |
| Todos los proyectos Vitest  | Pruebas unitarias, web y de integración de API                                                                   | `pnpm test`                                                                                           |
| End-to-end                  | Flujo en navegador, ciclo de demo, aislamiento, doble envío y análisis de accesibilidad                          | `pnpm test:e2e`                                                                                       |

Las pruebas de integración necesitan Docker; Testcontainers crea su instancia de
PostgreSQL. Para las pruebas de navegador, instala Chromium una vez después de
instalar las dependencias:

```sh
pnpm --filter @flowdesk/web exec playwright install chromium
pnpm test:e2e
```

Detén antes los servidores de desarrollo para que Playwright los inicie con el
origen de pruebas. El comando e2e inicia y espera a PostgreSQL mediante Compose, ejecuta migraciones,
compila la web con el proxy de API y deja que Playwright inicie la API y la web
compilada. Los puertos web/API predeterminados son 3100/4000; configura
`E2E_WEB_PORT` y `E2E_API_PORT` en el entorno si necesitas cambiarlos.
`DATABASE_URL` usa por defecto la URL del ejemplo local.

El recorrido en español se ejecuta en Chromium de escritorio y Pixel 7; el de
inglés, en escritorio. Se prueban continuación, reinicio, caducidad, dos contextos
de navegador aislados y doble envío. axe analiza bienvenida, listado, formulario,
detalle, bandeja y cola en español y escritorio, sin infracciones graves ni
críticas. Estas comprobaciones no sustituyen una auditoría completa de
accesibilidad. [CI](.github/workflows/ci.yml) ejecuta las verificaciones y pruebas
e2e, conservando el informe de Playwright si hay un fallo.

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm screenshots
```

`pnpm screenshots` usa la misma preparación y variables de puertos que e2e, crea
espacios nuevos en inglés y guarda los siete PNG indicados arriba en
`docs/assets/`. Los casos de capturas quedan excluidos de la suite e2e normal.
En PowerShell, usa `pnpm.cmd` si la política de ejecución bloquea `pnpm.ps1`.

## Documentación y contribuciones

El [índice de documentación](docs/README.md) describe los componentes implementados
y los comandos. Las reglas de contribución y proceso están en
[AGENTS.md](AGENTS.md) y [CLAUDE.md](CLAUDE.md).

## Licencia

Publicado bajo la [licencia MIT](LICENSE).
