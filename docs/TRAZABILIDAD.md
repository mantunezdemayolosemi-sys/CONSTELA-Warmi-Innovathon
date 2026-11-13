# Trazabilidad y evidencia

La suite contiene 58 pruebas tras incorporar la spec 003 y su ajuste para Lima. Las secciones 001/002 se incorporaron retrospectivamente; no se afirma que una comprobación manual sea una prueba automatizada.

Ejecutar desde la raíz: `npm run check` y `npm test`. La [CI](../.github/workflows/test.yml) ejecuta esos comandos con Node.js 22. Los planes y requisitos están en [specs/](../specs/README.md).

## Spec 001 · Registro y perfil

| RF | Código principal | Evidencia automatizada | Comprobación manual previa |
| --- | --- | --- | --- |
| RF-1 | `src/validation.js`, `src/supabase.js` | [app.test.js](../test/app.test.js): normalización y rechazo de entradas; [supabase.test.js](../test/supabase.test.js): alta y metadatos | Alta real con correo autorizado y confirmación |
| RF-2 | `src/validation.js`, `src/supabase.js` | `app.test.js`: respuesta genérica; `supabase.test.js`: correo duplicado | No se usa la respuesta para afirmar si una cuenta existe |
| RF-3 | `src/supabase.js` | `app.test.js`: credenciales; `supabase.test.js`: rechazo de correo sin confirmar | Acceso rechazado antes de confirmar y permitido después |
| RF-4 | `src/web.js`, `public/app.js` | [web.test.js](../test/web.test.js): cookies, renovación y ausencia de tokens en cuerpo | Sesión conservada al recargar |
| RF-5 | `src/app.js`, `src/web.js`, SQL | `app.test.js`: identidad propia; [database.test.js](../test/database.test.js): aislamiento RLS; `web.test.js`: ID verificado | Prueba SQL real con cuentas temporales revertidas |
| RF-6 | Validación, gateway y SQL | `app.test.js`: campos permitidos; `database.test.js`: nombre y columnas protegidas | Edición del nombre y restauración del dato de prueba |
| RF-7 | `src/web.js`, `src/supabase.js` | `app.test.js`, `supabase.test.js`, `web.test.js`: revocación y borrado de cookies | Salida real y rechazo posterior de renovación |
| RF-8 | `src/web.js` | `web.test.js`: origen ausente, null, ajeno y cross-site | Formularios en origen local configurado |
| RF-9 | `src/app.js`, `src/web.js` | `app.test.js`: presupuesto de intentos compartido en API | Configuración del grupo web revisada; no se afirma prueba de carga |
| RF-10 | `src/app.js`, `public/app.js` | `web.test.js`: redirección con fragmento vacío y error sin reflejar detalles | Retorno de confirmación real |

## Spec 002 · Universo de habilidades

| RF | Código principal | Evidencia automatizada | Comprobación manual previa |
| --- | --- | --- | --- |
| RF-1 | `public/app.js`, `public/discovery.js` | `web.test.js` comprueba ruta y catálogo autenticado; no ejecuta el navegador | Inicio de sesión abre `/descubrir` una vez elegidas las galaxias (spec 003) |
| RF-2 | `src/discovery.js`, SQL, interfaz | [discovery.test.js](../test/discovery.test.js): límite y duplicados; [discovery-database.test.js](../test/discovery-database.test.js): opciones inválidas | Límite de tres y alternativa sin selección |
| RF-3 | Catálogo en `src/discovery.js` | `discovery.test.js`: seis misiones, cuatro opciones distintas, cuatro oportunidades por habilidad | Recorrido completo con tarjetas y caminos |
| RF-4 | `src/web.js`, gateway y SQL | `web.test.js`: guardado; `supabase.test.js`: RPC con JWT; `discovery-database.test.js`: persistencia | Primera misión ilumina una estrella |
| RF-5 | `public/discovery.js`, gateway | `discovery-database.test.js`: lectura del avance propio; SDK/web verifican el contrato | Recarga retoma misión 2; al completar recupera resultados |
| RF-6 | `src/discovery.js`, SQL | `discovery.test.js`: seis puntos y empates; `discovery-database.test.js`: cálculo 4/2 | Resultado de creatividad y organización con elecciones ficticias |
| RF-7 | `src/discovery.js` | `discovery.test.js`: habilidades no reconocidas y empates | Creatividad aparece como estrella no elegida al inicio |
| RF-8 | `src/discovery.js` | `discovery.test.js`: lista de estrellas nuevas vacía cuando ya estaban reconocidas | Mensaje sin diferencia revisado en el código; no se presenta como prueba visual independiente |
| RF-9 | Validación, SQL y UI | `discovery.test.js`: reflexión prematura; `discovery-database.test.js`: reflexión guardada | Reflexión persistente al recargar |
| RF-10 | Identidad web, RLS y RPC | `web.test.js`, `supabase.test.js`, `discovery-database.test.js`: identidad, permisos y revisión obsoleta | Prueba transaccional real entre dos identidades temporales |
| RF-11 | `public/discovery.js` | Reglas de resultados en `discovery.test.js`; el texto y la presentación requieren revisión manual | Ejercicios como invitaciones y distinción identificada/practicada/demostrada |

## Spec 003 · Galaxias y oportunidades

| RF | Código | Evidencia |
| --- | --- | --- |
| RF-1–3 | `src/interests.js`, migraciones 003/004, gateway | `interests-database.test.js`: catálogo equivalente, máximo cinco, exploración exclusiva, aislamiento, identidad y revisión; `supabase.test.js`: JWT y contrato RPC |
| RF-4 | `public/app.js`, `public/explore.js` | Comprobación visual de selección previa y edición; prueba QA conserva la misión anterior |
| RF-5–6, RF-9 | `src/opportunities.js`, `src/server.js`, script de sincronización | `opportunities.test.js`: extracción de HTML, cambios de estructura, robots, host de redirección, fallos y deduplicación; sincronización real de 26 registros |
| RF-7–8 | Normalización, matching y `public/explore.js` | `opportunities.test.js`: intereses, explorar todo, filtros, expiración y caché; QA real con vacío y catálogo completo |
| RF-10 | Rutas web e interfaz | `opportunities.test.js`: autenticación, origen e identidad; revisión visual local |
| RF-11 | Filtro `inLima`, adaptador hack0 y UI | `opportunities.test.js`: país PE, distrito identificado, exclusión de otras ciudades y países, virtuales y datos desconocidos incluso con `scope=all`; sincronización local de 12 fichas |

## Verificación real de datos anteriores

- [live_profiles_rollback.sql](../supabase/tests/live_profiles_rollback.sql): trigger y permisos de perfil en Supabase real.
- [live_discovery_rollback.sql](../supabase/tests/live_discovery_rollback.sql): resultado, reflexión, revisión y aislamiento de misiones en Supabase real.

Ambas ya se ejecutaron durante el desarrollo y revierten sus datos temporales. Ejecutarlas es diferente de volver a aplicar las migraciones, que ya están instaladas.

## Límites de la evidencia

La interfaz se revisó en escritorio y a 375 px. No existe una suite automática de navegador, estudio de impacto ni validación psicológica del test. La revisión del equipo, la configuración SMTP para correos externos y la prueba en un despliegue HTTPS permanecen pendientes.
