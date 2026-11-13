# Galaxias y oportunidades

Implementación de la [spec 003](../specs/003-galaxias-oportunidades/spec.md), autorizada por Maricielo. Las galaxias son intereses elegidos, distintos de las seis habilidades del test. «Quiero explorar» abre todas las áreas y reemplaza otras selecciones. Máximo cinco áreas, editables sin repetir el test.

## Datos y seguridad

Supabase conserva `interest_areas` (catálogo público), `interest_profiles` (revisión privada) y `user_interests` (relación privada). RLS limita las lecturas privadas a su dueña. La RPC `save_user_interests` deriva `auth.uid()`, valida áreas, cantidad, duplicados y revisión, y reemplaza las relaciones en una transacción. No se aceptan IDs de otra usuaria ni escrituras directas. Se usa la clave publishable existente.

Las migraciones 003, 004 y 005 ya se aplicaron al proyecto de desarrollo. No volver a ejecutar las anteriores. 004 cambia el conflicto de revisión a SQLSTATE `PT409`; 005 hace lo mismo para la misión histórica, sin modificar respuestas. Se corrigió después de observar una espera real al usar `40001`, que el proveedor reintenta. Referencia: [explicación de Supabase](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).

El catálogo de oportunidades contiene solo metadatos públicos y se guarda en JSON, separado de los intereses privados: [`data/opportunities.json`](../data/opportunities.json) es la copia inicial verificada; `.cache/opportunities.json` es la copia de ejecución, ignorada por Git. Esto evita entregar a las usuarias permisos para escribir un catálogo global o introducir una clave administrativa. No hay una tabla global de oportunidades en Supabase en este incremento. Antes de alojar varias instancias se deberá acordar almacenamiento compartido y una tarea de actualización persistente.

## Fuentes activas y cobertura

| Fuente pública | Qué se extrae | Adaptador |
| --- | --- | --- |
| [Calendario MLH](https://www.mlh.com/events) | Próximos hackathones: nombre, enlace, fechas, modalidad y lugar | JSON público incluido en el HTML, sin ejecutar JavaScript |
| [Global Hack Week](https://ghw.mlh.com/) | Semanas de eventos virtuales con nombre, fechas y enlace | Tarjetas HTML públicas |

Primera sincronización: 12 de noviembre de 2026, hora de Lima; 26 registros vigentes por fecha del evento. No se copian imágenes, descripciones extensas, cuentas, perfiles ni datos de participantes. Las temáticas se asignan con reglas de palabras completas sobre nombre y etiquetas públicas; MLH/GHW tienen tecnología como tema base. Las etiquetas de Constela son aproximaciones temáticas, no clasificaciones emitidas por el organizador. Añadir otra fuente exige revisar sus reglas, crear un adaptador, ampliar la validación y probarlo.

Cobertura limitada: principalmente tecnología y hackathones internacionales. No hay todavía una fuente activa para retos externos ni cobertura suficiente de todas las galaxias o eventos de Perú. El filtro de retos muestra un estado vacío hasta incorporar una fuente válida. No se fabrican convocatorias ni se reutilizan ejemplos de la propuesta como eventos reales. Devpost, DrivenData y UNESCO no se activaron para scraping por sus restricciones publicadas; deben utilizarse acuerdos, APIs autorizadas u otras fuentes para ampliarlos.

## Actualización

```bash
npm run opportunities:sync
```

Sincroniza solo las dos fuentes fijas; no necesita `.env` ni credenciales. El comando informa estado por fuente y cantidad; devuelve salida distinta de cero si falla alguna fuente o la caché no se puede guardar. Para renovar intencionalmente la copia pública versionada: `npm run opportunities:sync -- --snapshot`; solo la escribe si ambas fuentes responden correctamente.

El servidor carga la copia local al arrancar, inicia una sincronización en segundo plano y la repite cada 12 horas mientras el proceso esté activo. No ejecuta scraping por cada usuaria ni envía sus intereses a las fuentes. Lee `robots.txt` en cada actualización; bloquea destinos/redirecciones fuera de la lista, limita respuestas a 2 MB y cada solicitud a 12 segundos. No sigue enlaces de los eventos, inicia sesión en fuentes ni acepta URLs de usuarias.

Si una fuente falla o cambia su HTML conserva su última copia útil. Un `Disallow` elimina sus resultados. Copias de más de 24 horas se señalan; datos de más de siete días y eventos terminados no se muestran. Fechas sin hora se conservan hasta acabar ese día en todas las zonas horarias; la interfaz no inventa una hora. El JSON se guarda mediante archivo temporal y renombrado.

## Recomendaciones e interfaz

`GET /web/interests`, `PUT /web/interests` y `GET /web/opportunities` requieren sesión verificada. Las escrituras conservan la validación de origen. La ruta de oportunidades admite únicamente `scope=recommended|all`, `type=all|hackathon|event|challenge` y `mode=all|online|in_person|hybrid`.

Se muestran primero las oportunidades con más galaxias coincidentes y luego por fecha. «Para mis galaxias» incluye las coincidentes; «Todo el catálogo» permite salir de esa selección. «Quiero explorar» muestra todas. Los resultados del test no excluyen a nadie; para hackathones/retos solo se ofrece una invitación a practicar las habilidades que aparecieron en sus decisiones. No se infiere dificultad ni nivel de experiencia. Fecha del evento no equivale a cierre de inscripción: ese dato queda por verificar en la fuente.

## Verificación

- 54 pruebas sin credenciales: parser, fuentes caídas, deduplicación, robots, redirecciones, fechas, filtros, coincidencias, RLS, revisión, contrato del SDK y protección de rutas/origen, además de la suite anterior.
- Prueba real con la cuenta QA autorizada: guardar, recuperar, editar, vacío para arte/cultura, catálogo completo, conflicto HTTP 409 y cierre de sesión. Misión anterior idéntica antes y después. No se modificaron intereses ni respuestas de la cuenta de Maricielo durante QA.
- Migraciones verificadas con «Success. No rows returned» en Supabase. Consulta posterior: ninguna solicitud antigua de `save_user_interests` en espera.
- Revisión visual de galaxias en una ventana estrecha y del catálogo en escritorio. En una sesión QA independiente se comprobó el límite de cinco, exploración exclusiva, edición, guardado y regreso al catálogo con filtro de eventos. La selección sin guardar de Maricielo se conservó. La aprobación del equipo y el despliegue remoto siguen pendientes.
