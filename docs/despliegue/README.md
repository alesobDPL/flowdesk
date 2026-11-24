# Ejecutar en el VPS solo con autorización expresa del propietario

[Documentación](../README.md) · [Plan aprobado, Task 16](../superpowers/plans/2026-11-22-flowdesk-mvp.md#task-16-imágenes-compose-de-producción-y-guía-de-despliegue)

Esta guía se preparó en E7 para la aceptación local del hito 1. **La demo está
desplegada desde el 2026-11-23** (Task 17, hito 2) en
<https://flowdesk.alejandrosobarzo.cl>, con HTTPS de Let's Encrypt; el registro
está en el [plan del MVP](../superpowers/plans/2026-11-22-flowdesk-mvp.md). Los
comandos de servidor de las secciones posteriores (actualizar, volver atrás o
cualquier otra actuación en el VPS) siguen exigiendo una autorización específica
del propietario.

## Requisitos

- Docker con Compose v2. Para la prueba local, el motor debe estar iniciado y la
  subred `172.30.0.0/24` disponible.
- En el servidor: Caddy instalado en el host, dominio que apunte al servidor
  y puertos 80/443 abiertos. La configuración de seguridad del servidor queda
  fuera de esta guía.
- Para el recorrido local: Node.js 26, pnpm 12.21.0, dependencias del workspace y
  Chromium de Playwright instalados según los [README](../../README.es.md#pruebas).
  Las imágenes instalan sus propias dependencias y compilan dentro de Docker.

## Variables y secretos

Desde la raíz, copiar [`.env.example`](../../.env.example) a `.env` y editarlo sin
duplicar claves. Compose lee ese archivo automáticamente; los procesos con tsx
necesitan variables exportadas. Para producción, sustituir los valores de
desarrollo indicados en los comentarios de la plantilla:

| Variable                       | Uso / ejemplo ficticio                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `POSTGRES_USER`, `POSTGRES_DB` | `flowdesk` para ambos                                                                                   |
| `POSTGRES_PASSWORD`            | `change-me`; sustituir por un secreto antes del uso real                                                |
| `APP_ORIGIN`                   | `https://flowdesk.example.com`, sin barra final; debe coincidir exactamente con el origen del navegador |
| `FLOWDESK_DOMAIN`              | `flowdesk.example.com`; también debe estar en el entorno del servicio Caddy del host                    |
| `FLOWDESK_IMAGE_REGISTRY`      | `ghcr.io/alesobdpl` por defecto; prefijo, sin barra final                                               |
| `FLOWDESK_IMAGE_TAG`           | `local` al compilar en local; SHA completo de la versión publicada para actualizar o volver atrás       |
| `FLOWDESK_API_PORT`            | `4000`, publicado solo en `127.0.0.1`                                                                   |
| `FLOWDESK_WEB_PORT`            | `3000`, publicado solo en `127.0.0.1`; usar `3300` si está ocupado                                      |
| `FLOWDESK_PROXY_PORT`          | `8080`, solo para el proxy local                                                                        |
| Límites de demo y `LOG_LEVEL`  | Los valores de `.env.example` se pasan a la API; los valores por defecto son los aprobados              |

Compose construye `DATABASE_URL` para API y migraciones desde las variables
`POSTGRES_*`, con host `postgres`. No usa el `DATABASE_URL` de desarrollo ni el
`NODE_ENV` o `PORT` del host. Para la interpolación directa en la URL, usar usuario,
base de datos y contraseña con caracteres seguros para URL; por ejemplo, una
contraseña aleatoria hexadecimal. Cambiar `POSTGRES_PASSWORD` no modifica la
contraseña de una base ya inicializada en un volumen.

`NODE_ENV=production` y `TRUST_PROXY_CIDR=172.30.0.1/32` están fijados en Compose.
La API solo confía en el gateway de Docker, desde donde llega Caddy del host.
No ampliar esa confianza a toda la subred. El proxy del perfil local accede como
otro contenedor y sus cabeceras de IP no son de confianza; las peticiones locales
comparten el límite por IP. Ese perfil valida el enrutado y el recorrido, y no
sustituye las pruebas de integración de `trustProxy`.

La web se compila **sin `API_PROXY_URL`**; Caddy resuelve `/api/*`. La imagen API
incluye bundles ESM de esbuild y migraciones SQL: `@flowdesk/shared` queda incluido
en el bundle y las dependencias npm se instalan solo para producción.

No versionar `.env`. En el servidor autorizado debe tener permisos `0600` y
quedar fuera del repositorio. Caddy del host no lee automáticamente el `.env` de
Compose: configurar `FLOWDESK_DOMAIN` en el entorno de su servicio.

## Prueba local desde cero (revisor)

Usar un `.env` exclusivo para esta prueba con los valores anteriores y estos
cambios. La contraseña siguiente es ficticia:

```dotenv
POSTGRES_USER=flowdesk
POSTGRES_DB=flowdesk
POSTGRES_PASSWORD=change-me
APP_ORIGIN=http://127.0.0.1:8080
FLOWDESK_DOMAIN=flowdesk.example.com
FLOWDESK_IMAGE_REGISTRY=ghcr.io/alesobdpl
FLOWDESK_IMAGE_TAG=local
FLOWDESK_API_PORT=4000
FLOWDESK_WEB_PORT=3300
FLOWDESK_PROXY_PORT=8080
```

Ejecutar desde la raíz. El servicio `migrate` inicia PostgreSQL y espera su salud;
la API no migra al arrancar. No se necesita `compose.dev.yaml`:

```sh
docker compose build api web
docker compose --profile migrate run --rm migrate
docker compose up -d --wait
curl -fsS http://127.0.0.1:4000/api/v1/health
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3300/es
docker compose --profile local-proxy up -d --wait
curl -fsS -D - -o /dev/null http://127.0.0.1:8080/es
curl -fsS http://127.0.0.1:8080/api/v1/health
```

Esperado: API `{"status":"ok"}`, web 200; CSP con `frame-ancestors 'none'`,
`X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin`.
Cada una de estas cabeceras debe aparecer una sola vez a través de Caddy.
En Windows usar `curl.exe` para evitar el alias de PowerShell. Si se eligen otros
puertos, adaptar estas URL y `APP_ORIGIN` al puerto del proxy.

Ejecutar solo el spec `tour`, que incluye el recorrido español en escritorio y
móvil, inglés en escritorio y doble envío. Con `PLAYWRIGHT_BASE_URL`, el
orquestador omite PostgreSQL de desarrollo, migraciones y build, y Playwright no
inicia servidores:

Bash:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e -- tour
```

PowerShell:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:8080'
pnpm.cmd test:e2e -- tour
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

Usar Chromium y la dirección de loopback indicada para esta prueba HTTP local
con cookies `Secure`. En el despliegue público se requiere HTTPS. No ejecutar
el spec `lifecycle` contra este Compose: necesita acceso directo a PostgreSQL,
que no publica puertos. Las ejecuciones repetidas pueden agotar los límites de
demo; esperar su ventana o ajustar temporalmente los límites en el `.env`
exclusivo de pruebas y recrear la API antes de repetir. Restaurar los valores
aprobados antes de cualquier despliegue.

Mientras transcurre el recorrido, medir en otra terminal y completar la tabla:

```sh
docker compose ps
docker stats --no-stream
```

Revisar también reinicios, estados de salud y errores:

```sh
docker compose logs --tail=100 api web postgres
```

Al finalizar, `docker compose --profile local-proxy down` detiene el entorno y
conserva el volumen. No usar `down -v` si se desea conservar esa base local.

## Migraciones

Paso explícito antes de iniciar una versión nueva:

```sh
docker compose --profile migrate run --rm migrate
```

Ejecuta `node dist/cli.js migrate` con la misma imagen y configuración que la API.
Drizzle usa el directorio `apps/api/drizzle` incluido en la imagen y registra las
migraciones aplicadas. Si falla, detener la actualización y revisar el error;
no arrancar la nueva versión. Una migración de esquema no se revierte cambiando
la etiqueta de imagen.

## Caddy en el host (solo con autorización)

Partir de [`deploy/Caddyfile.example`](../../deploy/Caddyfile.example). El sitio
`{$FLOWDESK_DOMAIN}` termina HTTPS y mantiene `/api/*` al reenviar a
`127.0.0.1:4000`; el resto va a `127.0.0.1:3000`. Si se cambian los puertos
publicados por Compose, cambiar también los destinos del Caddyfile del host.
Validar la configuración y recargar el servicio Caddy con el dominio configurado
en su entorno antes de probar la URL pública. El perfil `local-proxy` no se usa
en el servidor.

Las dos configuraciones Caddy y Next.js envían la misma CSP de producción y las
cabeceras `nosniff` y `strict-origin-when-cross-origin`. El bloque `header` de Caddy
usa `defer` para establecer sus valores después de recibir la respuesta del
upstream y reemplazar las cabeceras de Next.js, evitando duplicados. Next.js
conserva sus cabeceras para proteger también el acceso directo. La CSP limita los recursos
al mismo origen, prohíbe objetos y marcos ancestros y permite `data:`/`blob:` para
imágenes. `script-src 'unsafe-inline'` permite los scripts inline que Next.js usa
para hidratación; `style-src 'unsafe-inline'` permite estilos de React y de los
componentes. Es un compromiso: reduce la protección contra inyección de scripts
inline. Nonces por petición exigirían integrar la generación con el renderizado
de Next.js; no se introducen en E7. No se permite `unsafe-eval` en producción
(Next.js lo habilita solo en desarrollo para su depuración).

## Imágenes y CI

[CI](../../.github/workflows/ci.yml) construye ambas imágenes en cada push sin
publicarlas. `publish` depende de checks, e2e e imágenes, solo puede ejecutarse
en `main` con la variable de repositorio `PUBLISH_IMAGES=true` y es el único job
con permiso `packages: write`. Publica en
`ghcr.io/<propietario-del-repositorio>/flowdesk-api` y `flowdesk-web`, con etiquetas
SHA completo y `latest`. El propietario decide cuándo habilitar esa variable.
Si el propietario del repositorio cambia, ajustar `FLOWDESK_IMAGE_REGISTRY`.
Las imágenes se publican desde `main` y son públicas porque el repositorio lo es; el VPS las descarga sin credenciales.

## Actualización y vuelta atrás por etiqueta (solo con autorización)

Con imágenes previamente publicadas y accesibles desde el host, guardar la
etiqueta anterior y establecer `FLOWDESK_IMAGE_TAG` en `.env` al SHA aprobado.
Usar etiquetas SHA para que la versión sea reproducible; `latest` es mutable.
No compilar en el VPS. La carpeta del despliegue pertenece a root, así que los
comandos se ejecutan como root dentro de ella:

```sh
sudo bash -c 'cd /opt/flowdesk && docker compose pull api web'
sudo bash -c 'cd /opt/flowdesk && docker compose --profile migrate run --rm migrate'
sudo bash -c 'cd /opt/flowdesk && docker compose up -d --no-build --wait'
```

`docker compose run` no admite `--no-build` en Compose 5.8; no construye nada si
la imagen ya se descargó con `pull`. La migración no imprime nada cuando termina
bien; el código de salida 0 lo confirma.

Comprobar salud, cabeceras y recorrido por HTTPS. Para volver atrás, restaurar
la etiqueta anterior en `.env`, ejecutar `docker compose pull api web` y
`docker compose up -d --no-build --wait`. Confirmar antes que la versión anterior
sea compatible con el esquema migrado; si no lo es, detenerse y acordar la
recuperación con el propietario. No borrar el volumen ni intentar migraciones
inversas automáticas.

## Qué se respalda

Guardar de forma privada `.env`, `compose.yaml` y el Caddyfile efectivo del host;
conservar la referencia al código y a las etiquetas de imagen utilizadas.
Los datos y solicitudes de la demo son efímeros y **no se respaldan**. La
configuración permite recrear la aplicación y su base vacía con migraciones.

## Consumo medido

Observaciones aportadas por el revisor en la primera ronda de corrección de E7,
en una máquina local con Docker Desktop. Se muestreó `docker stats` cada 5 segundos
durante el recorrido e2e, con unos pocos espacios de demo. El uso de CPU en reposo
fue aproximadamente 0 %, con picos durante el recorrido; no se aportaron cifras
de esos picos.

| Servicio             | Límite inicial        | Memoria durante el recorrido | Memoria en reposo | Notas                                        |
| -------------------- | --------------------- | ---------------------------- | ----------------- | -------------------------------------------- |
| postgres             | 384 MiB               | ~90 MiB                      | ~66 MiB           | Salud correcta                               |
| api                  | 256 MiB               | ~44 MiB                      | No informada      | Salud correcta                               |
| web                  | 384 MiB               | ~78 MiB                      | ~64 MiB           | Salud correcta                               |
| caddy (perfil local) | Sin límite específico | ~19 MiB                      | No informada      | En el VPS corre en el host, fuera de Compose |

Tamaños de las imágenes construidas por el revisor:

| Imagen | Tamaño observado |
| ------ | ---------------- |
| api    | 400 MB           |
| web    | 428 MB           |

El despliegue local pasó: ambas imágenes se construyeron, la migración terminó
correctamente y dejó `request_types` poblada, y API, web y PostgreSQL quedaron
saludables. `/api/v1/health` respondió correctamente tanto por el puerto directo
4000 como a través de Caddy en 8080; `/es` respondió 200 por el puerto directo
3300 y por Caddy. PostgreSQL no publicó ningún puerto. El comando
`PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e -- tour` pasó **5/5 pruebas**.
La ausencia de cabeceras duplicadas tras añadir `defer` queda pendiente de
comprobación por el revisor.

Son mediciones locales con poca carga: **volver a medir en el servidor, con
autorización del propietario, antes de ajustar los límites**. Se mantienen los
límites iniciales. No se comunicaron fecha exacta de muestreo, etiqueta de imagen
ni recuentos de reinicios.
