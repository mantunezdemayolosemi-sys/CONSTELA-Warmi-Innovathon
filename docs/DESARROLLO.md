# Guía técnica de Constela

Registro, inicio de sesión, perfil privado, galaxias, misión de autodescubrimiento y oportunidades de Constela. Interfaz web adaptable a celular y escritorio, API en Node.js + Fastify, autenticación y PostgreSQL en Supabase. Ver [fuentes y actualización del catálogo](OPORTUNIDADES.md).

## Estado

- Pantallas de registro, inicio de sesión, confirmación de correo y cuenta personal.
- Registro, confirmación mediante Supabase, inicio/cierre de sesión y renovación de tokens.
- Sesión web con cookies HttpOnly, protección de origen y renovación automática; sin tokens en localStorage.
- Consulta y edición del nombre del perfil autenticado.
- Migración SQL que crea perfiles automáticamente y los protege con Row Level Security (RLS).
- Pruebas locales sin credenciales: API, SDK y permisos sobre PostgreSQL embebido.
- **Supabase conectado:** migración ejecutada, permisos y triggers comprobados también en la base real. Consulta [`docs/estado-supabase.md`](estado-supabase.md).
- **Registro real probado:** se creó y confirmó una cuenta de prueba por correo; también se verificaron login, perfil, renovación y cierre de sesión.
- **Pendiente:** configurar SMTP para registrar usuarias externas al equipo de Supabase. Las pruebas automatizadas locales no envían emails.

## Tu universo de habilidades

Al iniciar sesión se solicitan primero las galaxias si todavía no se eligieron; después se abre `/descubrir`: la usuaria puede reconocer hasta tres habilidades iniciales (o ninguna), recorrer seis misiones de cuatro elecciones y descubrir su constelación. Cada habilidad aparece cuatro veces; cada respuesta suma un punto. Se muestran hasta tres fortalezas y todas las empatadas en el corte. «La estrella que no veías» compara las elecciones con la percepción inicial e incluye todos los empates de la mayor puntuación no seleccionada inicialmente. Si no hay diferencia, el mensaje lo reconoce sin inventar una fortaleza nueva.

La misión guarda el progreso al continuar, permite volver a las respuestas y conserva una reflexión final. Los resultados se derivan de las respuestas y se recalculan también en PostgreSQL al guardarlas. La tabla `strength_discoveries` usa RLS y escritura mediante una función que toma la identidad de la sesión; no acepta un ID ni puntuaciones del cliente. La revisión impide que una pestaña antigua sobrescriba otro avance.

Los resultados son una exploración personal, no una medición psicológica, certificación o clasificación para oportunidades. Un cero indica otras elecciones en estas historias, no falta de habilidad. El cierre incluye pequeños ejercicios sugeridos; todavía no existe entrega, evaluación ni evidencia de retos.

En un proyecto nuevo, aplica los archivos de [`supabase/migrations/`](../supabase/migrations/) en orden 001 a 005. Las cinco ya se ejecutaron en el proyecto de desarrollo de Constela: no repetirlas. Para actualizar otro proyecto aplica únicamente las que todavía falten. La redacción y el catálogo de habilidades están en `src/discovery.js`; la interfaz en `public/discovery.js` y `public/discovery.css`. Las migraciones 004/005 corrigen los conflictos para que PostgREST responda HTTP 409 sin reintentar un error de serialización.

## Qué instalar

Para desarrollar: Node.js 22 o superior y Git. En la Mac usada para iniciar este repositorio ya están instalados. VS Code es opcional. Supabase funciona en el navegador: no hace falta instalar PostgreSQL, Docker ni la CLI para estos primeros pasos.

## Crear y conectar la base de datos

