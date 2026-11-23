# Plan de implementación del MVP de FlowDesk

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

[Planes](README.md) · [Diseño aprobado](../specs/2026-11-22-flowdesk-mvp-design.md) · [Documentación](../../README.md)

Fecha: 2026-11-22. Estado: **Aprobado por el propietario el 2026-11-22.** Autoriza delegar a Codex los encargos E1 a E7 en el orden indicado. La tarea 17 sigue bloqueada.

**Goal:** Construir el MVP de FlowDesk descrito en el diseño aprobado, hasta el hito 1 («listo para desplegar»), y dejar preparadas como bloqueadas las tareas del hito 2.

**Architecture:** Monorepo pnpm con `apps/api` (Fastify + Drizzle + PostgreSQL), `apps/web` (Next.js App Router + next-intl) y `packages/shared` (tipos y esquemas Zod). `core` contiene las reglas de FlowDesk y recibe un `Actor`; `demo` construye ese `Actor` desde la cookie y gestiona espacios, límites y limpieza. El navegador llama a `/api/*` en el mismo origen.

**Tech Stack:** Node.js 26 LTS, pnpm 12, TypeScript 6.0, Fastify 5, Drizzle ORM 0.45 y drizzle-kit 0.31, pg 8, Zod 4, PostgreSQL 18, Next.js 16, React 19, next-intl 4, Tailwind CSS 4, shadcn/ui, React Hook Form 7, TanStack Query 5, Vitest 5, Testcontainers 12, Playwright 1.65, @axe-core/playwright 4, ESLint 10 y Prettier 3.

**Spec:** [docs/superpowers/specs/2026-11-22-flowdesk-mvp-design.md](../specs/2026-11-22-flowdesk-mvp-design.md). Quien ejecute una tarea lee también las secciones del diseño que la tarea cita.

## Global Constraints

- **Versiones.** Comprobadas en npm, nodejs.org y Docker Hub el 2026-11-22. Se fija la versión mayor y el lockfile versiona la exacta.
  - **TypeScript 6.0, no 7.0:** typescript-eslint 8 exige `typescript <6.1`.
  - **PostgreSQL 18, no 19.0:** se elige la versión mayor con más rodaje frente a una `.0` recién publicada.
- **Requisitos de plataforma.** `.nvmrc` = `26`. En `package.json`, `engines.node` = `>=26` y `packageManager` = `pnpm@12.21.0` (Corepack exige una versión completa). Node 26 ya no incluye Corepack: se instala con `npm install -g corepack@latest` y pnpm se activa con `corepack enable`.
- **TypeScript.** `strict: true`, `noUncheckedIndexedAccess: true` y ESM en todos los paquetes.
- **Nombres.** Identificadores de código y columnas en inglés. Documentación interna en español.
- **Valores fijos del diseño.** Sus límites (9.2) se leen de variables de entorno con estos valores por defecto:

  | Variable | Valor |
  | --- | --- |
  | `DEMO_SPACE_TTL_MIN` | 120 |
  | `DEMO_IDLE_MIN` | 30 |
  | `DEMO_MAX_REQUESTS` | 30 |
  | `DEMO_SPACES_PER_IP_HOUR` | 10 |
  | `DEMO_MAX_ACTIVE_SPACES` | 500 |
  | `RATE_LIMIT_PER_MIN` | 120 |
  | `RATE_LIMIT_PER_IP_MIN` | 300 |
  | `BODY_LIMIT_BYTES` | 16384 |
  | `CLEANUP_INTERVAL_MIN` | 10 |
  | `CLEANUP_GRACE_MIN` | 15 |
  | `CLEANUP_BATCH` | 50 |

- **Validación** (diseño 4.1 y 4.3):
  - **Textos.** Se recortan (`trim`) antes de validar su longitud.
  - **Formulario.** Software: 2–100 caracteres. Detalle del rol: 2–100, obligatorio solo con `other`. Justificación: 10–1000. Comentarios: ≤ 1000.
  - **Acciones.** Comentario de aprobación: ≤ 500. Motivo de rechazo o liberación: 10–500. Nota de finalización: ≤ 500.
  - **Búsqueda.** `q`: ≤ 100 caracteres.
  - **Fecha requerida.** Igual o posterior a hoy en `America/Santiago`.
- **Seguridad.**
  - El `Actor` solo lo construye `apps/api/src/demo/session`. Ningún identificador de usuario, rol ni espacio llega del cliente.
  - Toda consulta de `core` filtra por `scopeId`.
  - Cookie `fd_session`: `HttpOnly`, `SameSite=Lax`, `Path=/` y `Secure` cuando `NODE_ENV=production`.
  - Las mutaciones exigen un `Origin` igual a `APP_ORIGIN` y `Content-Type: application/json`.
- **Errores HTTP.** Formato `{ error: { code, message, details } }` con los códigos del diseño 8. `message` va en inglés; la interfaz traduce por `code`.
- **Idiomas.** Español e inglés en toda la interfaz. Las claves de `messages/es.json` y `messages/en.json` son idénticas. README en inglés (`README.md`) y en español (`README.es.md`).
- **Prohibiciones.** No acceder al VPS, no hacer push, no fusionar y no publicar imágenes sin autorización expresa del propietario. No versionar `.env` ni secretos.
- **Prohibiciones del diseño.** Sin rutas administrativas, sin RLS, sin colas externas, sin tiempo real.

## Review Focus

1. **Justificación de solo espacios o con emojis.** `"          "` (10 espacios) se rechaza por longitud tras recortar. 10 emojis cuentan como 10 caracteres visibles y se aceptan. Prueba en la tarea 2.
2. **`%` o `_` en la búsqueda.** Se buscan literalmente, no como comodines de `ILIKE`. Prueba en la tarea 5.
3. **Fecha requerida cerca de medianoche.** A las 23:30 en Santiago, que en UTC ya es el día siguiente, «hoy» sigue siendo la fecha de Santiago. Prueba en la tarea 2.
4. **Pestaña con identidad desactualizada.** Si se cambia de identidad en otra pestaña, la acción enviada por la primera se evalúa con la identidad actual del servidor. Devuelve `403` o `404` y no cambia nada. Prueba en la tarea 9.
5. **Doble clic en «Enviar» o en una acción.** Crea una sola solicitud o un solo evento: el botón se desactiva mientras la petición está en curso y el backend no admite una transición duplicada. Prueba en la tarea 14.

## Encargos para Codex y ramas

Según [CLAUDE.md](../../../CLAUDE.md), cada encargo se ejecuta en un worktree y una rama propios, que parten de `main`. Funcionan así:

- Claude Code revisa cada encargo contra el diseño y este plan, con hasta tres rondas de corrección.
- El propietario acepta el encargo y fusiona su rama. El siguiente encargo empieza después de esa fusión.

| Encargo | Rama | Tareas |
| --- | --- | --- |
| E1 Base | `feat/e1-base` | 1–3 |
| E2 Dominio | `feat/e2-domain` | 4–5 |
| E3 Demo y sesión | `feat/e3-demo` | 6–7 |
| E4 API HTTP | `feat/e4-api` | 8–9 |
| E5 Interfaz | `feat/e5-web` | 10–13 |
| E6 End-to-end y README | `feat/e6-e2e` | 14–15 |
| E7 Artefactos de despliegue | `feat/e7-deploy` | 16 |
| H2 Despliegue en el VPS | — | 17 (**bloqueada**) |

## Estructura de archivos

```
package.json  pnpm-workspace.yaml  tsconfig.base.json  eslint.config.mjs  .prettierrc.json
.nvmrc  .env.example  compose.dev.yaml  compose.yaml  vitest.workspace.ts
.github/workflows/ci.yml
packages/shared/src/
  domain.ts        constantes y tipos de dominio
  error-codes.ts   códigos de error
  schemas.ts       esquemas Zod de entrada
  dates.ts         todayIn(timeZone, now)
  api-types.ts     DTO de la API
  index.ts
apps/api/
  drizzle.config.ts  drizzle/ (migraciones SQL generadas)
  src/config.ts  src/server.ts  src/cli.ts
  src/db/schema.ts  src/db/client.ts  src/db/migrate.ts
  src/core/actor.ts
  src/core/requests/{errors,state-machine,policies,repository,service,mappers}.ts
  src/demo/session/{token,session.service}.ts
  src/demo/spaces/{seed-data,space.service}.ts
  src/demo/limits/scope-hooks.ts
  src/demo/cleanup/cleanup.ts
  src/demo/tour/tour.service.ts
  src/http/{app,errors,origin-guard,session-plugin}.ts
  src/http/routes/{health,demo,session,requests,tour}.ts
  test/helpers/{test-db,global-setup,factories,http}.ts
  test/unit/**  test/integration/**
  Dockerfile
apps/web/
  next.config.ts  playwright.config.ts  components.json  Dockerfile
  messages/{es,en}.json
  src/i18n/{routing,navigation,request}.ts   src/proxy.ts (middleware de next-intl según la convención de Next 16)
  src/lib/{api-client,queries,error-messages,format}.ts
  src/components/ui/** (shadcn)  src/components/{app-shell,identity-switcher,countdown,tour-panel,status-badge,request-table,request-filters,request-form,request-actions,reason-dialog,request-timeline}.tsx
  src/app/[locale]/{layout,page}.tsx  src/app/[locale]/demo-caducada/page.tsx (ruta interna /demo-expired)
  src/app/[locale]/app/{layout,page}.tsx
  src/app/[locale]/app/requests/{page.tsx,new/page.tsx,[id]/page.tsx}
  src/app/[locale]/app/approvals/page.tsx  src/app/[locale]/app/queue/page.tsx
  test/** (Vitest)  e2e/** (Playwright)
deploy/Caddyfile.example  docs/despliegue/README.md
README.md  README.es.md
```

