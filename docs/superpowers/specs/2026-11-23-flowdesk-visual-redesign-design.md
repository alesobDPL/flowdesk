# FlowDesk: rediseño visual

- **Fecha:** 2026-11-23
- **Estado:** Aprobado por el propietario el 2026-11-23.
- **Parte de:** [diseño del MVP](2026-11-22-flowdesk-mvp-design.md), sección 13 («estilos visuales dentro de Tailwind y shadcn/ui»). Es la última fase antes de dar el MVP por terminado.

## 1. Intención

FlowDesk es la pieza de portafolio del propietario para su búsqueda de trabajo como desarrollador. Según el propietario, la web actual «se ve muy plana y no muy profesional, parece una web genérica de hace unos años». Le falta orden: los elementos no siguen una misma línea y las tablas se desordenan. Además, los títulos y los textos secundarios no se distinguen por color. El objetivo es que quien la abra, por ejemplo un reclutador o un equipo técnico, perciba en pocos segundos un producto SaaS profesional y cuidado.

Referencias del propietario:

- **Snowflake (app y web):** orden, alineación y menú agrupado, con títulos en un color y textos secundarios en otro.
- **Webflow:** tipografía con presencia y un azul de marca claro.
- **BoardUI:** acabado de panel moderno y tablas limpias.

Rechazó expresamente el negro en las tablas, que considera «un acierto malísimo».

Diagnóstico del estado actual, en `apps/web` y las capturas de `docs/assets`:

- La fuente es la del sistema (`system-ui`).
- El índigo se aplica sobre tintes pastel, de modo que todo tiene el mismo peso.
- La cabecera de la app ocupa unos 170 px en dos filas.
- La barra lateral tiene un solo enlace.
- El detalle de una solicitud es una columna larga de etiquetas grises, con «Acciones» vacío al principio.
- La portada sigue la plantilla típica de titular, botón y tres tarjetas.

## 2. Objetivos, no objetivos y antiobjetivos

**Objetivos**

- Un sistema visual coherente: tokens de color, tipografía, espaciado, radios y sombras definidos una sola vez y usados en todas las pantallas.
- Una jerarquía clara en cada pantalla: título, subtítulo, acción principal y contenido.
- Tablas alineadas y estables en cualquier anchura.
- Una portada con movimiento que cuente el flujo de FlowDesk.

**No objetivos**

- Cambiar la lógica, la API, los estados, los permisos, las rutas o el modelo de datos.
- Modo oscuro.
- Un logotipo nuevo generado con IA.
- Animaciones dentro de la app, más allá de las transiciones de estado de los controles.

**Antiobjetivos.** El rediseño fracasa, aunque «funcione», si ocurre cualquiera de estas cosas:

- Empeora la accesibilidad: aparece una infracción grave o crítica de axe, o se pierde el foco visible o el contraste AA.
- Rompe el i18n o deja textos sin traducir.
- Introduce dependencias nuevas.
- Rompe las pruebas existentes o las debilita para que pasen.
- Hay scroll horizontal de página a 375 px.
- La portada se vuelve llamativa a costa de la claridad.

## 3. Restricciones

- Stack sin cambios: Next.js 16 (`--webpack`), Tailwind 4, shadcn/ui con `radix-ui`, next-intl (es y en) y lucide-react.
- **Sin dependencias nuevas.** La fuente se carga con `next/font/google`, que forma parte de Next. Se descarga y se aloja junto a la web durante la compilación, así que la CSP actual (`font-src 'self'`) no cambia. La compilación necesita internet; CI y Docker ya lo tienen.
- WCAG 2.2 AA según el diseño del MVP, sección 9:
  - contraste de 4,5:1 en texto normal y de 3:1 en texto grande y en bordes de controles;
  - foco visible;
  - estados que no dependan solo del color.
- Se respeta `prefers-reduced-motion`.
- Cada texto nuevo se añade en `messages/es.json` y `messages/en.json`, y debe seguir pasando la prueba de paridad (`test/messages.test.ts`).
- Las pruebas e2e localizan los elementos por rol y nombre accesible, por ejemplo:
  - el combobox «Viendo como»;
  - `complementary` con el nombre de la navegación en escritorio;
  - el diálogo de navegación en móvil.

  Esos roles y nombres se conservan.
- El diff queda dentro de `apps/web`, de los README y de `docs/assets`, salvo la documentación afectada.

## 4. Enfoques considerados

