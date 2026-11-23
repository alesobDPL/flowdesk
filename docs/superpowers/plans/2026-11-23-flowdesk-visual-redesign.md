# Plan de implementación del rediseño visual de FlowDesk

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

[Planes](README.md) · [Diseño aprobado](../specs/2026-11-23-flowdesk-visual-redesign-design.md) · [Plan del MVP](2026-11-22-flowdesk-mvp.md)

Fecha: 2026-11-23. Estado: **Aprobado por el propietario el 2026-11-23.** Autoriza delegar a Codex los encargos E8 a E12, en serie y en el orden indicado.

**Goal:** Aplicar a toda la web de FlowDesk el sistema visual «Corporativo nítido» del diseño aprobado, sin cambiar la lógica, la API ni las dependencias, y cerrar el MVP con capturas y GIF nuevos.

**Architecture:** Primero los tokens. `globals.css` define una sola vez el color, la tipografía, los radios y las sombras. Los componentes de `components/ui/*` los consumen, y las pantallas se recomponen sobre unos pocos componentes presentacionales compartidos (`PageHeader`, `Card` y `StatusBadge` con variantes). La portada añade un panel animado solo con CSS.

**Tech Stack:** Next.js 16 (`--webpack`), React 19, Tailwind CSS 4, shadcn/ui con `radix-ui`, next-intl 4, lucide-react, `next/font/google` (Inter), Vitest con Testing Library, Playwright con axe.

**Spec:** [2026-11-23-flowdesk-visual-redesign-design.md](../specs/2026-11-23-flowdesk-visual-redesign-design.md). Quien ejecute un encargo lee las secciones que cita. Las secciones 5 y 6 dan los valores; este plan no los repite.

## Global Constraints

- **Sin dependencias nuevas.** No cambia ningún `package.json` ni `pnpm-lock.yaml`. `next/font/google` forma parte de Next.
- **Alcance del diff:** `apps/web/src`, `apps/web/messages`, `apps/web/test`, `apps/web/e2e`, `docs/assets` y los README. No se toca `apps/api` ni `packages/shared`.
- **Sin hex en bruto en los componentes.** Los colores salen de los tokens de `globals.css` o de la paleta de Tailwind para los estados (5.1). El fondo de cabecera de tabla, el divisor y el hover (6.2), y la trama de la portada (6.6), se definen como tokens.
- **Nombres de tokens y utilidades de Tailwind**, fijados para que los encargos coincidan:

  | Token del diseño | Variable de `@theme` | Utilidad |
  | --- | --- | --- |
  | `text-secondary` | `--color-foreground-secondary` | `text-foreground-secondary` |
  | `primary-strong` | `--color-primary-strong` | `text-primary-strong`, `hover:bg-primary-strong` |
  | `primary-soft` | `--color-primary-soft` | `bg-primary-soft` |
  | `accent-cyan` | `--color-accent-cyan` | `from-accent-cyan` |
  | cabecera de tabla `#F9FBFD` | `--color-table-head` | `bg-table-head` |
  | divisor de fila `#EEF2F6` | `--color-row-divider` | `border-row-divider` |
  | hover de fila `#F5F9FF` | `--color-row-hover` | `hover:bg-row-hover` |
  | trama `#C9D5E6` | `--color-dot-grid` | en el `radial-gradient` de la portada |

  Los tokens shadcn existentes (`background`, `foreground`, `card`, `popover`, `primary`, `muted-foreground`, `border`, `input`, `ring` y `destructive`) toman los valores de 5.1. `secondary` y `accent` pasan a `primary-soft` con texto `primary-strong`.
- **Accesibilidad y pruebas e2e:** se cumple la sección 6.8 completa. Los roles y nombres accesibles que usa `apps/web/e2e` no cambian.
- **Textos:** cada clave nueva entra en `messages/es.json` y `messages/en.json` en el mismo encargo, y `test/messages.test.ts` sigue en verde.
- **Movimiento:** solo `transition` de 150 a 200 ms sobre color, fondo, borde, sombra y `transform`. Todo movimiento se desactiva con `prefers-reduced-motion: reduce`.
- **Cada encargo termina con** `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` en verde. Los encargos que tocan pantallas cubiertas por e2e ejecutan además `pnpm test:e2e`. Codex no tiene Docker; si no puede ejecutarlo, lo hace Claude Code en la revisión.