Rutas internas en inglés (`/app/requests`). next-intl `pathnames` las localiza: en `es`, `/app/solicitudes`, `/app/solicitudes/nueva`, `/app/aprobaciones`, `/app/cola` y `/demo-caducada`; en `en`, se mantienen las internas.

---

## E1 · Base

### Task 1: Monorepo, herramientas y CI

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc.json`, `.nvmrc`, `vitest.workspace.ts`, `.github/workflows/ci.yml`, `packages/shared/{package.json,tsconfig.json,src/domain.ts,src/error-codes.ts,src/index.ts}`
- Modify: `.gitignore` (añadir `node_modules`, `.next`, `dist`, `coverage`, `playwright-report`, `test-results`, `.env`)
- Test: `packages/shared/test/domain.test.ts`

**Interfaces:**
- Produces, desde `@flowdesk/shared`:
  ```ts
  export const REQUEST_STATUSES = ['pending_approval','rejected','approved','in_progress','completed'] as const;
  export const ACCESS_LEVELS = ['read','edit','admin','other'] as const;
  export const ROLES = ['requester','approver','it_agent'] as const;
  export const DEMO_IDENTITIES = ['employee','approver','it_agent'] as const;
  export const LOCALES = ['es','en'] as const;
  export const REQUEST_ACTIONS = ['approve','reject','assign','release','complete'] as const;
  export const EVENT_TYPES = ['created','approved','rejected','assigned','released','completed'] as const;
  export const LIST_VIEWS = ['mine','approvals_pending','approvals_decided','queue','assigned','completed'] as const;
  export const TERMINAL_STATUSES: readonly RequestStatus[]; // ['rejected','completed']
  export type RequestStatus, AccessLevel, Role, DemoIdentity, Locale, RequestAction, EventType, ListView; // (typeof X)[number]
  export const ERROR_CODES = ['VALIDATION_ERROR','SESSION_REQUIRED','SESSION_EXPIRED','FORBIDDEN','NOT_FOUND',
    'INVALID_TRANSITION','APPROVER_NOT_CONFIGURED','SELF_APPROVAL_CONFLICT','QUOTA_EXCEEDED',
    'RATE_LIMITED','DEMO_AT_CAPACITY','INTERNAL_ERROR'] as const;
  export type ErrorCode = (typeof ERROR_CODES)[number];
  ```
- Produces, scripts raíz: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`.

- [ ] **Step 1: Activar pnpm y crear el workspace.** Instalar Corepack y ejecutar `corepack enable`. Crear los archivos raíz con las restricciones globales. Workspaces: `apps/*` y `packages/*`. ESLint con typescript-eslint en modo `recommendedTypeChecked` y Prettier. Instalar las dependencias de desarrollo.
- [ ] **Step 2: Escribir la prueba que falla** en `packages/shared/test/domain.test.ts`:
  ```ts
  it('declares the five statuses of the design', () => {
    expect(REQUEST_STATUSES).toEqual(['pending_approval','rejected','approved','in_progress','completed']);
    expect(TERMINAL_STATUSES).toEqual(['rejected','completed']);
  });
  it('declares the error codes of design section 8', () => { expect(ERROR_CODES).toHaveLength(12); });
  ```
- [ ] **Step 3: Ejecutarla.** `pnpm --filter @flowdesk/shared test`. Esperado: FAIL, el módulo no existe.
- [ ] **Step 4: Implementar** `domain.ts`, `error-codes.ts` e `index.ts` según Interfaces.
- [ ] **Step 5: Verificar.** `pnpm lint && pnpm typecheck && pnpm test`. Esperado: todo en verde.
- [ ] **Step 6: CI.** Crear `.github/workflows/ci.yml`:
  - Disparadores: `push` y `pull_request`.
  - Job `checks` en `ubuntu-latest`: Node 26 vía `.nvmrc`, `npm install -g corepack@latest`, `corepack enable`, `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` y `pnpm test`.
  - Sin secretos.
- [ ] **Step 7: Commit.** `git commit -m "chore: set up pnpm monorepo, tooling and CI"`

### Task 2: Esquemas de validación compartidos

**Files:**
- Create: `packages/shared/src/schemas.ts`, `packages/shared/src/dates.ts`, `packages/shared/src/api-types.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/test/schemas.test.ts`, `packages/shared/test/dates.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function todayIn(timeZone: string, now: Date): string; // 'YYYY-MM-DD'
  export const APP_TIME_ZONE = 'America/Santiago';
  export function buildCreateRequestSchema(today: string): z.ZodType<CreateRequestInput>;
  export type CreateRequestInput = { softwareName: string; accessLevel: AccessLevel; accessDetail: string | null;
    justification: string; neededBy: string | null; comments: string | null };
  export const approveSchema: z.ZodType<{ comment: string | null }>;
  export const rejectSchema: z.ZodType<{ reason: string }>;
  export const releaseSchema: z.ZodType<{ reason: string }>;
  export const completeSchema: z.ZodType<{ note: string | null }>;
  export const switchIdentitySchema: z.ZodType<{ identity: DemoIdentity }>;
  export const createSpaceSchema: z.ZodType<{ locale: Locale }>;
  export const listQuerySchema: z.ZodType<{ view: ListView; status?: RequestStatus; q?: string; cursor?: string }>;
  ```
  Los textos opcionales vacíos tras recortar se normalizan a `null`. Los mensajes de error de Zod son códigos estables (`too_short`, `too_long`, `required`, `date_in_past`); la interfaz los traduce.
- Produces, en `api-types.ts`:
  ```ts
  export type UserRef = { id: string; displayName: string; jobTitle: string };
  export type RequestSummary = { id: string; code: string; softwareName: string; accessLevel: AccessLevel;
    status: RequestStatus; requester: UserRef; createdAt: string };
  export type RequestEventDto = { id: number; type: EventType; actor: UserRef; fromStatus: RequestStatus | null;
    toStatus: RequestStatus; note: string | null; createdAt: string };
  export type RequestDetail = RequestSummary & { accessDetail: string | null; justification: string;
    neededBy: string | null; comments: string | null; approver: UserRef; assignee: UserRef | null;
    decisionComment: string | null; decidedAt: string | null; completionNote: string | null;
    completedBy: UserRef | null; completedAt: string | null; isSample: boolean;
    events: RequestEventDto[]; allowedActions: RequestAction[] };
  export type Page<T> = { items: T[]; nextCursor: string | null };
  export type SessionInfo = { activeIdentity: DemoIdentity; user: UserRef; roles: Role[];
    identities: { identity: DemoIdentity; user: UserRef }[]; expiresAt: string };
  export type TourProgress = { created: boolean; decided: boolean; assigned: boolean; completed: boolean };
  export type ApiErrorBody = { error: { code: ErrorCode; message: string; details: Record<string, unknown> } };
  ```

- [ ] **Step 1: Escribir las pruebas que fallan.** `schemas.test.ts` usa `buildCreateRequestSchema('2026-11-22')`:
  - `accepts a valid request`: con `{ softwareName:'Figma', accessLevel:'edit', justification:'Necesito editar diseños', neededBy:null }`, éxito.
  - `trims and rejects whitespace-only justification`: `'          '` (10 espacios) da `too_short` en `justification` (Review Focus 1).
  - `counts emojis as visible characters`: diez `'🚀'` en `justification` da éxito (Review Focus 1). Implementar el conteo de longitud con `[...str].length`.
  - `requires accessDetail only for other`: `other` sin detalle da error en `accessDetail`; `read` con detalle normaliza el detalle a `null`.
  - `rejects past neededBy`: `'2026-11-21'` da `date_in_past`; `'2026-11-22'` da éxito.
  - `bounds`: softwareName de 1 y de 101 caracteres falla; justificación de 1001 falla; `rejectSchema` con motivo de 9 caracteres falla y con 10 acepta; `approveSchema` con comentario de 501 falla.

  `dates.test.ts`:
  - `uses Santiago date near midnight`: `todayIn('America/Santiago', new Date('2026-11-23T02:30:00Z'))` === `'2026-11-22'` (Review Focus 3).
- [ ] **Step 2: Ejecutarlas.** `pnpm --filter @flowdesk/shared test`. Esperado: FAIL.
- [ ] **Step 3: Implementar** `dates.ts` con `Intl.DateTimeFormat('en-CA', { timeZone })`, y `schemas.ts` y `api-types.ts` según Interfaces.
- [ ] **Step 4: Verificar.** Mismo comando. Esperado: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(shared): add validation schemas and API types"`

### Task 3: Esquema de base de datos, migraciones y entorno de pruebas