**Dirección visual.** Se mostraron al propietario tres maquetas de la misma pantalla en el navegador:

- **A · Corporativo nítido:** Inter, azul marino y azul de marca.
- **B · Editorial audaz:** Geist, negro y azul eléctrico.
- **C · Panel suave:** Plus Jakarta Sans, gris claro y píldoras.

**El propietario eligió A.** Descartó B por el negro en tablas y navegación.

**Cómo se construye:**

1. **Primero los tokens (elegido).** Se redefinen los tokens en `globals.css`, se ajustan en su sitio los componentes de `components/ui/*`, que el proyecto ya tiene copiados, y luego se recompone la maquetación de cada pantalla. Un cambio en los tokens se propaga a todas las pantallas, el diff es legible y no añade dependencias.
2. **Retocar cada pantalla con clases sueltas.** Es más rápido al principio, pero repite colores en bruto, se desordena con el tiempo y es justo lo que causa la sensación actual de falta de unidad.
3. **Adoptar un kit externo (BoardUI u otro).** Requiere dependencias o licencias nuevas y rehacer componentes accesibles que ya funcionan. Queda fuera por las restricciones.

## 5. Sistema visual (decidido)

### 5.1 Color

Solo modo claro. Los valores son los del catálogo de UI/UX Pro Max, ajustados para cumplir el contraste AA. Las columnas «Rol» y «Uso» resumen la función de cada token.

| Token | Valor | Rol | Uso |
| --- | --- | --- | --- |
| `background` | `#F6F8FB` | Fondo de la app y de la portada | |
| `card` / `popover` | `#FFFFFF` | Superficies | |
| `foreground` | `#0B2545` | Títulos y texto principal | Azul marino, nunca negro puro |
| `text-secondary` | `#33445C` | Texto de celdas y párrafos | |
| `muted-foreground` | `#5B6B82` | Subtítulos, etiquetas y ayudas | Mínimo para texto pequeño |
| `border` | `#E3E8EF` | Divisores y bordes de tarjeta | |
| `input` | `#8592A6` | Borde de campos | 3:1 sobre blanco |
| `primary` | `#1D6FD8` | Botón principal y estado activo | Texto blanco encima: 4,8:1 |
| `primary-strong` | `#1758B8` | Enlaces, códigos FD-xxxx y hover del primario | Texto sobre blanco: 6,7:1 |
| `primary-soft` | `#EAF2FE` | Fondo del elemento activo y resaltados | |
| `accent-cyan` | `#29B5E8` | Solo decorativo: degradado del logotipo, trama y puntos | **Nunca para texto** |
| `ring` | `#1D6FD8` | Foco | Anillo de 2 px con separación de 2 px |
| `destructive` | `#B42318` | Errores y acciones destructivas | |

Los componentes no usan hex en bruto: todo sale de los tokens.

**Estados.** Siempre punto de color y texto. En tablas, el punto y el texto van sobre fondo transparente; en el detalle, en una insignia con fondo tintado suave.

| Estado | Punto | Texto |
| --- | --- | --- |
| `pending_approval` | ámbar 500 | ámbar 800 |
| `approved` | azul 500 | azul 800 |
| `in_progress` | violeta 500 | violeta 800 |
| `completed` | esmeralda 500 | esmeralda 800 |
| `rejected` | rosa 500 | rosa 800 |

El texto de las insignias no se parte en dos líneas.

Los textos son los de `statuses.*`, sin cambios; por ejemplo, «Aprobada · en cola de TI» y «En ejecución». Las pruebas e2e los buscan con `exact: true`. La columna de estado se dimensiona para el texto más largo, y en pantallas estrechas actúa el `overflow-x-auto` del contenedor.

### 5.2 Tipografía

**Inter**, variable y con el subconjunto `latin` (incluye los acentos y la ñ). Se carga con `next/font/google`, se expone como variable CSS y se usa en `--font-sans`, con las fuentes del sistema como alternativa. Los códigos, las fechas y las cifras usan `tabular-nums`.

| Nivel | Tamaño / interlineado | Peso | Otros |
| --- | --- | --- | --- |
| Titular de portada | 56/60 en escritorio, 38/42 en móvil | 800 | tracking −0,03em |
| Título de página (h1) | 24/32 | 700 | tracking −0,01em |
| Título de sección (h2) | 16/24 | 600 | |
| Cuerpo | 16/24 (portada y formularios), 14/20 (tablas y paneles) | 400 | |
| Etiqueta de grupo y encabezado de tabla | 12/16 | 600 | mayúsculas, tracking 0,05em, `muted-foreground` |
| Mínimo absoluto | 12 px | | |

