# Galaxias y oportunidades

Implementación de la [spec 003](../specs/003-galaxias-oportunidades/spec.md), autorizada por Maricielo. Las galaxias son intereses elegidos, distintos de las seis habilidades del test. «Quiero explorar» abre todas las áreas y reemplaza otras selecciones. Máximo cinco áreas, editables sin repetir el test.

## Datos y seguridad

Supabase conserva `interest_areas` (catálogo público), `interest_profiles` (revisión privada) y `user_interests` (relación privada). RLS limita las lecturas privadas a su dueña. La RPC `save_user_interests` deriva `auth.uid()`, valida áreas, cantidad, duplicados y revisión, y reemplaza las relaciones en una transacción. No se aceptan IDs de otra usuaria ni escrituras directas. Se usa la clave publishable existente.

Las migraciones 003, 004 y 005 ya se aplicaron al proyecto de desarrollo. No volver a ejecutar las anteriores. 004 cambia el conflicto de revisión a SQLSTATE `PT409`; 005 hace lo mismo para la misión histórica, sin modificar respuestas. Se corrigió después de observar una espera real al usar `40001`, que el proveedor reintenta. Referencia: [explicación de Supabase](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).

El catálogo de oportunidades contiene solo metadatos públicos y se guarda en JSON, separado de los intereses privados: [`data/opportunities.json`](../data/opportunities.json) es la copia inicial verificada; `.cache/opportunities.json` es la copia de ejecución, ignorada por Git. Esto evita entregar a las usuarias permisos para escribir un catálogo global o introducir una clave administrativa. No hay una tabla global de oportunidades en Supabase en este incremento. Antes de alojar varias instancias se deberá acordar almacenamiento compartido y una tarea de actualización persistente.

## Fuentes activas y cobertura · ajuste para Lima

| Fuente pública | Qué se extrae | Adaptador |
| --- | --- | --- |
| [hack0](https://hack0.dev/) | Fichas de eventos de distritos de Lima, país, modalidad, fechas y enlace del organizador | Tarjetas públicas de la portada y JSON-LD de cada ficha, sin ejecutar JavaScript |

El 12 de noviembre de 2026 Maricielo precisó que la demo debe mostrar **Lima, Perú**. La sincronización local recuperó 12 fichas vigentes por fecha del evento. La portada permite descubrir un máximo de 24 rutas de fichas peruanas con distrito de Lima; se consulta cada ficha con una pausa de 250 ms y se valida su JSON-LD. Se exige país PE, localidad de Lima Metropolitana, modalidad presencial o híbrida, evento no cancelado y fecha de fin disponible. Se excluyen otras ciudades, provincias como Cañete, virtuales globales y registros antiguos sin ubicación estructurada. No basta que el título mencione Lima o que la hora esté expresada en Lima.

El filtro se aplica en el servidor, también a «Todo Lima» y «Quiero explorar». Si no hay coincidencias locales se muestra un vacío, sin recurrir al catálogo extranjero. La copia versionada y la caché se sustituyeron por datos de Lima. MLH/GHW dejaron de ser fuentes activas de la demo; sus parsers se conservan para compatibilidad y pruebas del recolector, sin solicitudes a esas fuentes durante la sincronización actual.

No se copian imágenes, descripciones extensas, cuentas, perfiles ni datos de participantes. Las temáticas se asignan con reglas sobre nombre y etiquetas públicas; hack0 es una agenda tecnológica. Las etiquetas de Constela son aproximaciones temáticas. Cada tarjeta ofrece la ficha de procedencia y el enlace del organizador publicado allí. La API de hack0 requiere token y no se usa; se consultan únicamente las páginas HTML públicas permitidas por [robots.txt](https://hack0.dev/robots.txt).

Cobertura limitada: agenda principalmente tecnológica de Lima. No hay todavía una fuente activa para retos externos ni cobertura suficiente de todas las galaxias. El filtro de retos puede mostrar un vacío. No se fabrican convocatorias ni se reutilizan ejemplos de la propuesta como eventos reales. Devpost, DrivenData y UNESCO no se activaron por sus restricciones publicadas.

## Actualización

```bash
npm run opportunities:sync
```

Sincroniza solo la fuente local activa; no necesita `.env` ni credenciales. El comando informa estado por fuente y cantidad; devuelve salida distinta de cero si falla una fuente, queda una ficha sin actualizar o no puede guardar la caché. Para renovar intencionalmente la copia pública versionada: `npm run opportunities:sync -- --snapshot`; solo la escribe con una sincronización completa.

El servidor carga la copia local al arrancar, inicia una sincronización en segundo plano y la repite cada 12 horas mientras el proceso esté activo. No ejecuta scraping por cada usuaria ni envía sus intereses a las fuentes. Lee `robots.txt` en cada actualización; bloquea destinos/redirecciones fuera de hack0.dev y rutas ajenas a portada, robots y fichas descubiertas; limita respuestas a 2 MB y solicitudes a 12 segundos. No visita los enlaces externos de inscripción, inicia sesión en fuentes ni acepta URLs de usuarias.

Si una fuente falla conserva su última copia útil. Si falla una ficha concreta conserva únicamente su copia anterior sin renovar su fecha y marca actualización parcial. Un `Disallow` elimina los resultados afectados. Las copias antiguas también deben pasar el filtro de Lima. Copias de más de 24 horas se señalan; datos de más de siete días y eventos terminados no se muestran. El JSON se guarda mediante archivo temporal único y renombrado, para evitar que el comando manual y el servidor escriban el mismo archivo temporal.

## Recomendaciones e interfaz

`GET /web/interests`, `PUT /web/interests` y `GET /web/opportunities` requieren sesión verificada. Las escrituras conservan la validación de origen. La ruta de oportunidades admite únicamente `scope=recommended|all`, `type=all|hackathon|event|challenge` y `mode=all|online|in_person|hybrid`.

Se muestran primero las oportunidades con más galaxias coincidentes y luego por fecha. «Para mis galaxias» incluye las coincidentes; «Todo el catálogo» permite salir de esa selección. «Quiero explorar» muestra todas. Los resultados del test no excluyen a nadie; para hackathones/retos solo se ofrece una invitación a practicar las habilidades que aparecieron en sus decisiones. No se infiere dificultad ni nivel de experiencia. Fecha del evento no equivale a cierre de inscripción: ese dato queda por verificar en la fuente.

## Verificación

- 58 pruebas sin credenciales: suite anterior y cuatro nuevas comprobaciones de descubrimiento local, país/localidad/modalidad, exclusión geográfica incluso con catálogo completo y retención de fichas caídas sin reutilizar fuentes retiradas.
- Ajuste Lima comprobado en la sesión existente: aparecen 12 oportunidades con sede local y «Todo Lima» conserva la restricción. No se cambiaron galaxias ni respuestas de la usuaria.
- Prueba real con la cuenta QA autorizada: guardar, recuperar, editar, vacío para arte/cultura, catálogo completo, conflicto HTTP 409 y cierre de sesión. Misión anterior idéntica antes y después. No se modificaron intereses ni respuestas de la cuenta de Maricielo durante QA.
- Migraciones verificadas con «Success. No rows returned» en Supabase. Consulta posterior: ninguna solicitud antigua de `save_user_interests` en espera.
- Revisión visual de galaxias en una ventana estrecha y del catálogo en escritorio. En una sesión QA independiente se comprobó el límite de cinco, exploración exclusiva, edición, guardado y regreso al catálogo con filtro de eventos. La selección sin guardar de Maricielo se conservó. La aprobación del equipo y el despliegue remoto siguen pendientes.
