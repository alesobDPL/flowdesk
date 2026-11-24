# ADR-001 · Stack: Next.js, API Node.js y PostgreSQL

[Decisiones](README.md) · [Inicio](../00-inicio.md)

**Estado:** Aprobado (2026-11-22)

## Contexto

FlowDesk necesitaba un MVP profesional, seguro, probado y desplegable en un VPS propio, que el propietario pudiera comprender y explicar. El propietario ya tenía experiencia con Next.js como frontend y Node.js como backend independiente; Go le interesaba como aprendizaje.

## Decisión

Next.js + TypeScript para la web, API independiente Node.js + TypeScript y PostgreSQL. El diseño del MVP fijó después las librerías: Fastify, Drizzle, Zod compartido, next-intl, Vitest, Testcontainers y Playwright.

## Alternativas consideradas

- **Node.js + TypeScript (elegida):** reutiliza la experiencia existente, un solo lenguaje en web y API, y concentra el aprendizaje en arquitectura, permisos, persistencia y pruebas.
- **Go para la API:** interesante como aprendizaje, pero añade un lenguaje y herramientas nuevas mientras se resuelve el producto. Se descartó para el MVP.

## Consecuencias

- Tipos y validaciones compartidos entre web y API (`packages/shared`).
- TypeScript no sustituye los controles en tiempo de ejecución: la API valida, autentica y autoriza cada acción.
- Migrar la API a otro lenguaje exigiría reescribir el paquete compartido como contrato HTTP explícito.