### 5.3 Forma, espacio y profundidad

- **Radios:** 6 px en botones, campos y menús; 8 px en tarjetas y tablas; 12 a 14 px en los paneles de la portada.
- **Espaciado:** escala de Tailwind en múltiplos de 4. El contenido de la app tiene un relleno de 24 a 32 px y un ancho máximo de unos 1280 px.
- **Sombras:**
  - tarjetas: `0 1px 2px rgb(11 37 69 / .05)`;
  - menús y diálogos: una sombra media;
  - panel de la portada: `0 24px 48px -24px rgb(11 37 69 / .25)`.
- **Transiciones:** 150 a 200 ms en `color`, `background-color`, `border-color`, `box-shadow` y `transform`. Nunca se anima `width` ni `height`.
- **Logotipo:** cuadrado de 28 a 32 px, con radio de 7 px, degradado de `accent-cyan` a `primary` y el icono `LayersIcon` actual en blanco.

### 5.4 Componentes base (`components/ui/*`)

Se ajustan a los tokens sin cambiar su API ni su accesibilidad.

- **Botón:**
  - el primario va en `primary` con hover en `primary-strong`;
  - el secundario o *outline* lleva fondo blanco y borde `#D5DCE6`;
  - el de tipo *ghost* es para acciones discretas.
- **Campos (`input`, `select`, `textarea`):** borde `input`, foco con `ring` y error en `destructive`, con el mensaje junto al campo como hoy.
- **Pestañas (`tabs`):** estilo subrayado, con un indicador de 2 px en `primary` y el texto activo en `foreground` con peso 600. Sustituye al estilo de píldora gris.
- **Diálogo y panel lateral (`dialog`, `sheet`):** radio de 8 a 12 px, sombra media y título en h2.

## 6. Pantallas (decidido)

### 6.1 Marco de la app (`app-shell`)

**Escritorio (md o más):**

- **Barra lateral fija** de unos 248 px, blanca y con borde derecho. Contiene, de arriba abajo:
  1. el logotipo y «FlowDesk»;
  2. la etiqueta de grupo «Espacio de trabajo» / «Workspace», que es un texto nuevo;
  3. el enlace de navegación del rol, con el estado activo en `primary-soft`, el texto en `primary-strong` y peso 600;
  4. el recorrido guiado (`TourPanel`), con el estilo nuevo;
  5. al fondo, una tarjeta con el selector «Viendo como» y la cuenta atrás de la demo.

  El `aside` conserva el rol `complementary` y su nombre.
- **Barra superior** de una sola fila, de unos 56 px, blanca y con borde inferior. A la derecha lleva el selector de idioma y «Reiniciar demo».

**Móvil (menos de md):**

- **Barra superior:** botón de menú, logotipo, idioma y «Reiniciar demo» solo con icono, con su `aria-label`.
- **Debajo:** una fila compacta con la cuenta atrás y «Viendo como», porque el recorrido e2e en móvil cambia de identidad sin abrir el menú.
- **Menú:** el panel lateral conserva la navegación y el recorrido.

En cada anchura existe **una sola instancia accesible** del combobox «Viendo como» (la otra, si existe, queda con `display:none`).

**Patrón de cabecera de página**, común a todas las pantallas:

- un h1;
- un subtítulo en `muted-foreground`, que es un texto nuevo por pantalla;
- la acción principal alineada a la derecha, por ejemplo «Nueva solicitud» en «Mis solicitudes». En móvil pasa debajo.

### 6.2 Tablas y listas («Mis solicitudes», bandeja de aprobaciones, cola de TI)

- El contenedor es una tarjeta: blanca, con borde `border`, radio de 8 px y `overflow-x-auto`, como hoy.
- **Columnas:** `table-layout: fixed` con anchos definidos por columna, para que las filas no se reordenen visualmente según el contenido.
- **Encabezado:** fondo `#F9FBFD` y etiquetas de 12 px en mayúsculas.
- **Filas:**
  - altura mínima de 48 px y divisores `#EEF2F6`;
  - hover en `#F5F9FF`;
  - el código va en `primary-strong` con `tabular-nums`, y las fechas también llevan `tabular-nums`.