## Review Focus

1. **Textos largos sin espacios** (un nombre de software de 100 caracteres, el máximo, o una URL en la justificación). Ni la tabla ni el detalle generan scroll horizontal de página a 375 px: las celdas cortan la palabra o la truncan con `title`. Prueba en E9 y E10.
2. **La última acción hace desaparecer la tarjeta Acciones.** Al completar o rechazar, el contenedor sale del DOM (6.8) y el foco no puede quedarse en `body`: pasa al h1 del detalle. Esta regla es una decisión de este plan. Prueba en E10.
3. **Textos de estado más largos, en español** («Aprobada · en cola de TI»). No se parten en dos líneas y no desbordan la tabla a 375 ni a 768 px. Prueba en E9.
4. **Cruce del punto de corte `md`** (redimensionar de 1024 a 375 px). Sigue existiendo un único combobox «Viendo como» accesible, sin identificadores duplicados. Prueba en E9.
5. **Portada con reducción de movimiento o repetida con el teclado.** Con `reduce`, el panel muestra el estado final al instante. «Ver de nuevo» funciona con Enter y Espacio y reinicia la secuencia sin acumular animaciones. Prueba en E11.

## Encargos para Codex y ramas

Cada encargo se ejecuta en su propio worktree y rama, que parte de `main` después de fusionar el anterior. Van **en serie**, aunque la sesión de diseño propuso paralelizar E9, E10 y E11:

- todos editan `messages/*.json`;
- E9 y E10 comparten `StatusBadge` y `Card`;
- en paralelo habría conflictos y tres revisiones simultáneas.

Codex deja el trabajo sin commit; Claude Code revisa, verifica y hace el commit. El propietario acepta y fusiona cada encargo.

| Encargo | Rama | Tareas | Secciones del diseño |
| --- | --- | --- | --- |
| E8 Sistema visual | `feat/e8-visual-system` | 1 | 5.1–5.4 |
| E9 Marco de la app y tablas | `feat/e9-shell-tables` | 2 | 6.1, 6.2, 6.8 |
| E10 Detalle, formulario y diálogos | `feat/e10-detail-form` | 3 | 6.3–6.5, 6.8 |
| E11 Portada y demo caducada | `feat/e11-landing` | 4 | 6.6, 6.7, 6.8 |
| E12 Capturas, GIF y README | `feat/e12-assets` | 5 | 8 |

## Estructura de archivos

| Archivo | Responsabilidad | Encargo |
| --- | --- | --- |
| `src/app/globals.css` | Tokens, Inter en `--font-sans`, sombras y keyframes de la portada | E8, E11 |
| `src/app/[locale]/layout.tsx` | Carga Inter con `next/font/google` y expone su variable CSS | E8 |
| `src/components/ui/{button,input,select,textarea,tabs,dialog,sheet,badge}.tsx` | Estilo según 5.4, con la misma API | E8 |
| `src/components/ui/card.tsx` (nuevo) | `Card`, `CardHeader`, `CardTitle`, `CardContent` y `CardFooter`, solo presentacionales | E8 |
| `src/components/page-header.tsx` (nuevo) | Patrón de cabecera de página (6.1) | E8 |
| `src/components/brand-mark.tsx` (nuevo) | Logotipo con degradado (5.3) | E8 |
| `src/components/status-badge.tsx` | Variantes `inline` (punto y texto) y `badge` (insignia tintada) | E8 |
| `src/components/app-shell.tsx`, `tour-panel.tsx`, `countdown.tsx`, `identity-switcher.tsx` | Marco de la app (6.1) | E9 |
| `src/components/request-table.tsx`, `request-filters.tsx` y las páginas de `app/` (requests, approvals, queue) | Tablas, filtros y cabeceras (6.2) | E9 |
| `src/app/[locale]/app/requests/[id]/page.tsx`, `request-timeline.tsx`, `request-actions.tsx` | Detalle (6.4) | E10 |
| `src/components/request-form.tsx`, `app/requests/new/page.tsx`, `reason-dialog.tsx` | Formulario y diálogos (6.3, 6.5) | E10 |
| `src/app/[locale]/page.tsx`, `public-header.tsx`, `flow-panel.tsx` (nuevo), `app/[locale]/demo-expired/page.tsx` | Portada y demo caducada (6.6, 6.7) | E11 |
| `e2e/a11y.spec.ts`, `e2e/screenshots.spec.ts` | `test.use({ reducedMotion: 'reduce' })` | E11 |
| `docs/assets/*`, `README.md`, `README.es.md` | Capturas, GIF y textos que describen la interfaz | E12 |

