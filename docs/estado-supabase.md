# Conexión de Constela con Supabase

Configuración realizada el 11 de noviembre de 2026 en el proyecto `boqkldfsdwtuilueqzqo`.

- Migración de `profiles` ejecutada en SQL Editor.
- Row Level Security activo, dos políticas y ambos triggers presentes.
- El rol `anon` no tiene permiso de lectura de perfiles.
- Proveedor Email y confirmación de correo activos; acceso anónimo desactivado.
- Longitud mínima de contraseña configurada en 12 caracteres.
- Site URL y único Redirect URL: `http://localhost:3000/auth/confirmed`.
- `.env` local conectado con la URL del proyecto y su clave pública existente. `.env` está excluido de Git y tiene permisos de archivo restringidos.
- Prueba real de conexión: PostgreSQL rechaza consultas sin sesión y Auth rechaza credenciales ficticias.
- Prueba transaccional en el proyecto real superada: el trigger crea perfiles, una usuaria ve y edita solo su perfil y no puede editar el de otra. Las filas temporales se revirtieron sin enviar correos.

El SQL se ejecutó manualmente: la página de migraciones de Supabase puede seguir mostrando cero migraciones. No vuelvas a ejecutar la migración inicial sobre la tabla existente. Los cambios posteriores deben añadirse como nuevas migraciones.

El SMTP propio está desactivado. El servicio de correo predeterminado de Supabase sirve para pruebas limitadas con direcciones autorizadas del equipo; para registrar usuarias externas habrá que configurar un proveedor SMTP.

Se completó un registro real con un correo autorizado por la usuaria: la API rechazó el login antes de confirmar el correo y lo permitió después. Se comprobaron consulta y edición del perfil, renovación de tokens, cierre de sesión y rechazo de renovaciones después de cerrar sesión. La contraseña temporal de prueba está únicamente en `.env.qa`, excluido de Git y con permisos `600`; no se guardaron tokens de sesión. El correo personal de prueba no se incluye en la documentación pública.

La prueba `supabase/tests/live_profiles_rollback.sql` permite comprobar los triggers y RLS en el proyecto real sin conservar cuentas de prueba y sin enviar correos. No crea credenciales de acceso; inserta filas temporales dentro de una transacción y las revierte.

Antes de publicar la plataforma, sustituye las URLs locales por las URLs HTTPS reales.

## Incremento de galaxias · 12 de noviembre de 2026

Aplicadas 003 (catálogo, relaciones privadas y RPC), 004 (conflicto de intereses PT409) y 005 (mismo ajuste para misiones históricas). Las anteriores se conservan y no se volvieron a ejecutar. Intereses propios, edición, recuperación y rechazo de revisiones antiguas comprobados mediante la sesión QA autorizada. El test previo se mantuvo idéntico. RLS, límites y aislamiento entre identidades se comprueban además en PGlite. El catálogo público de oportunidades usa un archivo JSON, sin clave administrativa ni permisos globales de escritura para usuarias. Detalle en [oportunidades](OPORTUNIDADES.md).

## Retos y cuentas publicadoras · 006

Aplicada una sola vez `202611130006_community_demo.sql`: tipos de cuenta, organización, publicaciones simuladas y guardados privados. Cuentas previas conservadas como usuarias. La cuenta QA autorizada comprobó guardado real sin alterar su test/intereses. Publicación y cierre comprobados en una transacción con `rollback`, sin dejar publicaciones temporales ni cambios de tipo. Ocho semillas ficticias (seis retos y dos empleos). No se crearon nuevas cuentas Auth ni se cambiaron credenciales. [Detalle y límites de prueba](RETOS.md).

## Estrellas de práctica · 007

Aplicada `202611130007_practice_stars.sql` una sola vez. Propuestas/reflexiones privadas; estrella única derivada de cada práctica registrada. La RPC comprueba identidad, tipo, contenido y reto activo. Prueba de premio/reintento en transacción reversible: sin prácticas QA permanentes ni cambios al progreso de Maricielo. La recuperación visual de estrella y propuesta se comprobó con fixtures locales; el recorrido de autodescubrimiento se conserva.