- **Estado:** punto y texto (5.1), sin saltos de línea.
- **Filtros (`request-filters`):** en una barra de herramientas sobre la tabla, alineados a su borde y a la misma altura que los controles.
- **Bandeja de aprobaciones:** las pestañas Pendientes y Decididas usan el estilo subrayado.
- **Estados vacíos:** un texto centrado en la tarjeta con un icono lucide decorativo (`aria-hidden`).

### 6.3 Nueva solicitud (`request-form`)

- El formulario va en una tarjeta con un ancho máximo de unos 640 px.
- Las etiquetas son de 14 px con peso 600 y la ayuda va en `muted-foreground`.
- Los errores se mantienen junto al campo.
- Las acciones van en un pie de tarjeta alineado a la derecha.

### 6.4 Detalle de una solicitud

- **Cabecera:**
  - h1 «FD-0001 · Salesforce», como hoy;
  - debajo, la insignia de estado y la fecha de creación en `muted-foreground`.
- **lg o más: dos columnas.**
  - **Izquierda, unos 2/3:**
    - una tarjeta «Información de la solicitud», con una lista de definiciones en dos columnas: etiqueta de 12 px en `muted-foreground` y valor de 14 px en `text-secondary`;
    - debajo, una tarjeta «Historial» con línea de tiempo: carril vertical, nodos circulares, el evento en peso 600, la persona y la fecha en `muted-foreground`, y el comentario en un bloque tintado.
  - **Derecha, unos 1/3:**
    - la tarjeta **Acciones**, arriba, **solo cuando hay acciones disponibles**; si no las hay, la sección no se muestra y el texto `actions.none` deja de usarse;
    - la tarjeta **Personas**, con la persona solicitante, la aprobadora, la técnica asignada y la que completó la solicitud, en una lista compacta de nombre en 600 y área en gris.
- **Menos de lg:** una sola columna en este orden: acciones (si las hay), información, personas e historial.

### 6.5 Diálogos (`reason-dialog`, reiniciar demo)

Solo cambian los tokens y el estilo base. El comportamiento del foco y del bloqueo mientras hay una acción pendiente no cambia.

### 6.6 Portada (`/[locale]`)

Se basa en la maqueta aprobada en la sesión de diseño.

- **Cabecera pública:** logotipo nuevo y selector de idioma. Fondo blanco con un 80 % de opacidad y borde inferior.
- **Hero, en dos columnas en lg:**
  - **Izquierda:**
    - una píldora con `demoLabel` en `primary-soft` y borde azul suave;
    - el h1 en dos líneas: la primera en `foreground` y la segunda en `primary` sólido, sin texto en degradado, para garantizar el contraste;
    - la descripción en 18 px en `muted-foreground`;
    - el botón «Probar demo» (`DemoEntry`, sin cambios de lógica ni de texto, porque e2e lo localiza por su nombre exacto), primario de 44 px de alto, con una sombra azul suave;
    - la nota debajo.
  - **Derecha:** el panel «De la solicitud al acceso».
- **Fondo del hero:** una trama de puntos (`radial-gradient` de 1 px y 20 px de separación, color `#C9D5E6`) que se desvanece con una máscara radial. Es decorativa.
- **Panel animado (el movimiento elegido):**
  - Conserva la lista ordenada semántica de tres pasos: Solicitar, Aprobar y Completar, con los textos actuales.
  - A la izquierda, un carril vertical con un nodo por paso.
  - Debajo, una solicitud de muestra decorativa (`aria-hidden`), «FD-0005 · Notion · Edición», cuyo estado cambia de Pendiente de aprobación a Aprobada y a Completada. Los nombres de los estados reutilizan `statuses.*`; el texto de la muestra es nuevo.
  - La secuencia tiene tres fases: el carril se llena, el paso activo se resalta con borde `primary`, fondo `#F5F9FF` y anillo `primary-soft`, y la insignia cambia.
  - **Se reproduce una sola vez al cargar, en 5 segundos o menos, y se queda en el estado final** (Completada, con los tres pasos marcados). Así cumple WCAG 2.2.2 sin necesidad de control de pausa.
  - Un botón discreto, «Ver de nuevo» / «Replay» (texto nuevo), la vuelve a reproducir.
  - Con `prefers-reduced-motion` se muestra directamente el estado final, sin animación.
  - Se implementa solo con CSS (`@keyframes` y una clase o atributo para repetirla). No hay parpadeos en bucle.
