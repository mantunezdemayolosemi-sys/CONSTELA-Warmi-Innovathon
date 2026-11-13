# Plan: Spec 002

Plan reconstruido de la implementación actual, pendiente de revisión humana.

## Stack y decisiones

Se conserva el servidor y la sesión de la spec 001. El catálogo y la puntuación son reglas explícitas, sin IA. Las misiones se renderizan con JavaScript y gráficos SVG; el servidor y PostgreSQL validan las elecciones.

## Estructura

| Archivo | Función | Requisitos |
| --- | --- | --- |
| `src/discovery.js` | Catálogo, validación y resumen de resultados | RF-2, RF-3, RF-6 a RF-9, RF-11 |
| `public/discovery.js` | Inicio, selección, escenas, resultados y reflexión | RF-2 a RF-9, RF-11 |
| `public/app.js` | Apertura del recorrido al autenticar y enlace desde perfil | RF-1, RF-5 |
| `public/discovery.css`, `public/index.html` | Presentación, constelación y adaptación móvil | RF-3, RF-4, RF-11 |
| `src/web.js` | GET/PUT `/web/discovery` con identidad verificada | RF-4, RF-5, RF-9, RF-10 |
| `src/supabase.js` | Consulta propia y RPC de guardado | RF-4, RF-5, RF-9, RF-10 |
| `supabase/migrations/202611120002_create_strength_discoveries.sql` | Validación, puntuación persistida y control de revisión | RF-2 a RF-6, RF-9, RF-10 |

## Modelo de datos

`strength_discoveries`: `user_id` referido a Auth, `version`, `revision`, `self_perception`, `answers`, `scores`, `reflection`, `completed_at`, `created_at`, `updated_at`.

RLS permite leer únicamente el registro propio. El rol autenticado escribe mediante `save_strength_discovery`; la función toma la identidad de la sesión, valida las opciones y calcula los puntos. No recibe un ID de usuaria ni puntuaciones del cliente. La revisión incrementa de forma atómica y evita sobreescribir desde otra pestaña. El navegador guarda al continuar, no antes de confirmar una opción.

## Reglas de resultados

- Seis respuestas suman seis puntos; cada habilidad tiene un máximo posible de cuatro.
- Las habilidades con cero puntos no se interpretan como ausentes.
- Se muestran hasta tres posiciones positivas; si hay empate en el corte, se incluyen todas las empatadas.
- La estrella no reconocida al inicio se elige entre habilidades con puntos; se conservan todos los empates de su máximo.
- La reflexión se admite al completar la misión y se limpia al volver a guardar respuestas durante una nueva exploración.

## Estrategia de pruebas

`test/discovery.test.js` verifica lógica y equidad del catálogo; `test/discovery-database.test.js` prueba la migración en PostgreSQL embebido; las pruebas web y SDK verifican las rutas y el JWT. La [matriz](../../docs/TRAZABILIDAD.md) distingue estas comprobaciones del recorrido manual.

La prueba `supabase/tests/live_discovery_rollback.sql` ya se ejecutó contra Supabase real y revirtió sus filas temporales. La cuenta de prueba autorizada completó las misiones, retomó el progreso tras recargar y conservó resultado y reflexión.

## Despliegue

El servidor sirve `/descubrir` y la API desde el mismo origen. La publicación comparte las condiciones de la spec 001: Node.js, HTTPS, configuración de origen y Supabase. La migración 002 ya se aplicó en desarrollo; no debe ejecutarse de nuevo sobre la tabla existente.
