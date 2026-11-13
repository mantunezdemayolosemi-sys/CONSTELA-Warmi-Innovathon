# Pruebas de Constela

Las pruebas viven en `test/`, la carpeta que ya usa `npm test`. Se conserva esta ubicación al adaptar la plantilla para mantener los comandos y la CI funcionando.

```bash
npm run check
npm test
```

| Archivo | Qué verifica |
| --- | --- |
| `app.test.js` | API, validación, identidad, errores, límites y configuración |
| `supabase.test.js` | Integración HTTP del SDK con Auth, perfiles y misión |
| `database.test.js` | Migración de perfiles, triggers y RLS en PGlite |
| `web.test.js` | Interfaz servida, cookies, origen, sesión y rutas de misión |
| `discovery.test.js` | Catálogo, validación, puntuaciones y empates |
| `discovery-database.test.js` | SQL de misión, resultados, reflexión, aislamiento y revisiones |

La suite contiene 43 pruebas, usa datos ficticios y no envía correos. La correspondencia con las specs se detalla en [TRAZABILIDAD.md](../docs/TRAZABILIDAD.md). Los scripts de comprobación contra Supabase real están en [supabase/tests/](../supabase/tests/) y son verificaciones manuales separadas.

La CI existente es [test.yml](../.github/workflows/test.yml); no se añade un segundo workflow genérico del kit.
