# Flujo SDD para Constela

Adaptación del kit: [créditos](../NOTICE.md). SDD significa acordar el comportamiento en una especificación y mantener relacionados requisitos, tareas, código y verificación.

## El recorrido

1. **Contexto y principios:** revisar [RETO.md](RETO.md), [constitution.md](constitution.md) y [ALCANCE.md](ALCANCE.md).
2. **Spec:** escribir qué se quiere y por qué, con requisitos verificables y fuera de alcance. Punto de partida: [000-plantilla](../specs/000-plantilla/spec.md).
3. **Clarificación:** registrar preguntas, resolver las decisiones que bloquean el trabajo y revisar la spec en equipo.
4. **Plan:** describir stack, módulos, datos y estrategia de pruebas. Mantener el stack actual salvo una razón acordada.
5. **Tareas e issues:** dividir por área, declarar dependencias y acordar quién las toma. No inventar responsables ni issues.
6. **Implementación y comprobación:** trabajar en una rama y conservar evidencia de lo comprobado.
7. **Revisión y merge:** abrir un PR; una compañera revisa y el equipo decide integrar.
8. **Demo y pitch:** verificar el recorrido en el entorno de presentación y explicar con claridad qué está construido.

## Cómo se incorpora el trabajo anterior

Las specs 001 y 002 se documentaron después de implementar el registro y el test. Las casillas terminadas reflejan código y pruebas existentes. El PR #1 sirve como referencia histórica; su revisión y merge continúan pendientes. A partir de esta adaptación, los nuevos comportamientos se acuerdan primero en su spec.

## Preguntas útiles para trabajar con un asistente

| Fase | Pedido concreto |
| --- | --- |
| Especificar | «Queremos agregar esta funcionalidad. Revisa el reto y ayúdanos a definir alcance y casos límite». |
| Revisar | «Comprueba si cada requisito se puede verificar y señala dudas sin inventar respuestas». |
| Planificar | «Relaciona los requisitos acordados con archivos, datos y tareas por área». |
| Implementar | «Implementa esta tarea y comprueba sus criterios de aceptación». |
| Revisar PR | «Revisa este cambio frente a la spec y distingue errores de sugerencias». |
| Preparar demo | «Recorre el flujo que mostraremos y comunica los fallos que encuentres». |

El equipo puede pedir estos roles a su asistente habitual; no necesita instalar otro producto para utilizar la documentación. Las decisiones, asignaciones, aprobaciones y merge siguen siendo del equipo.

## Si cambia la idea

Actualizar primero alcance y requisitos, identificar las tareas afectadas y revisar sus pruebas. Una idea de la visión a futuro no pasa a ser un compromiso de la entrega hasta que el equipo la incorpore a una spec y su plan.
