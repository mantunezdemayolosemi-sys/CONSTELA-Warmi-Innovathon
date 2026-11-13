# Plan: Spec 001

Este plan describe la implementación existente. Su aprobación por el equipo sigue pendiente.

## Stack y decisiones

| Parte | Elección | Motivo |
| --- | --- | --- |
| Frontend | HTML, CSS y JavaScript en `public/` | Formularios y vistas sin compilación adicional |
| Servidor | Node.js 22 y Fastify | API e interfaz en el mismo origen |
| Autenticación | Supabase Auth | Credenciales y confirmación fuera de tablas propias |
| Datos | PostgreSQL de Supabase | Perfil creado por trigger y protegido por RLS |
| Sesión web | Cookies HttpOnly, SameSite=Lax, Secure en producción | Los tokens no se entregan al JavaScript de la interfaz |
| Pruebas | `node:test`, Fastify inject y PGlite | Contratos HTTP y permisos SQL sin correos reales |

## Estructura

- `public/index.html`, `public/styles.css`, `public/app.js`: vistas y formularios (RF-1, RF-3 a RF-7, RF-10).
- `src/validation.js`: validación compartida (RF-1, RF-6).
- `src/app.js`: API Bearer, errores y límites (RF-1 a RF-3, RF-5 a RF-7, RF-9, RF-10).
- `src/web.js`: cookies y protección de origen (RF-4, RF-5, RF-7, RF-8).
- `src/supabase.js`: integración con Auth y perfiles (RF-1 a RF-7).
- `supabase/migrations/202611120001_create_profiles.sql`: tabla, trigger y permisos propios (RF-5, RF-6).

## Modelo de datos

`auth.users` pertenece a Supabase. `profiles` contiene `id` referenciado a la cuenta, `display_name`, `created_at` y `updated_at`. No duplica correo ni contraseña. Los ejemplos de pruebas son ficticios.

## Estrategia de pruebas

La [matriz de trazabilidad](../../docs/TRAZABILIDAD.md) detalla cada RF. Ejecutar `npm run check` y `npm test`. Las pruebas de API simulan el proveedor; las del SDK interceptan HTTP con respuestas ficticias; PGlite verifica el SQL y RLS.

La recepción del correo y el recorrido visual se comprueban manualmente con una cuenta autorizada. El proyecto Supabase de desarrollo ya pasó la prueba transaccional `supabase/tests/live_profiles_rollback.sql`.

## Ejecución y despliegue

La demo actual vive en localhost. `npm start` mantiene el servidor activo mientras la Terminal permanezca abierta. La futura publicación necesita un entorno que ejecute Node.js, HTTPS y las variables de entorno del servidor. Publicar únicamente los archivos estáticos no ejecuta la API de Fastify. Pasos de configuración: [guía técnica](../../docs/DESARROLLO.md).
