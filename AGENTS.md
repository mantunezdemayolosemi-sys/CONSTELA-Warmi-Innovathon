# Instrucciones para asistentes de IA en Constela

## Proyecto y estado

Constela es el prototipo web del Grupo 1 de la Warmi Innovathon, Eje 2: orientación laboral, talento visible y autonomía económica. Antes de proponer cambios, leer [README.md](README.md), [docs/RETO.md](docs/RETO.md), [docs/constitution.md](docs/constitution.md) y la spec relacionada en [specs/](specs/README.md).

La aplicación ya existía al adoptar SDD. Las specs 001 y 002 describen su comportamiento implementado y requieren revisión humana; no afirmar que fueron aprobadas previamente. La rama funcional es `codex/registro-usuarias` y su PR #1 sigue pendiente de merge. La adaptación documental se desarrolla en `codex/adaptar-plantilla-warmi`.

## Comandos y estructura

- Requisitos: Node.js 22 o superior y Git.
- Instalar dependencias: `npm ci`.
- Ejecutar: `npm start`; desarrollo con observador: `npm run dev`.
- Validar: `npm run check`, `npm test`, `git diff --check`.
- Interfaz: `public/`; servidor Fastify: `src/`; SQL: `supabase/`; pruebas: `test/`.
- Guía de conexión y origen local: [docs/DESARROLLO.md](docs/DESARROLLO.md).

## Forma de trabajar

1. Relacionar cada nuevo comportamiento con una spec, un requisito y una tarea. Si falta una decisión funcional, aclararla o actualizar la spec antes de implementar ese comportamiento. Se puede avanzar trabajo independiente de la aclaración.
2. Mantener cambios acotados al pedido. La visión en `docs/ALCANCE.md` no autoriza a implementar automáticamente avatar, scraping, retos, portafolio ni pagos.
3. Explicar qué cambiará y por qué en español. Evitar afirmar tareas, aprobaciones, issues, despliegues o pruebas que no existan.
4. Usar ramas y PRs. Conservar el historial y los cambios ajenos; no usar `push --force`, `reset --hard`, `clean -fd` ni descartes masivos sin autorización explícita.
5. Comprobar la autorización de la conversación antes de acciones remotas. Una acción ya autorizada no requiere una confirmación repetida. No modificar colaboradores, permisos, configuración de protección ni credenciales como parte de una tarea ordinaria de código.
6. El equipo decide reparto, revisiones y merge. No asignar tareas a personas, aprobar PRs propios, fusionar PRs ni cerrar trabajo ajeno por iniciativa del asistente.

## Código y datos

- Conservar el stack mientras el pedido no requiera cambiarlo.
- Nunca leer ni imprimir secretos como parte de diagnósticos rutinarios. `.env` y `.env.qa` no se suben.
- No usar claves `service_role` o `secret` en la aplicación. Mantener la identidad verificada, RLS y protección de origen.
- Las pruebas automáticas usan datos ficticios. Las pruebas reales se limitan a cuentas autorizadas y registran la verificación sin publicar sus datos.
- Una migración aplicada no se vuelve a ejecutar ni se reescribe para cambiar el esquema remoto: se prepara una nueva.
- El test es una exploración, no una medición validada ni una certificación. No usar su resultado para decidir acceso a empleos, financiamiento u otras oportunidades.

## Antes de terminar

Ejecutar las comprobaciones pertinentes y comunicar su resultado real. Revisar que cada enlace y comando documental sea correcto. Actualizar tareas con evidencia y distinguir entre implementado, probado, aprobado, subido a una rama e integrado a `main`. Informar con claridad si algo solo quedó local.

La guía para personas está en [CONTRIBUTING.md](CONTRIBUTING.md). Las herramientas opcionales del kit pueden consultarse en la [adaptación](docs/ADAPTACION-PLANTILLA.md); su instalación o activación no forma parte implícita de una tarea de desarrollo.
