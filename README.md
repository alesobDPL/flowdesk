# FlowDesk

[Español](README.es.md) · **[Live demo](https://flowdesk.alejandrosobarzo.cl)**

FlowDesk is a portfolio demo of a software access request workflow, built with
Next.js, Fastify and PostgreSQL. It uses a fictional company and sample data.

## Problem and solution

Access requests scattered across email, chat and spreadsheets make it hard to
know who should act next or why a decision was made. FlowDesk gives each request
an owner, a status and a history: an employee requests access, an approver decides,
and an IT technician records that access was granted manually.

Visitors can try all three perspectives without registering. Each visitor gets
an isolated, temporary demo space. Identity switching simulates demo roles; it
is not a production sign-in system. The MVP covers new software access for the
requester, without automatic provisioning, external integrations or an admin UI.

## Screenshots

English interface, desktop viewport 1280 × 800 and Pixel 7. Captures include the
full page so the detail history is visible. They are generated with
`pnpm screenshots`; see the commands below.

| Screen          | Preview                                                                        |
| --------------- | ------------------------------------------------------------------------------ |
| Welcome         | ![Welcome and demo entry](docs/assets/welcome-en.png)                          |
| Requester list  | ![Employee requests with status and search](docs/assets/requester-list-en.png) |
| New request     | ![Software access request form](docs/assets/new-request-en.png)                |
| Request detail  | ![Completed request with its timeline](docs/assets/request-detail-en.png)      |
| Approvals inbox | ![Requests waiting for an approver](docs/assets/approvals-inbox-en.png)        |
| IT queue        | ![Approved requests available for IT](docs/assets/it-queue-en.png)             |
| Mobile form     | ![New request form on a Pixel 7](docs/assets/mobile-new-request-en.png)        |

## Features and guided tour

- Employee request creation, status filtering, search and request details.
- Approver inbox with approval comments and required rejection reasons.
- IT queue with assignment, release with a reason, and completion notes.
- History recording the actor, event, timestamp and optional note.
- English and Spanish interfaces, responsive navigation and a guided tour panel.
- Five sample requests, demo continuation, reset and expiry.

Allow **3–5 minutes** for the guided tour:

1. Choose **Try the demo** to enter as Laura, the employee.
2. Create a **New request** with a software name and justification.
3. Check its **Pending approval** status and initial history entry.
4. Use **Viewing as** to switch to Diego, the approver.
5. Open your request in the inbox and approve it.
6. Switch to Ana, the IT technician.
7. Open your request in the IT queue and choose **Assign to me**.
8. Choose **Complete** and record that access was granted manually.
9. Return to Laura and inspect the completed request and its four history entries.

The **Guided tour** panel checks off creation, decision, assignment and completion
using visitor-created requests; samples do not count. **Reset demo** starts a
fresh space. By default, spaces expire after two hours or 30 minutes of inactivity
and allow 30 new requests, excluding samples. Limits are configurable in
[the environment reference](.env.example).

## Architecture

Component routing from the [approved design](docs/superpowers/specs/2026-11-22-flowdesk-mvp-design.md):

```mermaid
flowchart LR
    Browser[Browser] -->|HTTPS| Caddy[Caddy: same-origin routing]
    Caddy -->|/api/*| API[API: Node.js / Fastify]
    Caddy -->|all other paths| Web[Web: Next.js]
    API --> DB[(PostgreSQL)]
```

During development, Next.js forwards `/api/*` to the API. The browser always uses the web
origin; the API owns sessions, authorization and business rules. Next.js has no
business logic or database access.

| Component                                       | Responsibility                                             |
| ----------------------------------------------- | ---------------------------------------------------------- |
| [apps/web](apps/web/package.json)               | Localized pages, forms, role views and API queries         |
| [apps/api](apps/api/package.json)               | HTTP API under `/api/v1`, request rules and demo lifecycle |
| [packages/shared](packages/shared/src/index.ts) | Domain types, DTOs, dates and Zod schemas                  |

## Key decisions

- **Isolation per space.** Queries filter by the actor's `scopeId`. Composite
  foreign keys include `demo_space_id`, preventing references across spaces at
  the database level. Deleting an expired space cascades to its data.
- **Conditional updates and transactional history.** A transition uses an
  `UPDATE` conditioned on the current version, state and applicable assignment.
  The state change and event insert share a transaction. Concurrent assignment
  attempts cannot create two assignees or duplicate assignment events; the losing
  attempt receives `409`.
- **Separate `core` and `demo`.** `core` implements request rules using an `Actor`
  containing `userId`, roles and `scopeId`. `demo` resolves the session and builds
  that actor on the server, then manages spaces, quotas and cleanup. The browser
  cannot supply the actor or choose a space identifier.
- **Session and expiry.** The `fd_session` cookie is `HttpOnly`, `SameSite=Lax`
  and `Secure` in production. Only its SHA-256 hash is stored. Each API request
  checks space validity and current server-side identity. Mutations require the
  configured origin and JSON content. Cleanup removes expired spaces in batches
  after a grace period.

## Stack

| Area                  | Tools                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------- |
| Runtime and workspace | Node.js 26, pnpm 12, TypeScript 6                                                           |
| Web                   | Next.js 16, React 19, next-intl, TanStack Query, React Hook Form, Tailwind CSS 4, shadcn/ui |
| API and data          | Fastify 5, Drizzle ORM, PostgreSQL 18, Zod 4                                                |
| Verification          | Vitest, Testing Library, Testcontainers, Playwright, axe, ESLint, Prettier, GitHub Actions  |

## Run locally

For container images, Compose and Caddy, see the
[deployment guide (Spanish)](docs/despliegue/README.md). It includes the tour against
`PLAYWRIGHT_BASE_URL`; VPS operations require explicit owner authorization.

Requirements: **Node.js 26** (see [.nvmrc](.nvmrc)), Docker with Compose v2 and a
running Docker engine. Run commands from the repository root after cloning.
Corepack is installed explicitly because Node.js 26 does not include it.

```sh
npm install -g corepack@latest
corepack enable
pnpm install
docker compose -f compose.dev.yaml up -d --wait
```

The API does not automatically load a root `.env` file. In the terminal where you
will migrate and start the API, export these local development values from
[.env.example](.env.example).

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

Migrate and start the API in that same terminal (port 4000 by default):

```sh
pnpm --filter @flowdesk/api migrate
pnpm --filter @flowdesk/api dev
```

In a second terminal, start the web application:

```sh
pnpm --filter @flowdesk/web dev
```

Open [English](http://localhost:3000/en) or [Spanish](http://localhost:3000/es).
The API health endpoint is `http://localhost:4000/api/v1/health`. There is no root
`pnpm dev` command: start the two processes separately. If port 3000 is occupied,
set the API's `APP_ORIGIN` to `http://localhost:3100` before starting it, and run
`pnpm --filter @flowdesk/web exec next dev --webpack -p 3100` for the web.

To verify the web production build:

```sh
pnpm --filter @flowdesk/web build
```

## Tests

| Level                   | Coverage                                                                                                  | Command                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Unit and web components | Shared validation, state machine, permissions, API adapters and UI behavior                               | `pnpm exec vitest run --config vitest.workspace.ts --project shared --project api-unit --project web` |
| API integration         | Real PostgreSQL: routes, authorization, isolation, concurrency, expiry, quotas, cleanup and origin checks | `pnpm exec vitest run --config vitest.workspace.ts --project api-integration`                         |
| All Vitest projects     | Unit, web and API integration tests                                                                       | `pnpm test`                                                                                           |
| End-to-end              | Browser workflow, lifecycle, isolation, double submit and accessibility scans                             | `pnpm test:e2e`                                                                                       |

Integration tests need Docker; Testcontainers creates their PostgreSQL instance.
For browser tests, install Chromium once after installing dependencies:

```sh
pnpm --filter @flowdesk/web exec playwright install chromium
pnpm test:e2e
```

Stop the development servers first so Playwright can start them with the test
origin. The e2e command starts and waits for Compose PostgreSQL, runs migrations, builds
the web with its API proxy, and lets Playwright start the API and built web. The
default web/API ports are 3100/4000; override `E2E_WEB_PORT` and `E2E_API_PORT` in
the environment if needed. `DATABASE_URL` defaults to the local example URL.

The Spanish tour runs on desktop Chromium and Pixel 7; the English tour runs on
desktop. Tests cover continuation, reset, expiry, two isolated browser contexts
and double submission. axe checks welcome, list, form, detail, inbox and queue in
Spanish on desktop for serious or critical violations. These checks do not
replace a complete accessibility audit. [CI](.github/workflows/ci.yml) runs checks
and e2e tests, retaining the Playwright report on failure.

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm screenshots
```

`pnpm screenshots` uses the same setup and port variables as e2e, creates fresh
English demo spaces and writes the seven PNGs above to `docs/assets/`. Screenshot
cases are excluded from the normal e2e run. In PowerShell, use `pnpm.cmd` if the
execution policy blocks `pnpm.ps1`.

## Documentation and contributing

See the [documentation index](docs/README.md) for implemented components and
commands. Contribution and process rules are in [AGENTS.md](AGENTS.md) and
[CLAUDE.md](CLAUDE.md).

## License

Released under the [MIT License](LICENSE).