## E8 · Sistema visual

### Task 1: Tokens, Inter y componentes base

**Files:**
- Modify: `apps/web/src/app/globals.css`, `apps/web/src/app/[locale]/layout.tsx`, `apps/web/src/components/ui/{button,input,select,textarea,tabs,dialog,sheet,badge}.tsx`, `apps/web/src/components/status-badge.tsx`
- Create: `apps/web/src/components/ui/card.tsx`, `apps/web/src/components/page-header.tsx`, `apps/web/src/components/brand-mark.tsx`
- Test: `apps/web/test/status-badge.test.tsx`, `apps/web/test/page-header.test.tsx` (nuevo)

**Interfaces:**
- Produces:
  - `StatusBadge({ status, variant = 'inline' }: { status: RequestStatus; variant?: 'inline' | 'badge' })`. Muestra un punto `aria-hidden` y el texto `statuses.<status>`, con `whitespace-nowrap`.
  - `PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode })`. Renderiza un `h1`, el subtítulo en `muted-foreground` y las acciones a la derecha en `sm` o más, y debajo en móvil.
  - `Card`, `CardHeader`, `CardTitle` (renderiza un `h2`; acepta `id` para `aria-labelledby`), `CardContent` y `CardFooter`. Son `div` con clases y aceptan `className`.
  - `BrandMark({ className }: { className?: string })`. Es el cuadrado con degradado y `LayersIcon`, `aria-hidden`.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - `status-badge.test.tsx`:
    - `inline variant shows a decorative dot and the status text`: el texto `Aprobada · en cola de TI` existe, y el punto tiene `aria-hidden="true"`.
    - `status text never wraps`: el elemento del texto tiene la clase `whitespace-nowrap`, en ambas variantes.
    - `badge variant uses a tinted background`: con `variant="badge"`, el contenedor tiene clases de fondo de la familia del estado (por ejemplo, `bg-blue-50` para `approved`).
  - `page-header.test.tsx`:
    - `renders a single h1 with the title and the description`.
    - `renders actions only when provided`.
- [ ] **Step 2: Ejecutar** `pnpm --filter @flowdesk/web test`. Esperado: FAIL, porque las variantes y `PageHeader` no existen.
- [ ] **Step 3: Tokens y fuente.**
  - En `globals.css`, los valores de 5.1 con los nombres de Global Constraints, los radios de 5.3 (`--radius` de 6 px para los controles; las tarjetas usan `rounded-lg` de 8 px), y las sombras `--shadow-card`, `--shadow-overlay` y `--shadow-hero` (5.3).
  - En `layout.tsx`, `Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })`, con la clase en `<html>`. `--font-sans` pasa a ser `var(--font-inter), system-ui, sans-serif`.
- [ ] **Step 4: Componentes base y nuevos** según 5.4 y las interfaces de arriba.
  - `tabs`: subrayado con un indicador de 2 px en `primary`. Conserva los roles de Radix.
  - Foco: `focus-visible:ring-2 ring-ring ring-offset-2` en todos los controles.
  - `StatusBadge`: los colores de punto y texto de 5.1 con la paleta de Tailwind (500 y 800); la variante `badge` añade el fondo 50 de la misma familia.
