# Retos y publicaciones de organizaciones · demo

Spec [004](../specs/004-retos-empresas/spec.md), rama `codex/retos-empresas`. El incremento conserva test, intereses y oportunidades públicas. **Retos y Empleos son simulaciones separadas del catálogo de eventos reales de Lima.** Hay autorregistros de práctica con estrellas; no hay evaluación, certificación, envío de CV ni contratación.

## Recorridos

- **Usuaria:** registro → confirmación → galaxias/misión. Desde Retos puede filtrar por galaxia, ver problema, entregable, dedicación, condiciones y habilidades a practicar. «Guardar para practicar» se conserva en Supabase; «Mis retos guardados» permite recuperarlos o quitarlos. Registrar una propuesta de al menos 30 caracteres y una reflexión de al menos 15 enciende una estrella de práctica por reto. La constelación señala hitos de tres y seis prácticas, junto con las habilidades ejercitadas. La propuesta puede volver a leerse en privado. Guardar por sí solo no otorga premios. No condicionamos acceso a puntuaciones del test. Empleos muestra vacantes de ejemplo, sin botón de postulación real.
- **Empresa o emprendedora:** registro con nombre personal privado y nombre de organización → confirmación → Mis publicaciones. Puede crear retos o empleos simulados, indicar descripción, entregable/requisitos, dedicación, remuneración, modalidad, nivel, 1–3 galaxias, habilidades y cierre. Puede ver y cerrar sus publicaciones de cada tipo. El nombre de organización aparece públicamente en la comunidad; no se expone el correo del publicador.

El tipo de cuenta declara intención; **no verifica una empresa**. Se fija en el perfil durante el alta. Cambiar metadatos Auth posteriormente no altera el tipo autorizado. Las cuentas previas quedan como usuarias y conservan su recorrido. No hay cambio de tipo por edición de perfil en este incremento.

## Datos y permisos

La migración `202611130006_community_demo.sql` añade tipo/organización a `profiles`, actualiza el trigger de altas y crea `community_posts` y `challenge_saves`. Aplicada una vez al proyecto de desarrollo; no repetir ni modificar 001–005.

`community_posts` contiene seis retos ficticios (contenido, empaque sostenible, feria, experiencia web, educación y datos) y dos vacantes ficticias. Las semillas no necesitan cuentas Auth artificiales. Su cierre inicial es 30 días después de aplicar la migración; no se renueva al arrancar el servidor. Las publicaciones cerradas/vencidas se ocultan de la exploración y se conservan para su propietario. El catálogo limita la lectura a las 100 publicaciones más recientes para esta demo; paginación pendiente antes de ampliar su uso.

La migración 007, también aplicada una sola vez, crea `challenge_practices` y su RPC de registro. La clave `(user_id, post_id)` impide duplicar estrellas; ni contador ni fecha se aceptan del cliente. La RPC verifica reto activo, guarda una instantánea de sus habilidades y devuelve el premio existente ante reintentos sin sobrescribir la primera propuesta. Las estrellas se derivan de esos registros privados. No se permiten escrituras directas ni lecturas de propuestas ajenas. Las empresas no reciben propuestas ni acceden al progreso privado en este incremento.

Todas las filas deben tener `is_simulation=true`. La RPC de publicación deriva propietario y organización del perfil; ni un JWT con metadatos cambiados ni un cuerpo que intente suplantarlos modifica esas atribuciones. No se conceden inserciones/actualizaciones directas sobre publicaciones. Solo la RPC del propietario puede cerrar las suyas; no puede gestionar semillas ni publicaciones ajenas. RLS limita lecturas, y los guardados son exclusivos de su usuaria. No se solicitan claves administrativas.

API web (sesión verificada; origen obligatorio al mutar):

| Ruta | Uso |
| --- | --- |
| `GET /web/community?kind=challenge|job&scope=all|recommended|saved|mine&galaxy=all|…` | Catálogo, coincidencias y guardados propios; `mine` solo publicadoras |
| `POST /web/community` | Crear simulación; solo empresa/emprendedora |
| `PATCH /web/community/:id/close` | Cerrar publicación propia; cuerpo `{}` |
| `PUT /web/community/:id/save` | Guardar reto activo para practicar; cuerpo `{}` |
| `DELETE /web/community/:id/save` | Quitar guardado propio; cuerpo `{}` |
| `POST /web/community/:id/practice` | Registrar `{proposal, reflection}` y premio único de práctica; solo usuaria |
| `GET /web/community/:id/practice` | Volver a leer únicamente la propuesta/reflexión propia |

El registro acepta `account_type: learner|company|entrepreneur` y `organization_name`. Si se omiten, conserva compatibilidad con registros anteriores (`learner`, organización vacía). Las cuentas publicadoras requieren nombre de organización de 2–100 caracteres. Los identificadores ajenos, roles administrativos y otras claves no previstas se rechazan.

## Verificación

- `npm run check`, 77 pruebas Node/PGlite y `git diff --check`: tipos, contrato SDK, origen, identidad, validación, RLS, suplantación, cierre y privacidad de guardados, además de la suite anterior.
- Supabase real: 006 finalizó correctamente. Con la cuenta QA autorizada se recuperaron seis retos y dos empleos, se comprobó guardar/recuperar y se restituyó el guardado anterior. Test e intereses quedaron idénticos.
- `supabase/tests/live_community_rollback.sql` comprobó publicación y cierre con la RPC y rol `authenticated`. Revirtió la publicación temporal y el cambio temporal de tipo del perfil QA; sin cambios permanentes de tipo ni cuentas nuevas.
- Navegador real: seis retos y detalle en la sesión existente. En un servidor QA temporal con perfil publicador ficticio se comprobó el campo condicional de registro, redirección al panel, crear reto, cerrarlo y publicar una vacante. Esa prueba de interfaz usa datos locales ficticios, no una nueva cuenta Auth confirmada. El correo de confirmación para cuentas externas aún requiere SMTP.
- Estrellas: PGlite verifica premio único, privacidad, autor derivado y rechazo de retos cerrados, empleos o cuentas publicadoras. `live_stars_rollback.sql` comprueba premio/reintento en Supabase sin dejar progreso QA. La interfaz QA local comprueba celebración, estrella recuperada tras recargar y lectura privada de la propuesta. No se registraron prácticas en la cuenta de Maricielo.

Revisión humana, merge y publicación HTTPS pendientes. Siguientes etapas: edición de organización/publicaciones, paginación, empresas verificadas, vacantes reales, archivos de evidencia y evaluación con criterios acordados.
