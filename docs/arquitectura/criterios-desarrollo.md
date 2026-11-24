# Criterios de alcance, calidad y proceso

[Arquitectura](README.md) · [Inicio](../00-inicio.md) · [Instrucciones para Codex](../../AGENTS.md)

Estado: **Orientación aprobada por el usuario**, 2026-11-04. Su aprobación rige el proceso de desarrollo; no aprueba el diseño, el plan ni todas las funcionalidades propuestas en el descubrimiento.

## Alcance controlado

- Construir un MVP pequeño, funcional, mantenible y con calidad profesional, centrado en completar el flujo principal.
- Incluir únicamente funcionalidades necesarias para ese flujo; evitar funcionalidades especulativas y sobreingeniería.
- Posponer excepciones poco frecuentes cuando exista una solución sencilla y segura. La simplificación de alcance no reduce los controles de calidad ni de seguridad.
- Documentar funcionalidades futuras sin implementarlas ni anticipar sus mecanismos técnicos.
- El MVP atenderá a **una única empresa**, sin multi-tenancy, administración multiempresa ni mecanismos de aislamiento entre organizaciones. La evolución multiempresa se podrá estudiar después. Se mantienen los controles de acceso entre usuarios de la empresa.
- Las reglas y excepciones ya exploradas conservan su estado de propuestas hasta validar el diseño; no todas se convierten automáticamente en alcance obligatorio.

## Calidad de ingeniería

- Arquitectura clara y mantenible, adecuada al tamaño del MVP.
- Código limpio, organizado y tipado cuando corresponda.
- Validaciones tanto en frontend como en backend.
- Autenticación y autorización correctamente implementadas.
- Manejo adecuado de errores y estados inesperados.
- Integridad de datos y operaciones seguras frente a concurrencia cuando sea relevante.
- Pruebas automatizadas de las reglas de negocio críticas.
- Pruebas de integración y end-to-end de los flujos principales.
- Configuración segura y despliegue reproducible.

Las herramientas, tecnologías, comandos y criterios concretos de verificación se definirán con el diseño y el plan. Estos principios no seleccionan un stack ni una infraestructura.

## Descubrimiento eficiente

Usar la skill brainstorming de Superpowers y mantener una visión global mediante el mapa de descubrimiento (en la documentación privada del propietario). Antes de profundizar en un área, revisar qué dimensiones generales siguen sin definirse.

Priorizar preguntas que puedan cambiar el alcance, la arquitectura o decisiones principales del MVP, preferentemente una por mensaje. Registrar detalles menores, excepciones secundarias y funcionalidades futuras como pendientes o propuestas y continuar, reservando el detalle técnico profundo para diseño e implementación.

Consultar decisiones de producto y técnicas al usuario. Cuando existan alternativas relevantes, presentar ventajas, desventajas y una recomendación adecuada al MVP. Mantener acuerdos, propuestas y pendientes en la documentación.

## Etapas y aprobaciones

1. Completar el descubrimiento con brainstorming, acordar un enfoque y presentar una propuesta coherente de diseño según las [convenciones de specs](../superpowers/specs/README.md).
2. Obtener aprobación explícita del documento de diseño.
3. Usar la skill writing-plans de Superpowers para convertirlo en tareas pequeñas, implementables y verificables según las [convenciones de plans](../superpowers/plans/README.md).
4. Obtener aprobación explícita del plan antes de implementarlo. No escribir código de aplicación, crear scaffolding ni instalar dependencias sin un plan aprobado.
5. Durante la implementación, Codex sigue las reglas de [AGENTS.md](../../AGENTS.md): test primero, búsqueda de la causa ante fallos y verificación con evidencia antes de declarar una tarea terminada.

Mantener actualizada la documentación afectada y comunicar las verificaciones ejecutadas, sus resultados y las limitaciones reales.
