# Adaptación del kit Warmi a Constela

Tarea documental autorizada por la usuaria el 12 de noviembre de 2026. Rama: `codex/adaptar-plantilla-warmi`. Base funcional: `codex/registro-usuarias`, que contiene la aplicación del PR #1 todavía pendiente de merge.

## Referencias

- Kit: [Dav082004/WarmiInnovathon-](https://github.com/Dav082004/WarmiInnovathon-), commit `d58c296de44547973de84cce676226b3e2bd75b8`.
- Datos del equipo y visión: [documento del Grupo 1](https://docs.google.com/document/d/1ChiZJkQcohItuXl21GZ8o8ZgV1FMcWghAtaYn8sB8TY/edit).
- Autoría y aviso del material adaptado: [NOTICE.md](../NOTICE.md) y [LICENCIA-PLANTILLA.txt](LICENCIA-PLANTILLA.txt).

## Decisiones de adaptación

| Elemento del kit | Adaptación en Constela |
| --- | --- |
| README de equipo | Problema, solución, demo local, funcionalidades, tecnologías, cuatro integrantes y checklist |
| Constitución y reto | Principios concretos del producto y contexto del Eje 2; bases y criterios oficiales por confirmar |
| Specs, plan y tareas | Specs 001 y 002 reconstruidas de la implementación; plantilla 000 para futuros incrementos |
| Colaboración y reglas de IA | `CONTRIBUTING.md` y `AGENTS.md` con ramas reales, comandos y revisión humana |
| Formatos de issue y PR | Formularios de tarea y bug y plantilla de pull request |
| CI genérica | Se conserva el workflow de Constela, que ya comprueba sintaxis y las 43 pruebas |
| Carpeta `tests/` de referencia | Se mantiene `test/`, que es la ruta real utilizada por npm |
| README técnico anterior | Se conserva en `docs/DESARROLLO.md` con sus enlaces ajustados |
| Pitch | Borrador con recorrido real y etapas futuras separadas |
| Captura | Vista de la misión sin datos personales ni credenciales |

Los agentes preconfigurados de Copilot/OpenCode, las skills y los instaladores del kit son herramientas opcionales disponibles en el repositorio de referencia. El equipo puede incorporarlos cuando decida qué editor y asistentes usará. El flujo documental ya puede seguirse con las herramientas actuales.

## Límites y coherencia

No se modifican `src/`, `public/`, migraciones, dependencias ni credenciales en esta adaptación. No se crea un proyecto nuevo de Supabase. La publicación remota, tablero, etiquetas, protección de ramas y colaboradores son configuraciones separadas del repositorio; este documento no afirma que estén creadas.

Las specs no se presentan como decisiones aprobadas antes del desarrollo. El documento de solución menciona arquetipos; la versión de seis misiones acordada muestra habilidades. Esa diferencia queda explícita en [ALCANCE.md](ALCANCE.md) para decisión del equipo.

## Criterios de esta tarea

- [x] D1. Conservar las instrucciones técnicas anteriores y preparar README del equipo.
- [x] D2. Documentar requisitos, planes, tareas y evidencia de registro y misión.
- [x] D3. Incorporar reglas de colaboración, principios y formatos de GitHub.
- [x] D4. Registrar integrantes, reto, visión y pendientes sin inventar aprobaciones.
- [x] D5. Ejecutar comprobaciones de enlaces, sintaxis y pruebas, y registrar el resultado real.
  Resultado local: `npm run check` correcto; 43 pruebas pasadas, cero fallos; 82 enlaces locales válidos; tres formularios YAML válidos y `git diff --check` sin errores.
- [ ] D6. Subir la adaptación a una rama y abrir un PR para revisión, sin fusionarlo.

## Pendientes del equipo

Confirmar usuarios de GitHub de Fatima, Mikella y Tyra; nombre propio del equipo si difiere de Grupo 1; mentora; reparto de tareas; bases y criterios del jurado; alcance del siguiente incremento y alojamiento de la demo.
