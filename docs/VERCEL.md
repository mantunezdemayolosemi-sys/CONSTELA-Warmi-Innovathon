# Publicar Constela en Vercel

Producción verificada el 18 de noviembre de 2026: [abrir Constela](https://constela-warmi-innovathon.vercel.app). El backend responde, la portada interactiva y los formularios cargan, y Three.js se entrega correctamente. Los recursos privados requieren sesión. Queda validar ingreso con una cuenta real, correo de confirmación y descarga del portafolio; no se aplicaron migraciones de Supabase.

## Primero: subir el código

Conectar Vercel al repositorio solo permite desplegar lo que ya está en GitHub. Los commits que existen únicamente en la Mac no se envían a Vercel.

Con Git autenticado y la copia local limpia, revisar `git status`, actualizar las referencias con `git fetch origin`, integrar cualquier avance remoto sin sobrescribirlo y ejecutar `git push -u origin main`.

## Configuración del proyecto

- Repositorio: `mantunezdemayolosemi-sys/CONSTELA-Warmi-Innovathon`.
- Production Branch: `main`.
- Root Directory: raíz del repositorio, donde están `package.json` y `vercel.json`.
- Framework Preset: **Other**. Usamos el adaptador explícito `api/serverless.js`.
- Node.js: **22.x**.
- Instalación, comprobación y salida: los define `vercel.json`; quitar overrides anteriores que los contradigan.

El directorio `vercel-static` se deja vacío intencionalmente. Fastify sirve el frontend bajo `/assets/`, las rutas de la app, Three.js y el backend mediante una función. No se ejecuta `npm start` ni se necesita subir `.env`.

## Variables de entorno

Configurar en Vercel, para Production:

| Nombre | Valor |
| --- | --- |
| `SUPABASE_URL` | URL del proyecto Supabase de Constela |
| `SUPABASE_PUBLISHABLE_KEY` | Clave publishable o anon; nunca service_role ni secret |
| `PUBLIC_API_URL` | Dominio HTTPS definitivo de la demo, por ejemplo `https://TU-PROYECTO.vercel.app` |
| `NODE_ENV` | Opcional: el adaptador fuerza `production` |

El origen debe coincidir con el dominio desde el que se abre Constela. Una Preview con otro dominio requiere su propia configuración de origen. No se acepta automáticamente cualquier Host u Origin enviado por el navegador.

En Supabase Auth → URL Configuration, configurar Site URL y permitir el retorno exacto `https://TU-PROYECTO.vercel.app/auth/confirmed`. Mantener las direcciones locales si el equipo continúa usándolas. No ejecutar migraciones ya aplicadas. La migración 008 continúa pendiente en el proyecto compartido y no se aplica con un push.

Después de guardar las variables, hacer **Redeploy**. Verificar `/health`, portada, registro y confirmación, inicio de sesión, `/luna`, sus assets y descarga del portafolio con una cuenta autorizada. El correo para nuevas usuarias sigue dependiendo de la configuración SMTP de Supabase.

## Compatibilidad de arranque

El runtime observado en Vercel no admite cargar content-disposition 3 (ESM) desde @fastify/static (CommonJS). package.json fija content-disposition 2.0.1 solo para ese paquete mediante overrides, conservando @fastify/static 10.1.10. No quitar ese override sin comprobar el arranque con `node --no-experimental-require-module` y en Vercel. La regresión está cubierta en test/vercel.test.js.

## Catálogo de oportunidades

Esta preparación usa `data/opportunities.json` como catálogo de demo. El scraping cada 12 horas de `src/server.js` sigue siendo para el servidor local persistente; no se ejecuta en la función. Para renovar la demo, generar el catálogo con el scraper, revisar los resultados y actualizar el snapshot versionado antes del despliegue. La sincronización automática remota requiere un trabajo programado y almacenamiento persistente y queda pendiente.

El rate limit en memoria se conserva por instancia; no es un contador global entre funciones. Mantener también los límites de Supabase y revisar la protección del despliegue antes de abrirlo a tráfico amplio.

Referencias: [Fastify en Vercel](https://vercel.com/docs/frameworks/backend/fastify), [adaptador de Fastify](https://fastify.dev/docs/v5.1.x/Guides/Serverless/#vercel) y [configuración de Vercel](https://vercel.com/docs/project-configuration/vercel-json).
