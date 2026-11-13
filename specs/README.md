# Especificaciones de Constela

La incorporación a SDD se realiza el 12 de noviembre de 2026 sobre funcionalidades ya construidas. Las specs 001 y 002 se reconstruyen a partir del código, las decisiones expresadas por la usuaria y sus pruebas. **No representan una aprobación previa del equipo.**

| Spec | Alcance | Implementación | Aprobación humana |
| --- | --- | --- | --- |
| [001 · Registro y perfil](001-registro-perfil/spec.md) | Cuenta, sesión y perfil privado | Implementada en la rama funcional y PR #1 | Pendiente |
| [002 · Universo de habilidades](002-universo-habilidades/spec.md) | Percepción inicial, seis misiones, resultados y reflexión | Implementada en la rama funcional y PR #1 | Pendiente |
| [003 · Galaxias y oportunidades](003-galaxias-oportunidades/spec.md) | Intereses privados, scraping y catálogo recomendado | Incremento solicitado por Maricielo; rama `codex/galaxias-oportunidades` | Pendiente |
| [004 · Retos y organizaciones](004-retos-empresas/spec.md) | Tipos de cuenta, retos guardados, empleos y publicación de simulaciones | Rama `codex/retos-empresas`; demo local | Pendiente |
| [000 · Plantilla](000-plantilla/spec.md) | Punto de partida para nuevas funcionalidades | Plantilla sin completar | No aplica |

Cada spec tiene `spec.md` (qué y por qué), `plan.md` (cómo) y `tasks.md` (trabajo y estado). Al citar un requisito fuera de su carpeta, usar **001:RF-1** o **002:RF-1** para evitar ambigüedades.

La [matriz de trazabilidad](../docs/TRAZABILIDAD.md) relaciona requisitos, código, pruebas automatizadas y comprobaciones manuales. Las tareas ya construidas conservan el vínculo al [PR #1](https://github.com/mantunezdemayolosemi-sys/CONSTELA-Warmi-Innovathon/pull/1); no se inventan issues ni aprobaciones retroactivas.