- [ ] **Step 5: Ejecutar** `pnpm --filter @flowdesk/web test`, y luego `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`. Esperado: PASS. Los usos actuales de `StatusBadge` siguen compilando con la variante por defecto.
- [ ] **Step 6: Comprobación de contraste.** Para cada par de texto y fondo de 5.1 y de los estados, calcular la relación de contraste (puede ser con un script desechable fuera del repositorio) y anotarla en la entrega. Todos los textos deben dar al menos 4,5:1.
- [ ] **Step 7: Commit (Claude Code).** `feat(web): add the visual system tokens, Inter and base components`

## E9 · Marco de la app y tablas

### Task 2: App shell, cabeceras de página, tablas y filtros

**Files:**
- Modify: `apps/web/src/components/{app-shell,tour-panel,countdown,identity-switcher,request-table,request-filters}.tsx`, `apps/web/src/app/[locale]/app/{requests,approvals,queue}/page.tsx`, `apps/web/messages/{es,en}.json`
- Test: `apps/web/test/app-shell.test.tsx`, `apps/web/test/request-list.test.tsx`, `apps/web/test/role-lists.test.tsx`, `apps/web/e2e/tour.spec.ts`

**Interfaces:**
- Consumes: `PageHeader`, `Card`, `StatusBadge variant="inline"` y `BrandMark` de E8.
- Produces, con estos nombres de clave:
  - `app.workspace`: «Espacio de trabajo» / «Workspace».
  - `app.subtitles.requests`, `app.subtitles.approvals`, `app.subtitles.queue` y `app.subtitles.newRequest`. Esta última la usa E10.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - `app-shell.test.tsx`:
    - `renders exactly one "Viendo como" combobox` (Review Focus 4): `getAllByRole('combobox', { name: /viendo como/i })` tiene longitud 1.
    - `desktop aside keeps the complementary role and its name`.
    - `shows the workspace group label above the navigation link`.
  - `request-list.test.tsx` y `role-lists.test.tsx`:
    - `each list page has one h1 and its subtitle`.
    - `table uses fixed layout and the status cell does not wrap`: la tabla tiene `table-fixed` y la celda de estado contiene un `StatusBadge` inline.
  - `tour.spec.ts`, prueba nueva `no horizontal page scroll at 375 px with long values` (Review Focus 1 y 3), solo en el proyecto `mobile` y en español:
    - crear una solicitud con un nombre de software de 100 caracteres (el máximo) sin espacios;
    - en «Mis solicitudes», comprobar que `document.documentElement.scrollWidth <= clientWidth` y que el estado «Pendiente de aprobación» ocupa una sola línea (la altura del elemento es igual a su interlineado).
- [ ] **Step 2: Ejecutar** `pnpm --filter @flowdesk/web test`. Esperado: FAIL.
- [ ] **Step 3: Marco.** Implementar 6.1 en `app-shell.tsx`.
  - El combobox «Viendo como» y la cuenta atrás se montan **una sola vez**, en un bloque de contexto. Una rejilla CSS con áreas lo coloca en el pie de la barra lateral en `md` o más, y bajo la barra superior en móvil. Nada se renderiza dos veces.
  - El `aside` sigue siendo `complementary` con el nombre `app.navigation`. El panel lateral móvil conserva la navegación y el recorrido.
  - «Reiniciar demo» conserva el nombre accesible `app.reset` en todas las anchuras.
- [ ] **Step 4: Páginas de lista y tablas.**
  - Cabeceras con `PageHeader`: el título actual y su subtítulo `app.subtitles.*`.
  - Tablas según 6.2: `table-fixed` con un ancho por columna; celdas largas con `truncate` y `title`, o con `break-words`.
  - Filtros en una barra de herramientas y pestañas subrayadas.
  - Estados vacíos en `Card`, con un icono lucide `aria-hidden`.
- [ ] **Step 5: Ejecutar** las comprobaciones de Global Constraints y `pnpm test:e2e`. Esperado: PASS, incluida la prueba nueva.
- [ ] **Step 6: Commit (Claude Code).** `feat(web): redesign the app shell, page headers and request tables`

## E10 · Detalle, formulario y diálogos

### Task 3: Detalle en dos columnas, formulario en tarjeta y diálogos

