# Arquitectura

[Volver al inicio](../00-inicio.md)

FlowDesk usa Next.js + TypeScript en la web, una API independiente Node.js + TypeScript (Fastify) y PostgreSQL con Drizzle, en un monorepo pnpm. La decisión está en [ADR-001](../decisiones/ADR-001-stack.md).

- **Componentes y responsabilidades:** tabla *Componentes implementados* de la [documentación técnica](../README.md#componentes-implementados).
- **Diseño completo:** [diseño del MVP](../superpowers/specs/2026-11-22-flowdesk-mvp-design.md) y [rediseño visual](../superpowers/specs/2026-11-23-flowdesk-visual-redesign-design.md).
- **Despliegue:** [guía de despliegue](../despliegue/README.md).
- **Reglas de proceso:** [criterios de desarrollo](criterios-desarrollo.md).

Estado: **Aprobado**. Cualquier cambio de arquitectura se registra primero como ADR en [decisiones/](../decisiones/README.md).