**Files:**
- Create: `compose.dev.yaml` (solo `postgres:18`, puerto `127.0.0.1:5432`), `.env.example`, `apps/api/{package.json,tsconfig.json,drizzle.config.ts}`, `apps/api/src/db/{schema.ts,client.ts,migrate.ts}`, `apps/api/drizzle/*`, `apps/api/test/helpers/{global-setup.ts,test-db.ts,factories.ts}`
- Test: `apps/api/test/integration/db-schema.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // db/client.ts
  export type Db = NodePgDatabase<typeof schema>;
  export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
  export function createDb(databaseUrl: string): { db: Db; pool: Pool };
  // db/migrate.ts
  export async function runMigrations(databaseUrl: string): Promise<void>;
  // test/helpers/test-db.ts — un contenedor por ejecución de Vitest (globalSetup), migrado una vez
  export function getTestDb(): Db;
  // test/helpers/factories.ts — inserción directa para pruebas
  export async function insertSpace(db: Db, opts?: Partial<{ hardExpiresAt: Date; lastSeenAt: Date; status: 'active'|'ended'; endedAt: Date }>): Promise<{ spaceId: string; employeeId: string; approverId: string; agentId: string }>;
  ```
- Tablas, columnas, claves y `CHECK`: exactamente las del diseño, sección 7, con la regla de cascada completa y `NO ACTION` en las claves compuestas.
  - **Enumeraciones:** como `text` con `CHECK (col IN (...))`, que es más sencillo de migrar que un tipo `enum` de PostgreSQL.
  - **`CHECK` de coherencia:** `(status = 'in_progress') = (assignee_id IS NOT NULL)`.
  - **Semilla de `request_types`:** la migración inserta `(1, 'software_access', 'Software access')`.

- [ ] **Step 1: Escribir las pruebas que fallan** en `db-schema.test.ts`:
  - `deleting a space cascades to every table`: con `insertSpace`, más una solicitud y su evento insertados directamente, `DELETE FROM demo_spaces` deja 0 filas en `users`, `user_roles`, `approver_assignments`, `requests`, `request_events` y `sessions` para ese espacio.
  - `rejects a request whose requester belongs to another space`: falla con el código `23503` (clave foránea).
  - `rejects in_progress without assignee and approved with assignee`: falla con el código `23514`.
  - `code is unique per space, not globally`: `FD-0001` en dos espacios se acepta; repetido en el mismo espacio falla con `23505`.
- [ ] **Step 2: Ejecutarlas.** `pnpm --filter @flowdesk/api test -- db-schema`. Esperado: FAIL.
- [ ] **Step 3: Implementar** `schema.ts`, generar la migración (`pnpm --filter @flowdesk/api db:generate`) y escribir los helpers. Revisar que la migración SQL generada contenga las restricciones; si drizzle-kit no expresa alguna, añadirla a mano en la misma migración.
- [ ] **Step 4: Verificar.** Mismo comando, con Docker en marcha. Esperado: PASS.
- [ ] **Step 5: CI.** Docker ya está disponible en `ubuntu-latest`; confirmar que `pnpm test` corre las pruebas de integración en CI.
- [ ] **Step 6: Commit.** `git commit -m "feat(api): add database schema, migrations and test database"`

---

## E2 · Dominio

### Task 4: Máquina de estados y políticas de permisos

**Files:**
- Create: `apps/api/src/core/actor.ts`, `apps/api/src/core/requests/{errors,state-machine,policies}.ts`
- Test: `apps/api/test/unit/state-machine.test.ts`, `apps/api/test/unit/policies.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Actor = { userId: string; roles: readonly Role[]; scopeId: string };
  export type DomainErrorCode = 'NOT_FOUND'|'FORBIDDEN'|'INVALID_TRANSITION'|'APPROVER_NOT_CONFIGURED'|'SELF_APPROVAL_CONFLICT'|'QUOTA_EXCEEDED';
  export class DomainError extends Error { constructor(readonly code: DomainErrorCode, message: string) }
  export function nextStatus(from: RequestStatus, action: RequestAction): RequestStatus | null;
  export type RequestFacts = { requesterId: string; approverId: string; assigneeId: string | null; status: RequestStatus };
  export function canCreate(actor: Actor): boolean;
  export function canView(actor: Actor, req: RequestFacts): boolean;
  export function allowedActions(actor: Actor, req: RequestFacts): RequestAction[];
  export function authorize(actor: Actor, action: RequestAction, req: RequestFacts): void; // lanza DomainError
  ```
- Orden de comprobación en `authorize`. Fija qué código HTTP sale en cada caso:
  1. `!canView` → `NOT_FOUND`.
  2. Rol o persona no permitidos sobre un recurso visible → `FORBIDDEN`. Incluye: aprobador no asignado o igual al solicitante; técnico igual al solicitante; quien no es el técnico asignado en `release` y `complete`.
  3. `nextStatus` es `null`, o falla la precondición `assigneeId === null` en `assign` → `INVALID_TRANSITION`.
- `canView` según el diseño 3.2:
  - `requester`: es el solicitante.
  - `approver`: es el aprobador asignado.
  - `it_agent`: el estado es `approved`, `in_progress` o `completed`.
  - Con varios roles, basta con que se cumpla una de las condiciones.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - `state-machine.test.ts`: tabla parametrizada con las 25 combinaciones `estado × acción`. Exactamente estas 5 devuelven un estado:
    - `pending_approval + approve → approved`
    - `pending_approval + reject → rejected`
    - `approved + assign → in_progress`
    - `in_progress + release → approved`
    - `in_progress + complete → completed`

    Las otras 20 devuelven `null`.
  - `policies.test.ts`, matriz del diseño 3.2 con actores `employee` (`requester`), `approver` y `agent` (`it_agent`):
    - `only requester can create`.
    - `employee sees only own requests`: la solicitud de otro solicitante no es visible.
    - `approver sees only requests assigned to them`.
    - `agent sees approved, in_progress and completed only`: `pending_approval` y `rejected` no son visibles.
    - `agent cannot approve an approved request` → `FORBIDDEN`.
    - `cannot approve own request even with both roles`: actor con roles `['requester','approver']` que es solicitante y aprobador asignado → `FORBIDDEN`.
    - `cannot assign own request even as it_agent` → `FORBIDDEN`.
    - `cannot complete own request` → `FORBIDDEN`.
    - `second agent assigning an in_progress request gets INVALID_TRANSITION`.
    - `non-assignee agent cannot release or complete` → `FORBIDDEN`.
    - `allowedActions`: aprobador sobre `pending_approval` → `['approve','reject']`; agente sobre `approved` → `['assign']`; agente asignado sobre `in_progress` → `['release','complete']`; empleado sobre su solicitud → `[]`.
- [ ] **Step 2: Ejecutarlas.** `pnpm --filter @flowdesk/api test -- unit`. Esperado: FAIL.
- [ ] **Step 3: Implementar** según Interfaces. Son funciones puras, sin acceso a datos.
- [ ] **Step 4: Verificar.** Mismo comando. Esperado: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(core): add request state machine and permission policies"`

### Task 5: Repositorio y servicio de solicitudes

**Files:**
- Create: `apps/api/src/core/requests/{repository,service,mappers}.ts`
- Test: `apps/api/test/integration/request-service.test.ts`

**Interfaces:**
- Consumes: `Db`, `Tx` (tarea 3); `Actor`, `DomainError`, `authorize`, `allowedActions`, `canCreate`, `nextStatus` (tarea 4); esquemas y DTO (tarea 2).
- Produces:
  ```ts
  export interface ScopeHooks {
    reserveCreation(tx: Tx, scopeId: string): Promise<void>;   // lanza DomainError('QUOTA_EXCEEDED')
    allocateCode(tx: Tx, scopeId: string): Promise<string>;     // 'FD-0006'
  }
  export class RequestService {
    constructor(db: Db, hooks: ScopeHooks);
    create(actor: Actor, input: CreateRequestInput): Promise<RequestDetail>;
    list(actor: Actor, query: ListQuery): Promise<Page<RequestSummary>>;
    get(actor: Actor, id: string): Promise<RequestDetail>;
    approve(actor: Actor, id: string, input: { comment: string | null }): Promise<RequestDetail>;
    reject(actor: Actor, id: string, input: { reason: string }): Promise<RequestDetail>;
    assign(actor: Actor, id: string): Promise<RequestDetail>;
    release(actor: Actor, id: string, input: { reason: string }): Promise<RequestDetail>;
    complete(actor: Actor, id: string, input: { note: string | null }): Promise<RequestDetail>;
  }
  ```
- **`create`.** En una transacción:
  1. Comprueba `canCreate`; si falla, `FORBIDDEN`.
  2. Busca el aprobador del tipo 1 en el ámbito; si no hay, `APPROVER_NOT_CONFIGURED`.
  3. Si el aprobador es el actor, `SELF_APPROVAL_CONFLICT`.
  4. Llama a `hooks.reserveCreation` y a `hooks.allocateCode`.
  5. Inserta la solicitud con `is_sample=false` y el evento `created` (`from_status` nulo).
- **Transiciones.** En una transacción:
  1. Lee la solicitud filtrando por `id` y `demo_space_id`; si no existe, `NOT_FOUND`.
  2. Ejecuta `authorize`.
  3. Hace el `UPDATE` condicional del diseño 4.4 (`status` esperado y `version`; en `assign`, además `assignee_id IS NULL`). Si no actualiza filas, `INVALID_TRANSITION`.
  4. Inserta el evento.
  5. Actualiza las columnas de consulta rápida (`decision_comment`, `decided_at`, `assignee_id`, `completed_by`, `completed_at`, `completion_note`). `release` pone `assignee_id = NULL` y guarda el motivo en la nota del evento.
