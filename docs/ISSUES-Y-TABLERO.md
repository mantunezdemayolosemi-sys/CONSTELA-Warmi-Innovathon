# Tareas y tablero del equipo

**Estado actual:** formatos preparados; tablero, etiquetas y asignaciones pendientes de acordar. Preparar estos archivos no crea automáticamente recursos en GitHub.

## Áreas sugeridas

Diseño, Frontend, Backend y datos, Pruebas, Despliegue, Docs y pitch. Cada tarea debe tener un resultado verificable y un área principal. Si necesita trabajo independiente de varias áreas, dividirla y registrar dependencias.

## Contenido de un issue

- Título con una acción concreta.
- Spec y requisito completos, por ejemplo `002:RF-7`.
- Tarea de `tasks.md`, por ejemplo `002:T7`.
- Qué debe quedar hecho y cómo se comprueba.
- Área, dependencias y alcance excluido cuando corresponda.
- Responsable decidido por el equipo y una revisora diferente de la autora.

Las plantillas se guardan en [tarea.yml](../.github/ISSUE_TEMPLATE/tarea.yml) y [bug.yml](../.github/ISSUE_TEMPLATE/bug.yml). GitHub las presenta por defecto cuando estén en su rama predeterminada.

## Tablero propuesto

Crear un GitHub Project del equipo con estados **Por hacer**, **En progreso**, **En revisión** y **Hecho**. Campos útiles: Área, Spec/RF, Tarea y Responsable. Vincular el repositorio y añadir los issues reales.

La tarea pasa a En revisión cuando tiene PR. Se marca Hecho cuando el equipo acepta el resultado, revisa la evidencia y se integra el cambio; una casilla implementada en una spec histórica no afirma que ya se hizo ese merge.

## Primeros pendientes para conversar

| Trabajo | Referencia | Estado |
| --- | --- | --- |
| Revisar registro y permisos | 001:T5 | Por acordar issue y revisora |
| Confirmar redacción del test | 002:T7 | Por acordar issue y responsable |
| Revisar misión y resultados | 002:T8 | Por acordar issue y revisora |
| Preparar SMTP y publicación | 001:T6, 001:T7 | Depende de decisiones de alojamiento y correo |
| Completar GitHub, mentora y datos de entrega | Checklist del README | Pendiente del equipo |
| Definir logo y avatar | Visión en ALCANCE.md | Requiere acordar una nueva spec |

Los nombres de las integrantes están en el [README](../README.md). Este documento no decide sus asignaciones ni crea notificaciones para ellas.