1. Entra a [Supabase](https://supabase.com/dashboard), crea una cuenta y selecciona **New project**. Ponle `Constela`, elige una región cercana a tus usuarias y guarda la contraseña de la base de datos en tu gestor de contraseñas. No la pegues en el chat ni en GitHub. Revisa las condiciones del plan antes de aceptar.
2. Cuando termine de crearse, abre **SQL Editor → New query**. Ejecuta los cinco archivos de [`supabase/migrations/`](../supabase/migrations/) en orden por nombre, una sola vez por archivo en el proyecto nuevo. En proyectos existentes aplica solo archivos pendientes. El proyecto actual ya tiene los cinco; no vuelvas a aplicarlos.
3. En **Authentication**, habilita **Email**, mantén **Confirm email** activado y configura longitud mínima de contraseña de **12**. No habilites accesos anónimos. La misma longitud debe exigirse en Supabase, porque un cliente puede llamar directamente a Auth.
4. En **Authentication → URL Configuration**, configura Site URL y Redirect URLs con `http://localhost:3000/auth/confirmed`. Es el destino de confirmación local; al publicar habrá que cambiarlo por HTTPS y retirar la URL local del entorno público.
5. Configura el envío de correo. El proveedor predeterminado de Supabase está limitado a direcciones autorizadas del equipo y tiene límites bajos; para registrar otras usuarias necesitas **SMTP propio**. Mantén la confirmación de correo activa. Consulta la [guía oficial de SMTP](https://supabase.com/docs/guides/auth/auth-smtp). Al probar con el proveedor predeterminado usa una dirección autorizada de tu equipo.
6. En **Connect** o **Settings → API Keys**, copia Project URL y la clave **publishable** (`sb_publishable_...`). También se admite la clave legacy `anon`. Este proyecto rechaza claves `secret` y `service_role` porque omiten protecciones de acceso.
7. En la carpeta del proyecto ejecuta:

   ```bash
   cp .env.example .env
   ```

   Edita `.env` para completar `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`. `.env` está excluido de Git. No cambies `PUBLIC_API_URL` mientras uses el puerto 3000 local.

8. Inicia la aplicación:

   ```bash
   npm ci
   npm start
   ```

   Las dependencias ya están instaladas en la Mac de desarrollo inicial; allí puedes ir directamente a `npm start` después de completar `.env`. El proyecto local está en `Warmi Innovathon/constela.nosync` para evitar que iCloud retire archivos mientras se ejecutan. En otra computadora puedes clonarlo con un nombre normal, preferiblemente fuera de carpetas sincronizadas. Las dependencias están excluidas de Git.

9. Abre [Crear cuenta](http://localhost:3000/registro) o [Iniciar sesión](http://localhost:3000/ingresar). El servidor sirve la interfaz y la API desde el mismo origen; no hace falta otro proceso de frontend.

   También puedes abrir [el estado de la API](http://localhost:3000/health). Debe mostrar `status: ok`. Esta ruta comprueba que arrancó; **no comprueba la conexión con Supabase**.

Para recarga automática durante desarrollo puedes usar `npm run dev`. Si aparece `EMFILE` por el observador de archivos, usa `npm start`. Mantén esa Terminal abierta mientras pruebas la aplicación.

## Primera prueba real

Puedes probar el registro desde la interfaz, confirmar el correo e iniciar sesión. Para probar la API por separado desde otra ventana de Terminal, crea una cuenta de prueba usando un correo que controles. El nombre es el único dato del perfil recopilado por ahora; no se solicitan DNI, teléfono ni información sensible.

```bash
curl -i http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Usuaria de prueba","email":"TU-CORREO@example.com","password":"Una-frase-de-prueba-123"}'
```

Sustituye el correo. Esta contraseña es un ejemplo público: úsala solo para una cuenta desechable. No pegues tu contraseña personal en comandos ni en el chat. El registro responde `202` con un mensaje genérico, incluso si ya existe la cuenta; así no revela quién está registrada. La confirmación real se comprueba iniciando sesión después de abrir el enlace del correo. La ruta de destino redirige a una pantalla de confirmación y elimina el fragmento de la URL; no valida el enlace por sí misma ni crea una sesión. El inicio de sesión comprueba la confirmación contra Supabase.

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
| GET | `/auth/confirmed` | Redirige a `/confirmacion` tras el enlace de Supabase; elimina el fragmento de URL. |
| POST | `/auth/login` | `{email, password}` → `{user, session}`; credenciales inválidas → 401. |
| POST | `/auth/refresh` | `{refresh_token}` → nuevos tokens; reemplaza ambos en el cliente. |
| POST | `/auth/logout` | Bearer token → 204; revoca la renovación de la sesión actual. |
| GET | `/me` | Bearer token → `{user, profile}`. |
| PATCH | `/me` | Bearer token y `{name}` → `{profile}`. |

Las rutas privadas verifican la usuaria contra Supabase Auth y exigen correo confirmado. El servidor deriva el ID del token; no acepta un ID de usuaria del formulario. La base de datos vuelve a aplicar permisos con el token de esa misma usuaria. Nunca se usa una clave administrativa.

El cierre de sesión revoca los refresh tokens de la sesión, pero el access token puede seguir siendo válido hasta su vencimiento. La interfaz elimina ambas cookies al salir. No expongas tokens en URLs ni logs.

### Sesión en el navegador

Las rutas `/web/register`, `/web/login`, `/web/refresh`, `/web/logout`, `/web/session` y `/web/profile` conectan los formularios con el mismo proveedor de autenticación y las mismas validaciones. El navegador recibe datos de la usuaria; los tokens se guardan en cookies HttpOnly con SameSite=Lax, ruta `/web/` y Secure en producción. La cookie de renovación dura como máximo siete días y rota al renovar. La sesión real sigue dependiendo de su validez en Supabase.

Todas las operaciones web que cambian datos exigen el encabezado Origin igual a `PUBLIC_API_URL` y rechazan peticiones cross-site. No se habilita CORS. Usa exactamente `http://localhost:3000` para abrir la aplicación local: `127.0.0.1` sería otro origen. Las respuestas usan Cache-Control: no-store. El frontend nunca guarda los tokens en localStorage ni sessionStorage.

## Estructura y decisiones

- `public/`: interfaz en HTML, CSS y JavaScript; no requiere compilación.
- `src/app.js`: rutas de API y límites de peticiones.
- `src/web.js`: archivos de interfaz, sesiones con cookies y protección de origen.
- `src/validation.js`: validaciones compartidas por API e interfaz.
- `src/supabase.js`: comunicación con Auth y perfiles; cliente aislado por operación.
- `src/config.js`: configuración sin imprimir claves.
- `supabase/migrations/`: esquema versionado. `auth.users` pertenece a Supabase; no duplicamos contraseñas ni correos en `profiles`.
- `test/`: API con proveedor simulado, integración HTTP del SDK y PostgreSQL embebido con esquema Auth simulado.

Por ahora se permite consultar el propio perfil y cambiar su nombre. Las altas las hace un trigger; borrar una cuenta desde administración elimina su perfil asociado. No existen roles administrativos, recuperación de contraseña, alta por Google, consentimiento legal ni más datos de negocio en esta etapa. Deben definirse antes de un lanzamiento público.

Límite de desarrollo: 10 solicitudes de autenticación por IP cada 15 minutos, compartidas entre registro/login/refresh dentro de cada grupo (API o web); límite global de 100/minuto. El contador está en memoria y se reinicia con el proceso. Para publicar con varias instancias hay que usar un contador compartido, configurar el proxy de confianza según el hosting y mantener también los límites de Supabase, porque Auth es accesible directamente. La API arranca solo en `127.0.0.1`; un hosting necesitará `HOST=0.0.0.0` y HTTPS.

## Validación y publicación

```bash
npm run check
npm test
```

Las 58 pruebas cubren API, SDK, permisos de base de datos, rutas web, cookies, protección de origen, renovación, cierre de sesión, catálogo de habilidades, resultados, progreso privado, intereses, conflictos, extracción de oportunidades, fallos de fuentes, robots, redirecciones y filtro obligatorio de Lima para la demo. La interfaz anterior se comprobó en escritorio y a 375 px; el incremento de galaxias y oportunidades tiene evidencia en [OPORTUNIDADES.md](OPORTUNIDADES.md). GitHub Actions ejecutará las mismas comprobaciones al subir cambios. Además de las pruebas locales, verifica el recorrido en el proyecto real. Para otras direcciones de correo sigue pendiente configurar SMTP.

El código se prepara en la rama `codex/registro-usuarias`. Para subirlo hace falta permiso de escritura; el acceso de lectura basta para descargarlo, pero no para publicar cambios.

Referencias: [gestión de perfiles](https://supabase.com/docs/guides/auth/managing-user-data), [contraseñas y confirmación](https://supabase.com/docs/guides/auth/passwords), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [claves de API](https://supabase.com/docs/guides/api/api-keys).