- **`list`.** Las vistas filtran según la matriz 3.2:
  - `mine`: `requester_id = actor`.
  - `approvals_pending`: `approver_id = actor` y estado `pending_approval`.
  - `approvals_decided`: `approver_id = actor` y otro estado.
  - `queue`: `approved`.
  - `assigned`: `in_progress` y `assignee_id = actor`.
  - `completed`: estado `completed`.

  Una vista que no corresponde a los roles del actor devuelve `FORBIDDEN`. Orden `created_at DESC, id DESC`. Cursor: base64url de `createdAt|id`. 20 elementos por página. `q` busca con `ILIKE` sobre `code` y `software_name`, escapando `\`, `%` y `_`.
- **`get`.** Devuelve los eventos en orden cronológico y `allowedActions` calculado para el actor.

- [ ] **Step 1: Escribir las pruebas que fallan.** Usan `getTestDb`, `insertSpace` y unos `ScopeHooks` de prueba (contador en memoria y sin cuota).
  - `creates a request with code and created event`: estado `pending_approval`, `approver.id === approverId`, 1 evento `created`.
  - `blocks creation without configured approver` → `APPROVER_NOT_CONFIGURED`.
  - `blocks creation when approver is requester`: usuario con ambos roles, configurado como aprobador → `SELF_APPROVAL_CONFLICT`.
  - `full happy path`: `approve`, `assign`, `complete`. Estado final `completed`; eventos `[created, approved, assigned, completed]` con sus actores; `completedBy === agentId`.
  - `release returns to queue and keeps approval`: `assign` y luego `release` con motivo. Estado `approved`, `assignee === null`, `decidedAt` conservado, evento `released` con la nota.
  - `concurrent assign: exactly one wins`: dos agentes del mismo espacio llaman a `assign` con `Promise.allSettled`. Un éxito, un `INVALID_TRANSITION` y exactamente 1 evento `assigned`.
  - `isolation: actor of space B gets NOT_FOUND on space A request`: también para `approve`. La solicitud queda sin cambios.
  - `list views and filters`: `queue` solo contiene `approved`; `status=completed` filtra; el empleado no puede pedir `queue` → `FORBIDDEN`.
  - `search treats % and _ literally`: con solicitudes `'100% Tool'` y `'Tool'`, `q='%'` devuelve solo la primera; `q='_'` no devuelve ninguna (Review Focus 2).
  - `cursor pagination`: con 25 solicitudes, 20 en la primera página y 5 en la segunda, sin repetidos.
- [ ] **Step 2: Ejecutarlas.** `pnpm --filter @flowdesk/api test -- request-service`. Esperado: FAIL.
- [ ] **Step 3: Implementar** según Interfaces. `mappers.ts` convierte filas en DTO (fechas como ISO 8601).
- [ ] **Step 4: Verificar.** Mismo comando. Esperado: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(core): add request repository and service with concurrency control"`

---

## E3 · Demo y sesión

### Task 6: Espacios, datos de ejemplo y sesión

**Files:**
- Create: `apps/api/src/config.ts`, `apps/api/src/demo/session/{token,session.service}.ts`, `apps/api/src/demo/spaces/{seed-data,space.service}.ts`
- Test: `apps/api/test/unit/token.test.ts`, `apps/api/test/unit/config.test.ts`, `apps/api/test/integration/demo-session.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // config.ts — valida process.env con Zod; valores por defecto de Global Constraints
  export type Config = { nodeEnv: 'development'|'test'|'production'; port: number; databaseUrl: string; appOrigin: string;
    trustProxyCidr: string | null; logLevel: string; demo: { spaceTtlMin: number; idleMin: number; maxRequests: number;
    spacesPerIpHour: number; maxActiveSpaces: number; rateLimitPerMin: number; ipRateLimitPerMin: number; cleanupIntervalMin: number;
    cleanupGraceMin: number; cleanupBatch: number }; bodyLimitBytes: number };
  export function loadConfig(env: NodeJS.ProcessEnv): Config;
  // demo/session/token.ts
  export function generateToken(): { token: string; hash: Buffer }; // 32 bytes aleatorios en base64url; hash SHA-256
  export function hashToken(token: string): Buffer;
  // demo/session/session.service.ts
  export type ResolvedSession = { sessionId: string; spaceId: string; actor: Actor; activeIdentity: DemoIdentity;
    hardExpiresAt: Date; lastSeenAt: Date };
  export type ResolveResult = { status: 'ok'; session: ResolvedSession } | { status: 'missing' } | { status: 'expired' };
  export class SessionService {
    constructor(db: Db, config: Config, clock: () => Date);
    resolve(token: string | undefined): Promise<ResolveResult>;
    touch(session: ResolvedSession): Promise<void>; // UPDATE … WHERE last_seen_at < now - 1 min
    info(session: ResolvedSession): Promise<SessionInfo>; // expiresAt = min(hardExpiresAt, lastSeenAt + idleMin)
    switchIdentity(session: ResolvedSession, identity: DemoIdentity): Promise<SessionInfo>;
  }
  // demo/spaces/space.service.ts
  export class DemoSpaceService {
    constructor(db: Db, config: Config, clock: () => Date);
    create(locale: Locale): Promise<{ token: string; hardExpiresAt: Date }>; // lanza DemoCapacityError
    reset(session: ResolvedSession, locale: Locale): Promise<{ token: string; hardExpiresAt: Date }>;
  }
  export class DemoCapacityError extends Error {}
  // demo/spaces/seed-data.ts
  export function seedContent(locale: Locale): { users: Record<DemoIdentity, { displayName: string; jobTitle: string }>;
    samples: SampleRequest[] };
  ```
- **`create`.** En una transacción:
  1. Si los espacios activos y vigentes llegan a `maxActiveSpaces`, lanza `DemoCapacityError`.
  2. Inserta el espacio con `hard_expires_at = now + spaceTtlMin` y `request_seq = 5`.
  3. Inserta los 3 usuarios con sus roles y la asignación del aprobador del tipo 1.
  4. Inserta las 5 solicitudes de ejemplo del diseño 7, con `is_sample=true`, en el idioma de entrada. Fechas relativas: entre 1 y 10 días antes de `now`. Los eventos son coherentes con cada estado.
  5. Inserta la sesión con la identidad `employee`.
- **`reset`.** Marca el espacio actual como `status='ended'` con `ended_at=now` y llama a `create`.
- **`resolve`:**
  - Sin token o con un hash inexistente → `missing`.
  - Espacio no vigente según el diseño 9.1 → `expired`.
  - En otro caso, construye el `Actor` con `active_user_id`, sus roles y `demo_space_id`.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - `token.test.ts`: `token has 43 base64url chars and hash is sha256 of it`; `two tokens differ`.
  - `config.test.ts`: `applies design defaults` (valores de Global Constraints); `rejects missing DATABASE_URL`.
  - `demo-session.test.ts`, con un reloj inyectable:
    - `create seeds 3 users, 5 samples FD-0001..FD-0005 in the requested locale`: los estados de ejemplo coinciden con la tabla del diseño 7; con `locale='en'`, la justificación de FD-0001 está en inglés.
    - `resolve returns employee actor scoped to the space`.
    - `the stored value is the hash, not the token`: ninguna fila de `sessions` contiene el token en claro.
    - `switchIdentity changes active user within the space`: el `Actor` resultante tiene el rol `approver`.
    - `expired by hard TTL`: reloj a +121 min → `expired`.
    - `expired by inactivity`: `last_seen_at` a −31 min → `expired`; `touch` dentro de la ventana la prolonga.
    - `touch writes at most once per minute`: dos `touch` seguidos dejan `last_seen_at` sin cambiar la segunda vez.
    - `info.expiresAt is the earlier limit`.
    - `reset ends old space and creates a new one`: el token antiguo da `expired`.
    - `capacity`: con `maxActiveSpaces=2` y 2 espacios activos, `create` lanza `DemoCapacityError`; los espacios `ended` no cuentan.
- [ ] **Step 2: Ejecutarlas.** `pnpm --filter @flowdesk/api test -- token config demo-session`. Esperado: FAIL.
- [ ] **Step 3: Implementar** según Interfaces. Los datos de ejemplo de ambos idiomas van en `seed-data.ts`; los nombres y textos los elige el implementador.
- [ ] **Step 4: Verificar.** Mismo comando. Esperado: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(demo): add demo spaces, sample data and sessions"`

### Task 7: Cuotas, limpieza y progreso del recorrido

**Files:**
- Create: `apps/api/src/demo/limits/scope-hooks.ts`, `apps/api/src/demo/cleanup/cleanup.ts`, `apps/api/src/demo/tour/tour.service.ts`
- Test: `apps/api/test/integration/demo-limits.test.ts`, `apps/api/test/integration/cleanup.test.ts`, `apps/api/test/integration/tour.test.ts`

