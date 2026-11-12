# CONSTELA · Warmi Innovathon

Primera etapa: registro de usuarias y perfiles privados. API en Node.js + Fastify; autenticación y PostgreSQL en Supabase. La interfaz visual se desarrollará después.

## Estado

- Registro, confirmación mediante Supabase, inicio/cierre de sesión y renovación de tokens.
- Consulta y edición del nombre del perfil autenticado.
- Migración SQL que crea perfiles automáticamente y los protege con Row Level Security (RLS).
- Pruebas locales sin credenciales: API, SDK y permisos sobre PostgreSQL embebido.
- **Supabase conectado:** migración ejecutada, permisos y triggers comprobados también en la base real. Consulta [`docs/estado-supabase.md`](docs/estado-supabase.md).
- **Registro real probado:** se creó y confirmó una cuenta de prueba por correo; también se verificaron login, perfil, renovación y cierre de sesión.
- **Pendiente:** configurar SMTP para registrar usuarias externas al equipo de Supabase. Las pruebas automatizadas locales no envían emails.

## Qué instalar

Para desarrollar: Node.js 22 o superior y Git. En la Mac usada para iniciar este repositorio ya están instalados. VS Code es opcional. Supabase funciona en el navegador: no hace falta instalar PostgreSQL, Docker ni la CLI para estos primeros pasos.

## Crear y conectar la base de datos

