# Cómo trabajamos en Constela

Esta guía adapta el kit de la Warmi Innovathon a la aplicación existente. El equipo revisa estas reglas en la misma entrega documental. La IA puede ayudar a escribir, comprobar e integrar cambios autorizados; las decisiones de publicación y revisión son del equipo.

## Del requisito al cambio

1. Revisar [el reto](docs/RETO.md), [el alcance](docs/ALCANCE.md) y la spec relacionada en [specs/](specs/README.md).
2. Para un nuevo comportamiento, actualizar o crear `spec.md`, revisar dudas y acordar el plan y las tareas.
3. Abrir un issue por tarea y área, con el identificador completo, por ejemplo `002:RF-7` y `002:T4`.
4. Acordar quién toma la tarea y quién revisa. Una persona no aprueba su propio PR.
5. Actualizar `main`, implementar lo acordado y ejecutar los controles.
6. Revisar el diff y guardar un commit con explicación y evidencia.
7. Publicar en `main` cuando esté autorizado y actualizar el estado de la tarea. Las ramas y PRs son opcionales cuando el equipo los solicite.

## Rama de trabajo

Desde el 16 de noviembre de 2026, por solicitud de Maricielo, la versión integrada está en `main` y trabajamos directamente desde esa rama. Las ramas anteriores conservan el historial; integrarlas no equivale a aprobar automáticamente sus PRs o specs.

Coordinen los archivos y tareas antes de comenzar. Con cambios locales pendientes, primero revisen y guarden su trabajo; no cambien de rama ni descarten archivos a ciegas.

## Comandos de trabajo

Con la copia local limpia:

```bash
git status
git switch main
git pull --ff-only origin main
```

Después de implementar y revisar:

```bash
npm run check
npm test
git diff --check
git diff
git add archivo-modificado
git commit -m "docs: explica el cambio realizado"
git push origin main
```

`git add` prepara archivos, `commit` guarda una versión local y `push` la envía a GitHub. Revisar los archivos preparados antes de subir. Si el pull o el push detectan cambios ajenos, integrar esos cambios y repetir las comprobaciones pertinentes; nunca forzar el push ni descartar trabajo para resolverlo. No modificar la protección de ramas si GitHub requiere un PR: usar el flujo que permita el repositorio.

## Revisión

- El commit y, cuando se utilice, el PR explican el comportamiento o documento que cambia y cita spec, RF y tarea cuando corresponde.
- Cada RF indica su prueba automatizada o su comprobación manual en la [matriz](docs/TRAZABILIDAD.md).
- `npm run check` y `npm test` deben pasar. Si cambia la interfaz, incluir evidencia del recorrido y de celular.
- Si cambia una migración, probar permisos y aislamiento con datos ficticios. No volver a ejecutar migraciones ya aplicadas.
- Los cambios documentales comprueban enlaces, comandos y coherencia con el código.
- Una CI verde no sustituye la revisión humana ni demuestra aprobación de specs o PRs.

## Datos y herramientas

Credenciales y cuentas reales quedan fuera de Git. `.env` y `.env.qa` son locales. Para ejecutar, usar [la guía técnica](docs/DESARROLLO.md). El equipo puede usar su editor o asistente habitual; las integraciones opcionales del kit requieren configuración individual y no son necesarias para arrancar Constela.

Las plantillas de issues y PR estarán disponibles por defecto en GitHub después de que esta adaptación llegue a la rama predeterminada. El tablero y sus etiquetas se gestionan según [ISSUES-Y-TABLERO.md](docs/ISSUES-Y-TABLERO.md).