**Interfaces:**
- Consumes: `ScopeHooks` (tarea 5); `Config` (tarea 6).
- Produces:
  ```ts
  export function createDemoScopeHooks(config: Config): ScopeHooks;
  // reserveCreation: UPDATE demo_spaces SET requests_created = requests_created + 1
  //                  WHERE id = $1 AND requests_created < maxRequests; si 0 filas → QUOTA_EXCEEDED
  // allocateCode:    UPDATE … SET request_seq = request_seq + 1 RETURNING request_seq → 'FD-' + padStart(4,'0')
  export async function runCleanup(db: Db, config: Config, now: Date): Promise<{ deletedSpaces: number; skipped: boolean }>;
  export function startCleanupScheduler(db: Db, config: Config, logger: FastifyBaseLogger): () => void; // devuelve stop
  export async function getTourProgress(db: Db, scopeId: string): Promise<TourProgress>;
  ```
- **`runCleanup`.** Toma `pg_try_advisory_lock(<constante>)`; si no lo consigue, devuelve `skipped: true`. Borra en lotes de `cleanupBatch` con los criterios del diseño 9.3, libera el bloqueo y registra en el log el número de espacios borrados y la duración.
- **`getTourProgress`.** Considera solo las solicitudes `is_sample=false` del espacio:
  - `created`: existe alguna.
  - `decided`: alguna tiene un evento `approved` o `rejected`.
  - `assigned`: alguna tiene un evento `assigned`.
  - `completed`: alguna tiene un evento `completed`.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - `demo-limits.test.ts`:
    - `codes continue from FD-0006 after samples`.
    - `31st creation fails with QUOTA_EXCEEDED`: crear 30 solicitudes funciona y la 31.ª falla; los ejemplos no cuentan.
    - `concurrent creations never exceed quota`: con `maxRequests=3`, 5 creaciones en paralelo dan 3 éxitos y 2 `QUOTA_EXCEEDED`, con códigos sin repetir.
  - `cleanup.test.ts`:
    - `deletes spaces past hard TTL + grace`.
    - `deletes idle spaces after idle + grace` (`last_seen_at` < now − 45 min).
    - `deletes ended spaces after grace`.
    - `keeps active and recently-expired spaces`: un espacio caducado hace 10 minutos sobrevive.
    - `second concurrent run is skipped`: con el bloqueo tomado desde otra conexión → `skipped: true`.
  - `tour.test.ts`:
    - `new space has all false` (los ejemplos no cuentan).
    - `progress follows visitor actions`: crear → `created`; aprobar → `decided`; tomar → `assigned`; completar → `completed`.
    - `acting on a sample does not count`: aprobar FD-0005 deja `decided: false`.
- [ ] **Step 2: Ejecutarlas.** `pnpm --filter @flowdesk/api test -- demo-limits cleanup tour`. Esperado: FAIL.
- [ ] **Step 3: Implementar** según Interfaces.
- [ ] **Step 4: Verificar.** Mismo comando. Esperado: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(demo): add quotas, cleanup job and tour progress"`

---

## E4 · API HTTP

### Task 8: Aplicación Fastify: sesión, errores, origen y límites

**Files:**
- Create: `apps/api/src/http/{app,errors,origin-guard,session-plugin}.ts`, `apps/api/src/http/routes/health.ts`, `apps/api/src/server.ts`, `apps/api/src/cli.ts`, `apps/api/test/helpers/http.ts`
- Test: `apps/api/test/integration/http-foundation.test.ts`

**Interfaces:**
- Consumes: tareas 5 a 7.
- Produces:
  ```ts
  export type AppDeps = { config: Config; db: Db; clock?: () => Date; startScheduler?: boolean };
  export async function buildApp(deps: AppDeps): Promise<FastifyInstance>;
  // session-plugin: decora request.demoSession: ResolvedSession | null
  // preHandler requireSession: 'missing' → 401 SESSION_REQUIRED; 'expired' → 401 SESSION_EXPIRED; si ok, llama a touch()
  // test/helpers/http.ts
  export async function newVisitor(app: FastifyInstance, locale?: Locale): Promise<{ cookie: string; inject: (opts: InjectOptions) => Promise<LightMyRequest.Response> }>;
  // inject añade la cookie, Origin = APP_ORIGIN y Content-Type: application/json, con body {} por defecto en POST y PUT
  ```
- **Registro en `buildApp`.**
  - `@fastify/cookie`.
  - `@fastify/rate-limit` global: `rateLimitPerMin` por minuto, con clave = hash de la cookie si existe y, si no, la IP.
  - Además, una única instancia de `app.createRateLimit` con `ipRateLimitPerMin` por minuto y clave `ip:${request.ip}`, aplicada en un hook `onRequest` de la aplicación a todas las rutas, incluidas salud y rutas desconocidas. Respeta `trustProxy` y rechaza con `429 RATE_LIMITED` antes de consultar la sesión.
  - `bodyLimit = bodyLimitBytes`.
  - `trustProxy = config.trustProxyCidr ?? false`.
  - Prefijo `/api/v1`.
- **`origin-guard`.** En `POST`, `PUT`, `PATCH` y `DELETE`: sin `Origin` o con un valor distinto de `appOrigin` → `403 FORBIDDEN`; sin `Content-Type` JSON → `403`. Permite un cuerpo JSON vacío.
- **`errors.ts`.** Traduce los errores a HTTP:
  - Zod → `400 VALIDATION_ERROR`, con `details.fields` = `{ campo: códigoZod[] }`.
  - `DomainError`: `NOT_FOUND` → 404, `FORBIDDEN` → 403, `INVALID_TRANSITION` → 409 y el resto → 422.
  - Límite de frecuencia → `429 RATE_LIMITED`.
  - `DemoCapacityError` → `503 DEMO_AT_CAPACITY`.
  - Cualquier otro error → `500 INTERNAL_ERROR` con `details.requestId`; la pila va solo al log.
- **Logs.** pino en JSON. El serializador de la petición omite la cookie y registra la IP truncada (IPv4 /24, IPv6 /48), nunca completa (diseño 6.4).
- **`GET /api/v1/health`.** Ejecuta `SELECT 1` y responde `{ status: 'ok' }`, o `503` si falla.
- **`server.ts`.** `loadConfig`, `buildApp` con `startScheduler: true` y `listen` en `0.0.0.0:port`. Cierre ordenado con `SIGTERM`.
- **`cli.ts migrate`.** Ejecuta `runMigrations`.

- [ ] **Step 1: Escribir las pruebas que fallan** en `http-foundation.test.ts`:
  - `health returns ok`.
  - `protected route without cookie → 401 SESSION_REQUIRED`: probar con `GET /api/v1/session`, que se registra aquí con un manejador mínimo y se completa en la tarea 9.
  - `expired session → 401 SESSION_EXPIRED`.
  - `mutation without Origin → 403`; `with foreign Origin → 403`; `without JSON content type → 403`.
  - `body over 16 KB → 413`.
  - `rate limit → 429 RATE_LIMITED with error body`: con `rateLimitPerMin=3`, la 4.ª petición.
  - `IP rate limit`: con `ipRateLimitPerMin=3` y límite de sesión alto, la cuarta petición desde la misma IP con una cookie aleatoria diferente devuelve `429 RATE_LIMITED`; dos IP reenviadas por un proxy de confianza tienen cubos separados.
  - `unknown error → 500 INTERNAL_ERROR without stack`.
  - `trustProxy`: con `trustProxyCidr='127.0.0.1/32'`, dos `X-Forwarded-For` distintos tienen cubos de límite separados para `POST /demo/spaces`. Sin `trustProxyCidr`, la cabecera se ignora y comparten cubo.
- [ ] **Step 2: Ejecutarlas.** `pnpm --filter @flowdesk/api test -- http-foundation`. Esperado: FAIL.
- [ ] **Step 3: Implementar** según Interfaces.
- [ ] **Step 4: Verificar.** Mismo comando. Esperado: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(api): add Fastify app with session, error mapping, origin guard and limits"`

### Task 9: Rutas de demo, sesión, solicitudes y recorrido

**Files:**
- Create: `apps/api/src/http/routes/{demo,session,requests,tour}.ts`
- Test: `apps/api/test/integration/routes-demo-session.test.ts`, `apps/api/test/integration/routes-requests.test.ts`, `apps/api/test/integration/routes-isolation.test.ts`