**Files:**
- Modify: `apps/web/src/app/[locale]/app/requests/[id]/page.tsx`, `apps/web/src/components/{request-timeline,request-actions,request-form,reason-dialog}.tsx`, `apps/web/src/app/[locale]/app/requests/new/page.tsx`, `apps/web/messages/{es,en}.json`
- Test: `apps/web/test/request-detail.test.tsx`, `apps/web/test/request-actions.test.tsx`, `apps/web/test/request-timeline.test.tsx`, `apps/web/test/request-form.test.tsx`, `apps/web/e2e/tour.spec.ts`

**Interfaces:**
- Consumes: `PageHeader`, `Card`, `StatusBadge variant="badge"` y `app.subtitles.newRequest`.
- Produces:
  - `RequestActions` devuelve `null` cuando `request.allowedActions` está vacío y no hay error que mostrar.
  - El h1 del detalle lleva `tabIndex={-1}` y un `id`, para recibir el foco.
  - Textos: se elimina `actions.none` en los dos idiomas. `requestDetail.data` pasa a «Información de la solicitud» en `es`; `en` ya dice «Request information».

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - `request-detail.test.tsx`:
    - `hides the actions card when no action is available`: no hay un encabezado `requestDetail.actions`.
    - `renders the status badge exactly once inside main`.
    - `moves focus to the heading after the last action empties the actions` (Review Focus 2): partiendo de una solicitud con `allowedActions: ['complete']`, simular la respuesta con `allowedActions: []` y esperar que `document.activeElement` sea el h1.
  - `request-timeline.test.tsx`:
    - `keeps a list named by timeline.title with one heading per event and decorative rail`: un `listitem` por evento, en orden; un encabezado por `listitem`; el carril y los nodos con `aria-hidden`.
  - `request-actions.test.tsx`: se elimina la aserción de `actions.none`, si la hay, y se anota en la entrega.
  - `request-form.test.tsx`: `renders inside a card with the actions in the footer`. Las pruebas de validación existentes no cambian.
  - `tour.spec.ts`, prueba nueva `detail does not scroll horizontally with a long justification` (Review Focus 1), en `mobile`: una justificación con una URL de 200 caracteres no genera scroll horizontal en el detalle.
- [ ] **Step 2: Ejecutar** `pnpm --filter @flowdesk/web test`. Esperado: FAIL.
- [ ] **Step 3: Detalle** según 6.4.
  - La insignia aparece solo en la cabecera, con la fecha de creación debajo.
  - En `lg` o más, dos columnas: información e historial a la izquierda; acciones (si las hay) y personas a la derecha. En una columna, el orden es acciones, información, personas e historial.
  - Cuando una mutación deja `allowedActions` vacío, el foco pasa al h1. Un efecto en la página que observa el paso de «tenía acciones» a «no tiene» es suficiente.
- [ ] **Step 4: Formulario y diálogos** según 6.3 y 6.5. No cambian ni la lógica ni el foco de los diálogos.
- [ ] **Step 5: Ejecutar** las comprobaciones de Global Constraints y `pnpm test:e2e`. Esperado: PASS.
- [ ] **Step 6: Commit (Claude Code).** `feat(web): redesign the request detail, form and dialogs`

## E11 · Portada y demo caducada

### Task 4: Portada con panel animado, «Tres perspectivas» y demo caducada

**Files:**
- Modify: `apps/web/src/app/[locale]/page.tsx`, `apps/web/src/components/public-header.tsx`, `apps/web/src/app/[locale]/demo-expired/page.tsx`, `apps/web/src/app/globals.css`, `apps/web/messages/{es,en}.json`, `apps/web/e2e/{a11y,screenshots}.spec.ts`
- Create: `apps/web/src/components/flow-panel.tsx`
- Test: `apps/web/test/welcome.test.tsx`, `apps/web/test/flow-panel.test.tsx` (nuevo)

