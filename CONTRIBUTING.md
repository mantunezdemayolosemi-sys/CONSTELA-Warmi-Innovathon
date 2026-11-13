# Cómo trabajamos en Constela

Esta guía adapta el kit de la Warmi Innovathon a la aplicación existente. El equipo revisa estas reglas en la misma entrega documental. La IA puede ayudar a escribir y comprobar; la responsabilidad de aceptar y fusionar es humana.

## Del requisito al cambio

1. Revisar [el reto](docs/RETO.md), [el alcance](docs/ALCANCE.md) y la spec relacionada en [specs/](specs/README.md).
2. Para un nuevo comportamiento, actualizar o crear `spec.md`, revisar dudas y acordar el plan y las tareas.
3. Abrir un issue por tarea y área, con el identificador completo, por ejemplo `002:RF-7` y `002:T4`.
4. Acordar quién toma la tarea y quién revisa. Una persona no aprueba su propio PR.
5. Crear una rama, implementar lo acordado y ejecutar los controles.
6. Abrir un PR con explicación y evidencia, y pedir revisión humana.
7. El equipo decide el merge y actualiza el estado de la tarea y el tablero.

## Situación actual de las ramas

- `main` aún no contiene la aplicación funcional del PR #1.
- `codex/registro-usuarias` contiene registro, perfil y misión de habilidades.
- `codex/adaptar-plantilla-warmi` incorpora la documentación del kit sobre esa base.

Mientras el PR #1 siga pendiente, una tarea que dependa de la aplicación debe partir de la rama funcional acordada, no de un `main` que aún carece de ella. La revisión documental se compara contra `codex/registro-usuarias`; después de integrar la base, el flujo habitual puede partir de `main` actualizado. No se fusiona automáticamente ningún PR como parte de esta adaptación.

## Comandos de trabajo

Consultar el estado no modifica archivos:

```bash
git status
git diff
git fetch origin
```

Para una tarea nueva, usar el número real de su issue. Ejemplo ilustrativo una vez acordada la base:

```bash
git switch -c 12-descripcion-corta origin/codex/registro-usuarias
```

Antes de abrir el PR:

```bash
npm run check
npm test
git diff --check
git add archivo-modificado
git commit -m "docs: explica el cambio realizado"
git push -u origin nombre-real-de-la-rama
```

`git add` prepara archivos, `commit` guarda una versión local y `push` la envía a GitHub. Revisar los archivos preparados antes de subir. No ejecutar comandos que descarten trabajo o reescriban historia sin comprenderlos y acordarlo con el equipo.

## Revisión

- El PR explica el comportamiento o documento que cambia y cita spec, RF y tarea cuando corresponde.
- Cada RF indica su prueba automatizada o su comprobación manual en la [matriz](docs/TRAZABILIDAD.md).
- `npm run check` y `npm test` deben pasar. Si cambia la interfaz, incluir evidencia del recorrido y de celular.
- Si cambia una migración, probar permisos y aislamiento con datos ficticios. No volver a ejecutar migraciones ya aplicadas.
- Los cambios documentales comprueban enlaces, comandos y coherencia con el código.
- La revisión humana decide aprobación y merge; una CI verde no los sustituye.

## Datos y herramientas

Credenciales y cuentas reales quedan fuera de Git. `.env` y `.env.qa` son locales. Para ejecutar, usar [la guía técnica](docs/DESARROLLO.md). El equipo puede usar su editor o asistente habitual; las integraciones opcionales del kit requieren configuración individual y no son necesarias para arrancar Constela.

Las plantillas de issues y PR estarán disponibles por defecto en GitHub después de que esta adaptación llegue a la rama predeterminada. El tablero y sus etiquetas se gestionan según [ISSUES-Y-TABLERO.md](docs/ISSUES-Y-TABLERO.md).