**Interfaces:**
- Consumes: `buildApp` y `newVisitor` (tarea 8); servicios de las tareas 5 a 7; esquemas de la tarea 2.
- Produces: las rutas del diseño 8, con estos cuerpos de respuesta:

  | Ruta | Respuesta |
  | --- | --- |
  | `POST /demo/spaces` `{locale}` | `201 SessionInfo` y `Set-Cookie` |
  | `POST /demo/spaces/reset` `{locale}` | `201 SessionInfo` y `Set-Cookie` |
  | `GET /session` | `SessionInfo` |
  | `PUT /session/identity` | `SessionInfo` |
  | `GET /requests?…` | `Page<RequestSummary>` |
  | `POST /requests` | `201 RequestDetail` |
  | `GET /requests/:id` | `RequestDetail` |
  | `POST /requests/:id/{approve,reject,assign,release,complete}` | `RequestDetail` |
  | `GET /demo/tour` | `TourProgress` |

  Los detalles:
  - **`POST /demo/spaces`.** Con una sesión `ok` responde `200` con esa sesión y no crea nada ni consume el cupo horario de espacios. Al crear, aplica el límite propio de `spacesPerIpHour` por hora y por IP después de comprobar la reanudación.
  - **`POST /demo/spaces/reset`.** Exige sesión y comparte el límite por IP.
  - **Cookie.** `Max-Age` hasta `hardExpiresAt`.
  - **`:id`.** Si no es un UUID → `404 NOT_FOUND`, no `400`.
  - **`POST /requests`.** Construye el esquema con `todayIn(APP_TIME_ZONE, clock())`.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - `routes-demo-session.test.ts`:
    - `create sets HttpOnly SameSite=Lax cookie and returns employee`.
    - `create with valid session resumes (200, same expiresAt, no new space row)`.
    - `reset returns new cookie; old cookie → 401`.
    - `switch identity to approver`.
    - `switch identity with unknown value → 400`.
    - `11th space creation from same IP within an hour → 429`.
    - Con `spacesPerIpHour=1`, crear devuelve `201`, reanudar dos veces con la misma cookie devuelve `200, 200` y otra creación sin cookie desde la misma IP devuelve `429`.
  - `routes-requests.test.ts`:
    - `full tour through HTTP`: los 9 pasos del recorrido con cambios de identidad; estado final `completed`; el historial tiene 4 eventos.
    - `permission matrix`, como tabla parametrizada:

      | Identidad | Acción | Resultado |
      | --- | --- | --- |
      | employee | approve | 403 |
      | employee | assign sobre FD-0004, que es suya | 403 |
      | approver | assign | 403 |
      | approver | `POST /requests` | 403 |
      | it_agent | reject sobre `pending_approval` | 404 |
      | it_agent | complete sin estar asignado | 403 |

    - `reject without reason → 400 with details.fields.reason`.
    - `approve twice → second 409 INVALID_TRANSITION`.
    - `concurrent assign over HTTP: one 200, one 409`. Requiere una segunda identidad `it_agent` en el mismo espacio: la prueba la inserta con la factoría de la tarea 3, porque la demo solo tiene un técnico.
    - `quota → 422 QUOTA_EXCEEDED` (con `maxRequests=1`).
    - `neededBy yesterday → 400 date_in_past`.
    - `stale identity`: con la identidad `approver`, cambiar a `employee` y enviar `approve` sobre FD-0005 → `403`; la solicitud sigue en `pending_approval` (Review Focus 4).
  - `routes-isolation.test.ts`. Dos visitantes, A y B; con la cookie de B, sobre el `id` de una solicitud de A:
    - `GET /requests/:id`, `approve`, `reject`, `assign`, `release` y `complete` → `404`, y la solicitud de A no cambia.
    - `B lists never include A requests` en todas las vistas que su rol permite.
    - `tour of B unaffected by A`.
- [ ] **Step 2: Ejecutarlas.** `pnpm --filter @flowdesk/api test -- routes-`. Esperado: FAIL.
- [ ] **Step 3: Implementar** según Interfaces.
- [ ] **Step 4: Verificar.** `pnpm --filter @flowdesk/api test` (suite completa de la API). Esperado: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(api): add demo, session, request and tour routes"`

---

## E5 · Interfaz

### Task 10: Base web, idiomas, cliente de API y bienvenida

**Files:**
- Create: `apps/web/{package.json,tsconfig.json,next.config.ts,components.json,postcss.config.mjs}`, `apps/web/messages/{es,en}.json`, `apps/web/src/i18n/{routing,navigation,request}.ts`, `apps/web/src/proxy.ts`, `apps/web/src/lib/{api-client,queries,error-messages,format}.ts`, `apps/web/src/app/[locale]/{layout,page}.tsx`, `apps/web/src/app/[locale]/demo-caducada/page.tsx` (ruta interna `/demo-expired`), `apps/web/src/app/globals.css`
- Test: `apps/web/test/messages.test.ts`, `apps/web/test/api-client.test.ts`, `apps/web/test/error-messages.test.ts`

**Interfaces:**
- Consumes: tipos y esquemas de `@flowdesk/shared`.
- Produces:
  ```ts
  // i18n/routing.ts
  export const routing; // defineRouting({ locales: ['es','en'], defaultLocale: 'en', localePrefix: 'always', pathnames: {…} })
  // lib/api-client.ts
  export class ApiClientError extends Error { status: number; code: ErrorCode; details: Record<string, unknown> }
  export async function apiFetch<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T>;
  // same-origin, credentials: 'same-origin', Content-Type JSON; body {} por defecto en POST/PUT
  // lib/queries.ts — hooks de TanStack Query
  export function useSession(): UseQueryResult<SessionInfo, ApiClientError>;
  export function useCreateSpace(): UseMutationResult<SessionInfo, ApiClientError, Locale>;
  // lib/error-messages.ts
  export function errorMessageKey(code: ErrorCode): string;          // 'errors.INVALID_TRANSITION'
  export function fieldErrorKey(zodCode: string): string;            // 'validation.too_short'
  ```
- **Configuración.**
  - Next.js: `output: 'standalone'`. En desarrollo, `rewrites` envía `/api/:path*` a `http://localhost:4000/api/:path*`.
  - Detección de idioma: `/` redirige con `Accept-Language` (`es*` → `/es`; el resto → `/en`).
  - Tailwind 4 y shadcn/ui (`button`, `dialog`, `select`, `input`, `textarea`, `tabs`, `badge`, `sonner`, `dropdown-menu`, `sheet`, `label`).
  - Proveedor de TanStack Query en el layout del idioma.
- **Bienvenida.** Qué es FlowDesk, el problema que resuelve y el selector de idioma.
  - Si `useSession` responde 200, muestra «Continuar demo» / «Continue demo», que lleva a `/app`.
  - Si no, muestra «Probar demo» / «Try the demo», que ejecuta `useCreateSpace(locale)` y luego navega a `/app`.
  - `503 DEMO_AT_CAPACITY` y `429` muestran un mensaje amable.
- **`/demo-caducada`.** Explica que la demo caducó y ofrece un botón para empezar otra.

- [ ] **Step 1: Escribir las pruebas que fallan** (Vitest en `apps/web`):
  - `messages.test.ts`: `es and en have identical key sets`; `every ErrorCode has errors.<code> in both`; `every zod code used by shared schemas has validation.<code>`.
  - `api-client.test.ts`, con `fetch` simulado:
    - `parses error body into ApiClientError`: `status 409` da `code 'INVALID_TRANSITION'`.
    - `sends {} on POST without body`.
    - `non-JSON 502 → ApiClientError code INTERNAL_ERROR`.
  - `error-messages.test.ts`: `maps codes to keys`.
- [ ] **Step 2: Ejecutarlas.** `pnpm --filter @flowdesk/web test`. Esperado: FAIL.
- [ ] **Step 3: Implementar** según Interfaces.
- [ ] **Step 4: Verificar.** `pnpm --filter @flowdesk/web test && pnpm --filter @flowdesk/web build`. Esperado: PASS y build correcto.
- [ ] **Step 5: Verificación manual.** Con `compose.dev.yaml`, la API (`pnpm --filter @flowdesk/api dev`) y la web (`pnpm --filter @flowdesk/web dev`):
  - `/` redirige al idioma del navegador.
  - «Probar demo» crea la sesión.
  - Al recargar, la bienvenida muestra «Continuar demo».
- [ ] **Step 6: Commit.** `git commit -m "feat(web): add Next.js base, i18n, API client and welcome page"`

### Task 11: Estructura de la aplicación: identidad, cuenta atrás, reinicio y recorrido

**Files:**
- Create: `apps/web/src/app/[locale]/app/{layout,page}.tsx`, `apps/web/src/components/{app-shell,identity-switcher,countdown,tour-panel}.tsx`
- Modify: `apps/web/src/lib/queries.ts`, `apps/web/messages/{es,en}.json`
- Test: `apps/web/test/countdown.test.tsx`, `apps/web/test/app-routing.test.ts`

**Interfaces:**
- Consumes: `useSession` y `apiFetch` (tarea 10).
- Produces:
  ```ts
  export function useSwitchIdentity(): UseMutationResult<SessionInfo, ApiClientError, DemoIdentity>;
  export function useResetDemo(): UseMutationResult<SessionInfo, ApiClientError, Locale>;
  export function useTour(): UseQueryResult<TourProgress, ApiClientError>;
  export function homePathFor(identity: DemoIdentity): '/app/requests' | '/app/approvals' | '/app/queue';
  export function formatRemaining(ms: number, locale: Locale): string; // '1 h 52 min' / '1 h 52 min'; '<1 min'
  ```
- **Layout de `/app`.**
  - Sin sesión (401) → `/demo-caducada`.
  - Cabecera: logotipo, cuenta atrás hasta `expiresAt`, selector de identidad (nombre ficticio y rol) y selector de idioma.
  - Navegación lateral según la identidad; en móvil (< 768 px), un `sheet`.
  - Botón «Reiniciar demo», con diálogo de confirmación.
- **Cambio de identidad.** Invalida todas las consultas y navega a `homePathFor`.
- **Errores globales de TanStack Query.**
  - `401` → `/demo-caducada`.
  - `403` o `404` en una página de detalle → listado del rol, con un aviso (`sonner`).
- **Panel del recorrido** (diseño 5.1). Muestra los 9 pasos en el idioma activo. Los pasos 2, 5, 7 y 8 llevan casilla, alimentada por `useTour`; los demás son texto guía.
- `/app` redirige con `homePathFor`.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - `countdown.test.tsx`: `formatRemaining(6_720_000,'es') === '1 h 52 min'`; `formatRemaining(30_000,'en') === '<1 min'`.
  - `app-routing.test.ts`: `homePathFor('approver') === '/app/approvals'`.