- **Entrada:** el contenido del hero aparece con un fundido y un desplazamiento de 8 px, de 400 ms o menos, desactivado con reducción de movimiento.
- **Sección «Tres perspectivas»** (textos nuevos): tres tarjetas, Empleada, Aprobador y TI. Cada una lleva un antetítulo en `primary-strong` en mayúsculas de 12 px, un título de 16 px en peso 600 y una frase. Al pasar el ratón se elevan 2 o 3 px y ganan sombra; con reducción de movimiento solo cambia la sombra.
- **Pie:** el lema actual (`footer`) y un enlace «Código en GitHub» / «Source on GitHub» a `https://github.com/alesobDPL/flowdesk`. El enlace es externo, con `rel="noopener noreferrer"` y una indicación accesible de que se abre en otra pestaña si lo hace.
- Los textos actuales de la portada se conservan. Solo se añaden claves nuevas.

### 6.7 Demo caducada

Usa la misma cabecera pública, el mismo fondo con trama y una tarjeta centrada con el título y la acción actuales.

### 6.8 Compatibilidad con las pruebas e2e (obligatoria)

La revisión independiente comprobó estos puntos en `apps/web/e2e`. El rediseño los respeta:

- **Textos de estado.** Se mantienen sin cambios. En el detalle, la insignia de estado aparece **una sola vez** dentro de `main`, en la cabecera, para no romper el modo estricto de Playwright.
- **Historial.** Sigue siendo una lista (`role="list"`) con el nombre accesible `timeline.title`. Lleva un `listitem` por evento, en orden, y exactamente un encabezado por evento, al mismo nivel que hoy. El carril y los nodos son decoración (`aria-hidden`).
- **Personas.** El «área» de cada persona es el `jobTitle` de `UserRef`. No se añaden pruebas que busquen a las personas por su nombre.
- **Acciones.** Cuando no hay acciones disponibles, el contenedor sale del DOM. Se elimina `actions.none` de los dos idiomas.
- **«Viendo como».** Se monta **una sola vez** y se coloca con CSS adaptable: en la tarjeta de la barra lateral en escritorio y en la fila compacta en móvil. Se evita montarlo dos veces, que duplicaría identificadores y nombres accesibles. «Reiniciar demo» conserva su nombre accesible exacto en todas las anchuras.
- **Recorrido guiado.** Sigue siendo `details`/`summary` nativo, cerrado por defecto, con el mismo texto y dentro del `aside` `complementary` en escritorio y del diálogo de navegación en móvil.
- **«Probar demo».** Conserva su nombre exacto.
- **Animación de la portada.**
  - `a11y.spec.ts` y `screenshots.spec.ts` emulan `reducedMotion: 'reduce'` con `test.use`, para medir y capturar el estado final de forma estable. Es una configuración de las pruebas: ninguna aserción se debilita.
  - `demo-video.spec.ts` no la emula, para que el GIF muestre la animación.

## 7. Lo que queda al implementador

- La organización interna de clases y si se crean componentes pequeños compartidos, como `PageHeader`, `StatusDot` o `Card`, siempre que sean presentacionales.
- Los anchos exactos de las columnas de cada tabla y los colores exactos de los tintes de las insignias de estado, cumpliendo 4,5:1.
- El mecanismo exacto de la repetición de la animación de la portada y cómo se garantiza que las capturas y el GIF se toman en el estado final. Por ejemplo, emulando la reducción de movimiento en esos scripts.
- La redacción de los textos nuevos en español y en inglés, en el tono actual: frases cortas y voz activa.

## 8. Verificación y aceptación

1. `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` en verde, sin debilitar ninguna prueba. Si una prueba depende de un detalle visual eliminado, como el texto `actions.none`, se ajusta y se explica en la entrega.
2. axe sin infracciones graves ni críticas en las pantallas de `a11y.spec.ts`. El resultado debe ser estable con la animación en marcha o en su estado final.
3. Comprobación manual a 375, 768, 1024 y 1440 px: sin scroll horizontal de página, tablas alineadas y foco visible al recorrer cada pantalla con el teclado.
4. Sin cambios en `apps/api`, en `packages/shared` ni en las dependencias de ningún `package.json`.
5. Capturas de `docs/assets` regeneradas con `pnpm screenshots` y el GIF con `pnpm demo:video`, al final y en la misma rama o en un encargo posterior, según indique el plan.
6. Revisión de Claude Code contra esta especificación y aceptación del propietario. El push, el despliegue y la publicación siguen necesitando su autorización explícita.