1. Entra a [Supabase](https://supabase.com/dashboard), crea una cuenta y selecciona **New project**. Ponle `Constela`, elige una región cercana a tus usuarias y guarda la contraseña de la base de datos en tu gestor de contraseñas. No la pegues en el chat ni en GitHub. Revisa las condiciones del plan antes de aceptar.
2. Cuando termine de crearse, abre **SQL Editor → New query**. Copia todo el contenido de [`supabase/migrations/202611120001_create_profiles.sql`](supabase/migrations/202611120001_create_profiles.sql) y ejecútalo **una sola vez**, en el proyecto nuevo. La transacción evita dejar tablas a medias si ocurre un error. No contiene borrados de tablas existentes.
3. En **Authentication**, habilita **Email**, mantén **Confirm email** activado y configura longitud mínima de contraseña de **12**. No habilites accesos anónimos. La misma longitud debe exigirse en Supabase, porque un cliente puede llamar directamente a Auth.
4. En **Authentication → URL Configuration**, configura Site URL y Redirect URLs con `http://localhost:3000/auth/confirmed`. Es el destino de confirmación local; al publicar habrá que cambiarlo por HTTPS y retirar la URL local del entorno público.
5. Configura el envío de correo. El proveedor predeterminado de Supabase está limitado a direcciones autorizadas del equipo y tiene límites bajos; para registrar otras usuarias necesitas **SMTP propio**. Mantén la confirmación de correo activa. Consulta la [guía oficial de SMTP](https://supabase.com/docs/guides/auth/auth-smtp). Al probar con el proveedor predeterminado usa una dirección autorizada de tu equipo.
6. En **Connect** o **Settings → API Keys**, copia Project URL y la clave **publishable** (`sb_publishable_...`). También se admite la clave legacy `anon`. Este proyecto rechaza claves `secret` y `service_role` porque omiten protecciones de acceso.
7. En la carpeta del proyecto ejecuta:

   ```bash
   cp .env.example .env
   ```

   Edita `.env` para completar `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`. `.env` está excluido de Git. No cambies `PUBLIC_API_URL` mientras uses el puerto 3000 local.

8. Inicia la API:

   ```bash
   npm ci
   npm run dev
   ```

   Las dependencias ya están instaladas en la Mac de desarrollo inicial; allí puedes ir directamente a `npm run dev` después de completar `.env`. El proyecto local está en `Warmi Innovathon/constela.nosync` para evitar que iCloud retire archivos mientras se ejecutan. En otra computadora puedes clonarlo con un nombre normal, preferiblemente fuera de carpetas sincronizadas. Las dependencias están excluidas de Git.

9. Abre [el estado de la API](http://localhost:3000/health). Debe mostrar `status: ok`. Esta ruta comprueba que arrancó; **no comprueba la conexión con Supabase**.

## Primera prueba real

Desde otra ventana de Terminal, crea una cuenta de prueba usando un correo que controles. El nombre es el único dato del perfil recopilado por ahora; no se solicitan DNI, teléfono ni información sensible.

```bash
curl -i http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Usuaria de prueba","email":"TU-CORREO@example.com","password":"Una-frase-de-prueba-123"}'
```

Sustituye el correo. Esta contraseña es un ejemplo público: úsala solo para una cuenta desechable. No pegues tu contraseña personal en comandos ni en el chat. El registro responde `202` con un mensaje genérico, incluso si ya existe la cuenta; así no revela quién está registrada. La confirmación real se comprueba iniciando sesión después de abrir el enlace del correo. La ruta de destino solo muestra un mensaje; no valida el enlace por sí misma.

En Supabase verás la cuenta en **Authentication → Users** y su perfil en **Table Editor → profiles**. El perfil se crea en la misma transacción que la cuenta: un fallo al crearlo revierte también el alta de la cuenta.

Después de confirmar el correo:

```bash
curl -i http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"TU-CORREO@example.com","password":"Una-frase-de-prueba-123"}'
```

La respuesta contiene `session.access_token` y `session.refresh_token`. Son credenciales: no las compartas. Para consultar tu perfil:

```bash
curl http://localhost:3000/me -H 'Authorization: Bearer REEMPLAZAR_CON_ACCESS_TOKEN'
```

## Rutas disponibles

| Método | Ruta | Datos / comportamiento |
| --- | --- | --- |
| GET | `/health` | Estado del proceso; no consulta la base de datos. |
| POST | `/auth/register` | `{name, email, password}` → 202; nombre 2–100, contraseña 12–128 caracteres. |
| GET | `/auth/confirmed` | Mensaje de destino tras la confirmación por Supabase. |
| POST | `/auth/login` | `{email, password}` → `{user, session}`; credenciales inválidas → 401. |
| POST | `/auth/refresh` | `{refresh_token}` → nuevos tokens; reemplaza ambos en el cliente. |
| POST | `/auth/logout` | Bearer token → 204; revoca la renovación de la sesión actual. |
| GET | `/me` | Bearer token → `{user, profile}`. |
| PATCH | `/me` | Bearer token y `{name}` → `{profile}`. |

Las rutas privadas verifican la usuaria contra Supabase Auth y exigen correo confirmado. El servidor deriva el ID del token; no acepta un ID de usuaria del formulario. La base de datos vuelve a aplicar permisos con el token de esa misma usuaria. Nunca se usa una clave administrativa.

El cierre de sesión revoca los refresh tokens de la sesión, pero el access token puede seguir siendo válido hasta su vencimiento. El futuro cliente debe eliminar ambos al salir. El cliente web aún no existe: el almacenamiento seguro de sesión, la protección CSRF si usa cookies y la política CORS se decidirán al implementar la interfaz. No expongas tokens en URLs ni logs.

## Estructura y decisiones

- `src/app.js`: validaciones, rutas y límites de peticiones.
- `src/supabase.js`: comunicación con Auth y perfiles; cliente aislado por operación.
- `src/config.js`: configuración sin imprimir claves.
- `supabase/migrations/`: esquema versionado. `auth.users` pertenece a Supabase; no duplicamos contraseñas ni correos en `profiles`.
- `test/`: API con proveedor simulado, integración HTTP del SDK y PostgreSQL embebido con esquema Auth simulado.

Por ahora se permite consultar el propio perfil y cambiar su nombre. Las altas las hace un trigger; borrar una cuenta desde administración elimina su perfil asociado. No existen roles administrativos, recuperación de contraseña, alta por Google, consentimiento legal ni más datos de negocio en esta etapa. Deben definirse antes de un lanzamiento público.

Límite de desarrollo: 10 solicitudes de autenticación por IP cada 15 minutos, compartidas entre registro/login/refresh; límite global de 100/minuto. El contador está en memoria y se reinicia con el proceso. Para publicar con varias instancias hay que usar un contador compartido, configurar el proxy de confianza según el hosting y mantener también los límites de Supabase, porque Auth es accesible directamente. La API arranca solo en `127.0.0.1`; un hosting necesitará `HOST=0.0.0.0` y HTTPS.

## Validación y publicación

```bash
npm run check
npm test
```

GitHub Actions ejecutará las mismas comprobaciones al subir cambios. Además de las pruebas locales, verifica en el proyecto real: registro, recepción y apertura del correo, login, lectura/edición del perfil, refresh, logout y separación entre dos usuarias. No publiques para uso real hasta completar esa prueba y configurar SMTP.

El código se prepara en la rama `codex/registro-usuarias`. Para subirlo hace falta permiso de escritura; el acceso de lectura basta para descargarlo, pero no para publicar cambios.

Referencias: [gestión de perfiles](https://supabase.com/docs/guides/auth/managing-user-data), [contraseñas y confirmación](https://supabase.com/docs/guides/auth/passwords), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [claves de API](https://supabase.com/docs/guides/api/api-keys).