- [ ] **Step 2: Ejecutarlas.** `pnpm --filter @flowdesk/web test`. Esperado: FAIL.
- [ ] **Step 3: Implementar** según Interfaces.
- [ ] **Step 4: Verificar.** Pruebas y build. Comprobar a mano que el cambio de identidad conserva los datos y que reiniciar crea FD-0001 a FD-0005 de nuevo.
- [ ] **Step 5: Commit.** `git commit -m "feat(web): add app shell with identity switcher, countdown, reset and tour panel"`

### Task 12: Pantallas del empleado: listado y nueva solicitud

**Files:**
- Create: `apps/web/src/app/[locale]/app/requests/{page.tsx,new/page.tsx}`, `apps/web/src/components/{status-badge,request-table,request-filters,request-form}.tsx`
- Modify: `apps/web/src/lib/queries.ts`, `apps/web/messages/{es,en}.json`
- Test: `apps/web/test/request-form.test.tsx`

**Interfaces:**
- Consumes: `buildCreateRequestSchema`, `todayIn` y `APP_TIME_ZONE` (tarea 2); `apiFetch` (tarea 10).
- Produces:
  ```ts
  export function useRequestList(query: ListQuery): UseInfiniteQueryResult<Page<RequestSummary>, ApiClientError>;
  export function useCreateRequest(): UseMutationResult<RequestDetail, ApiClientError, CreateRequestInput>;
  // components
  export function StatusBadge(props: { status: RequestStatus }): JSX.Element;   // texto + color, no solo color
  export function RequestTable(props: { query: ListQuery; emptyMessageKey: string }): JSX.Element; // «Cargar más»
  export function RequestFilters(props: { value: { status?: RequestStatus; q?: string }; onChange(v): void }): JSX.Element;
  ```
- **Listado.** Vista `mine`, filtro de estado y búsqueda con un retardo de 300 ms; estado vacío útil.
- **Formulario.** React Hook Form con `zodResolver(buildCreateRequestSchema(todayIn(APP_TIME_ZONE, new Date())))`.
  - El campo de detalle aparece solo con `other`.
  - Aviso: «No incluyas contraseñas ni credenciales».
  - El botón de envío se desactiva mientras la mutación está en curso.
  - Los errores `400` del servidor se aplican a cada campo con `setError` y `fieldErrorKey`.
  - Al terminar, navega al detalle con un aviso de éxito.
- **Accesibilidad.** Cada campo tiene `label` y su error está asociado con `aria-describedby`.

- [ ] **Step 1: Escribir la prueba que falla** en `request-form.test.tsx` (Testing Library):
  - `shows accessDetail only for other`.
  - `shows translated too_short on 10-space justification`.
  - `disables submit while pending`.
  - `maps server field errors to fields`.
- [ ] **Step 2: Ejecutarla.** `pnpm --filter @flowdesk/web test -- request-form`. Esperado: FAIL.
- [ ] **Step 3: Implementar** según Interfaces.
- [ ] **Step 4: Verificar.** Pruebas y build. A mano: crear una solicitud que aparece como FD-0006.
- [ ] **Step 5: Commit.** `git commit -m "feat(web): add requester list and new request form"`

### Task 13: Detalle, acciones, bandeja de aprobación y cola de TI

**Files:**
- Create: `apps/web/src/app/[locale]/app/requests/[id]/page.tsx`, `apps/web/src/app/[locale]/app/{approvals,queue}/page.tsx`, `apps/web/src/components/{request-actions,reason-dialog,request-timeline}.tsx`
- Modify: `apps/web/src/lib/queries.ts`, `apps/web/messages/{es,en}.json`
- Test: `apps/web/test/request-actions.test.tsx`

**Interfaces:**
- Consumes: `useRequestList`, `RequestTable` y `StatusBadge` (tarea 12).
- Produces:
  ```ts
  export function useRequest(id: string): UseQueryResult<RequestDetail, ApiClientError>;
  export function useRequestAction(id: string): UseMutationResult<RequestDetail, ApiClientError,
    { action: RequestAction; body: Record<string, string | null> }>;
  export function RequestActions(props: { request: RequestDetail }): JSX.Element; // botones según allowedActions
  export function ReasonDialog(props: { mode: 'reject' | 'release' | 'approve' | 'complete'; onConfirm(text: string | null): void; pending: boolean }): JSX.Element;
  ```
- **Detalle.** Datos, insignia de estado, responsables, acciones e historial cronológico (`request-timeline`), con fechas en el formato del idioma activo.
- **Diálogos.** Motivo obligatorio para rechazar y liberar (10–500 caracteres); comentario o nota opcional para aprobar y completar; botón desactivado mientras la acción está en curso.
- **`409`.** Avisa de que la solicitud cambió y recarga el detalle.
- **Bandeja.** Pestañas «Pendientes» (`approvals_pending`) y «Decididas» (`approvals_decided`).
- **Cola.** Pestañas «Disponibles» (`queue`), «Asignadas a mí» (`assigned`) y «Completadas» (`completed`).
- Cada acción invalida el detalle, los listados y `useTour`.

- [ ] **Step 1: Escribir la prueba que falla** en `request-actions.test.tsx`:
  - `renders only allowedActions`: con `['assign']`, solo aparece «Asignarme».
  - `reject requires 10+ chars before confirm enabled`.
  - `on 409 shows changed notice and refetches`.
- [ ] **Step 2: Ejecutarla.** `pnpm --filter @flowdesk/web test -- request-actions`. Esperado: FAIL.
- [ ] **Step 3: Implementar** según Interfaces.
- [ ] **Step 4: Verificar.** Pruebas y build. A mano: el recorrido completo de 9 pasos, en español y en inglés.
- [ ] **Step 5: Commit.** `git commit -m "feat(web): add request detail, actions, approvals inbox and IT queue"`

---

## E6 · End-to-end y README

### Task 14: Pruebas end-to-end y accesibilidad

**Files:**
- Create: `apps/web/playwright.config.ts`, `apps/web/e2e/{fixtures.ts,tour.spec.ts,demo-lifecycle.spec.ts,isolation.spec.ts,a11y.spec.ts}`
- Modify: `.github/workflows/ci.yml` (job `e2e`), `package.json` (script `test:e2e`)

**Interfaces:**
- Consumes: la aplicación completa.
- Produces: `pnpm test:e2e`, que levanta PostgreSQL (`compose.dev.yaml`), ejecuta las migraciones, arranca la API y la web compiladas y lanza Playwright.
  - Proyectos de Playwright: `desktop-chromium` y `mobile` (dispositivo `Pixel 7`).
  - `fixtures.ts` exporta `expireCurrentSpace(page)`: modifica `hard_expires_at` del espacio de la cookie mediante una conexión directa a la base de datos de pruebas.

- [ ] **Step 1: Escribir las pruebas.**
  - `tour.spec.ts`:
    - `completes the 9-step tour in Spanish`, en ambos proyectos: crear como empleado, aprobar como aprobador, tomar y completar como técnico y volver como empleado. Estado «Completada» e historial con 4 entradas; el panel del recorrido muestra 4 casillas marcadas.
    - `completes the tour in English` (solo escritorio).
    - `double click on submit creates one request`: con `dblclick` en «Enviar», el listado tiene exactamente una solicitud nueva (FD-0006, sin FD-0007) (Review Focus 5).
  - `demo-lifecycle.spec.ts`:
    - `welcome shows continue after reload`.
    - `reset recreates samples`.
    - `expired space redirects to demo-caducada on next action` (con `expireCurrentSpace`).
  - `isolation.spec.ts`:
    - `two browser contexts never see each other's requests`: A crea «Isolation-A»; B busca «Isolation-A» y obtiene 0 resultados; B abre la URL del detalle de A y es redirigido a su listado.
  - `a11y.spec.ts`: axe sin infracciones `serious` ni `critical` en la bienvenida, el listado, el formulario, el detalle, la bandeja y la cola, en `es`.
- [ ] **Step 2: Ejecutar.** `pnpm test:e2e`. Esperado: corregir hasta que todo pase. Los fallos de accesibilidad se corrigen en los componentes, no desactivando reglas.
- [ ] **Step 3: CI.** Job `e2e` que depende de `checks`: instala los navegadores de Playwright, ejecuta `pnpm test:e2e` y sube `playwright-report` como artefacto si falla.
- [ ] **Step 4: Commit.** `git commit -m "test(e2e): add tour, lifecycle, isolation and accessibility tests"`

### Task 15: README público y documentación

**Files:**
- Create: `README.md` (inglés), `README.es.md` (español)
- Modify: `docs/arquitectura/README.md` (componentes implementados y comandos), `AGENTS.md` (comandos de pruebas y build, hasta ahora «Pendientes»)