**Interfaces:**
- Consumes: `BrandMark`, `Card`, `StatusBadge variant="badge"` y los tokens de E8.
- Produces:
  - `FlowPanel()`: la lista ordenada de 3 pasos con los textos actuales y la muestra decorativa. Un botón «Ver de nuevo» reinicia la animación cambiando la `key` del contenedor animado.
  - Claves nuevas:
    - `welcome.replay`
    - `welcome.sampleRequest` («FD-0005 · Notion · Edición»)
    - `welcome.perspectivesTitle`
    - `welcome.perspectives.{employee,approver,it}.{eyebrow,title,description}`
    - `welcome.sourceLink`
    - `welcome.opensInNewTab`

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - `flow-panel.test.tsx`:
    - `keeps an ordered list with the three current step titles`.
    - `sample request is decorative`: su contenedor tiene `aria-hidden="true"`.
    - `replay restarts the sequence` (Review Focus 5): tras pulsar «Ver de nuevo» con el teclado (Enter y Espacio), el contenedor animado es un nodo nuevo. Se comprueba la identidad del elemento antes y después.
  - `welcome.test.tsx`:
    - `try demo button keeps its exact accessible name`.
    - `GitHub link opens safely`: `href` es `https://github.com/alesobDPL/flowdesk`, `rel` contiene `noopener` y `noreferrer`, y el nombre accesible incluye `welcome.opensInNewTab`.
    - `renders the three perspectives`.
- [ ] **Step 2: Ejecutar** `pnpm --filter @flowdesk/web test`. Esperado: FAIL.
- [ ] **Step 3: Portada** según 6.6.
  - Los keyframes van en `globals.css`, dentro de `@media (prefers-reduced-motion: no-preference)`. Fuera de esa consulta, los elementos se pintan directamente en su estado final.
  - La secuencia dura 5 s o menos, se reproduce una vez y termina con `animation-fill-mode: forwards`.
  - El h1 no usa texto en degradado.
- [ ] **Step 4: Demo caducada** según 6.7.
- [ ] **Step 5: Pruebas e2e.** Añadir `test.use({ reducedMotion: 'reduce' })` en `a11y.spec.ts` y `screenshots.spec.ts`; no se cambia ninguna aserción. `demo-video.spec.ts` no se toca.
- [ ] **Step 6: Ejecutar** las comprobaciones de Global Constraints y `pnpm test:e2e`. Esperado: PASS, con axe sin infracciones graves ni críticas.
- [ ] **Step 7: Commit (Claude Code).** `feat(web): redesign the welcome page with the animated flow panel`

## E12 · Capturas, GIF y README

### Task 5: Artefactos de documentación y verificación final

**Files:**
- Modify: `docs/assets/*.png`, `docs/assets/flowdesk-tour.gif`, `README.md`, `README.es.md` (solo los textos que describen la interfaz, si los hay)

- [ ] **Step 1: Capturas.** `pnpm screenshots`. Esperado: se regeneran las capturas de `docs/assets` con el diseño nuevo y nombres de archivo sin cambios.
- [ ] **Step 2: GIF.** `pnpm demo:video` y la misma conversión a GIF que en el pulido posterior al MVP: menos de 5 MB, con la animación de la portada visible.
- [ ] **Step 3: Comprobación manual** a 375, 768, 1024 y 1440 px, en `es` y `en`:
  - sin scroll horizontal de página;
  - tablas alineadas;
  - foco visible al recorrer cada pantalla con el teclado;
  - la portada con y sin reducción de movimiento.

  Anotar el resultado en la entrega.
- [ ] **Step 4: Verificación completa.** `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`. Comprobar además que `git diff main --stat` no toca `apps/api`, `packages/shared` ni ningún `package.json`.
- [ ] **Step 5: Commit (Claude Code).** `docs: refresh screenshots and the demo GIF for the visual redesign`

## Después de E12 (requiere autorización)

Lo siguiente queda fuera de este plan. Cada paso necesita la autorización explícita del propietario:

1. push de `main`;
2. CI en verde y publicación de las imágenes;
3. despliegue en el VPS con el procedimiento de `docs/despliegue/README.md`;
4. comprobación pública;
5. publicación en LinkedIn.

## Registro de aprobación

- **2026-11-23: el propietario aprueba este plan** («Apruebo, lanza E8»). Autoriza delegar los encargos E8 a E12 a Codex, en serie, cada uno en su rama y worktree. Cada encargo necesita su aceptación antes de fusionarse. No autoriza hacer push, desplegar ni publicar.