- [ ] **Step 1: Redactar los README.** Contenido de ambos:
  - Problema y solución.
  - Capturas de pantalla, generadas con Playwright en `docs/assets/`.
  - Funcionalidades y recorrido de 3 a 5 minutos.
  - Arquitectura, con el diagrama del diseño 6.2.
  - Decisiones clave: aislamiento por espacio, concurrencia con `UPDATE` condicional y separación `core`/`demo`.
  - Stack.
  - Cómo ejecutarlo en local: requisitos, `npm install -g corepack@latest`, `corepack enable`, `pnpm install`, `docker compose -f compose.dev.yaml up -d`, migraciones, `pnpm dev`.
  - Pruebas.
  - Licencia: **Pendiente del propietario**; dejar la sección marcada.
  - Enlace a la demo: marcador «coming soon» hasta el hito 2.

  Cada README enlaza al otro al principio.
- [ ] **Step 2: Verificar.** Seguir las instrucciones del README en un clon limpio (`git clone` del worktree en una carpeta temporal) hasta ver la bienvenida. Comprobar que los enlaces relativos de los README y de los documentos modificados resuelven.
- [ ] **Step 3: Commit.** `git commit -m "docs: add public README in English and Spanish"`

---

## E7 · Artefactos de despliegue

### Task 16: Imágenes, compose de producción y guía de despliegue

**Files:**
- Create: `apps/api/Dockerfile`, `apps/web/Dockerfile`, `compose.yaml`, `deploy/Caddyfile.example`, `deploy/Caddyfile.local`, `docs/despliegue/README.md`, `.dockerignore`
- Modify: `.github/workflows/ci.yml` (job `images`), `.env.example`

**Interfaces:**
- **Imágenes.** Multi-etapa, basadas en `node:26-slim` y con usuario no root.
  - api: `CMD node dist/server.js`. La misma imagen ejecuta `node dist/cli.js migrate`.
  - web: salida `standalone`, servida con `node server.js`.
- **`compose.yaml`.**
  - Servicios `postgres:18`, `api` y `web`.
  - Red `internal` con subred fija `172.30.0.0/24`; `TRUST_PROXY_CIDR=172.30.0.1/32`, la puerta de enlace.
  - Puertos: `127.0.0.1:4000` para la API y `127.0.0.1:3000` para la web. PostgreSQL no publica puertos.
  - Volumen con nombre para PostgreSQL.
  - Límites de memoria iniciales: `postgres` 384 MB, `api` 256 MB y `web` 384 MB, a ajustar con mediciones.
  - `healthcheck` en los tres servicios y `restart: unless-stopped`.
  - Servicio de una sola ejecución `migrate` (perfil `migrate`).
  - Imágenes parametrizadas por `FLOWDESK_IMAGE_TAG`.
- **`deploy/Caddyfile.example`.** Sitio `{$FLOWDESK_DOMAIN}`: `handle /api/*` → `127.0.0.1:4000` y el resto → `127.0.0.1:3000`. Cabeceras: `Content-Security-Policy`, `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`; `frame-ancestors 'none'` va dentro de la CSP.
- **CI, job `images`.** Construye ambas imágenes en cada `push`. La publicación en GHCR queda en un job `publish` condicionado a `github.ref == 'refs/heads/main'` y a la variable de repositorio `PUBLISH_IMAGES == 'true'`. El propietario decide cuándo activarla.

- [ ] **Step 1: Escribir los Dockerfiles, `compose.yaml` y `.env.example`** (valores ficticios: `POSTGRES_PASSWORD=change-me`, `APP_ORIGIN=https://flowdesk.example.com`).
- [ ] **Step 2: Prueba de despliegue local.** `docker compose build && docker compose --profile migrate run --rm migrate && docker compose up -d`. Esperado: `curl -fsS http://127.0.0.1:4000/api/v1/health` devuelve `{"status":"ok"}`, y `http://127.0.0.1:3000/es` responde 200.
- [ ] **Step 3: End-to-end contra el compose.** En producción, Next.js no reenvía `/api`, así que la prueba local necesita el mismo enrutado que Caddy. Para eso:
  - Añadir `deploy/Caddyfile.local`: escucha en `:8080` y reenvía `/api/*` a `api:4000` y el resto a `web:3000`.
  - Añadir un servicio `caddy` (imagen `caddy:2`) bajo el perfil `local-proxy`, publicado en `127.0.0.1:8080`.
  - Ejecutar `docker compose --profile local-proxy up -d` y después `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e -- tour`, con `APP_ORIGIN=http://127.0.0.1:8080` en el `.env` local.

  Esperado: PASS (aceptación del hito 1 en el diseño 11).
- [ ] **Step 4: Medir.** `docker stats --no-stream` con el recorrido en marcha; anotar en la guía el consumo observado de cada servicio.
- [ ] **Step 5: Guía `docs/despliegue/README.md`.**
  - Requisitos del servidor: Docker con Compose, Caddy en el host y puertos 80 y 443 abiertos. No documentar aquí la configuración de seguridad del servidor.
  - Variables de entorno.
  - Ejecución de migraciones.
  - Configuración de Caddy.
  - Actualización y vuelta atrás por etiqueta de imagen.
  - Qué se respalda: `.env`, `compose.yaml` y el Caddyfile; los datos de la demo no.
  - Consumo medido.

  Encabezado obligatorio: «Ejecutar en el VPS solo con autorización expresa del propietario».
- [ ] **Step 6: Commit.** `git commit -m "build: add container images, production compose and deployment guide"`

## H2 · Bloqueada

### Task 17: Despliegue en el VPS

**Bloqueada** hasta que se cumplan las tres condiciones:

1. El propietario elige el dominio.
2. El propietario autoriza de forma expresa y específica actuar en el VPS.
3. El propietario activa la publicación de imágenes.

Esta tarea no se delega a Codex sin esa autorización. Su ejecución se planificará entonces, siguiendo `docs/despliegue/README.md` y el diseño 12. Criterios de aceptación: los criterios (H2) del diseño 11.

---

## Verificación final del hito 1

- [ ] En la rama integrada: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`. Todo en verde.
- [ ] CI en verde en GitHub. Requiere que el propietario haga push, con su autorización.
- [ ] Despliegue local con `compose.yaml` y recorrido end-to-end superado (tarea 16).
- [ ] Revisión final de Claude Code de la rama completa contra el diseño, con hallazgos por severidad.
- [ ] Aceptación del propietario.

## Registro de aprobación

- **2026-11-22: el propietario aprueba el plan.** Alcance: ejecutar las tareas 1 a 16 mediante encargos a Codex, cada uno en su worktree y rama, con revisión de Claude Code y aceptación del propietario. No autoriza fusionar, hacer push, publicar imágenes, desplegar ni actuar en el VPS; la tarea 17 sigue bloqueada.
- **2026-11-22: el propietario acepta E1 (tareas 1 a 3) y autoriza fusionar `feat/e1-base` en `main`.** Alcance: solo esa fusión local. No autoriza push.
- 2026-11-22: el propietario autoriza corregir el plan tras E1. `packageManager` pasa de `pnpm@12` a `pnpm@12.21.0`, porque Corepack exige una versión completa. Se añade la instalación de Corepack (`npm install -g corepack@latest`), que Node 26 ya no incluye, en las restricciones globales, en la tarea 1, en el CI y en el README de la tarea 15.
- **2026-11-22: el propietario acepta E2 (tareas 4 y 5) y autoriza fusionar `feat/e2-domain` en `main`.** Alcance: solo esa fusión local. No autoriza push.
- **2026-11-22: el propietario acepta E3 (tareas 6 y 7) y autoriza fusionar `feat/e3-demo` en `main`.** Alcance: solo esa fusión local. No autoriza push.
- 2026-11-22: durante la revisión de E4, el propietario aprueba añadir un límite global por IP (`RATE_LIMIT_PER_IP_MIN`, 300 por minuto por defecto) además del límite por sesión. Cuenta todas las rutas antes de resolver la sesión, para que rotar cookies inventadas no evite el límite. Se ajusta también que reanudar una sesión vigente no consuma el cupo horario de creación de espacios. Se actualizan las restricciones globales y las tareas 6, 8 y 9.
- **2026-11-22: el propietario acepta E4 (tareas 8 y 9) y autoriza fusionar `feat/e4-api` en `main`.** Alcance: solo esa fusión local. No autoriza push.
- **2026-11-22: el propietario acepta E5 (tareas 10 a 13) y autoriza fusionar `feat/e5-web` en `main`.** Alcance: solo esa fusión local. No autoriza push.
- **2026-11-22: el propietario acepta E6 (tareas 14 y 15) y autoriza fusionar `feat/e6-e2e` en `main`.** Alcance: solo esa fusión local. No autoriza push. La licencia sigue pendiente de decisión del propietario.
- **2026-11-23: el propietario acepta E7 (tarea 16) y autoriza fusionar `feat/e7-deploy` en `main`.** Alcance: solo esa fusión local. No autoriza push, publicar imágenes ni actuar en el VPS. Con E7 quedan completas las tareas 1 a 16; para cerrar el hito 1 falta el CI en verde en GitHub, que requiere push con autorización del propietario. La tarea 17 sigue bloqueada.
- 2026-11-23: el propietario autoriza el push de `main` a `origin`. El CI de GitHub (ejecución 45194302591, commit `c153989`) pasa: `checks`, `images (api)`, `images (web)` y `e2e` en verde; `publish` omitido porque `PUBLISH_IMAGES` no está activado. **Hito 1 («listo para desplegar») cerrado.** Pendientes del propietario: licencia, dominio de la demo y autorización del hito 2 (tarea 17).
