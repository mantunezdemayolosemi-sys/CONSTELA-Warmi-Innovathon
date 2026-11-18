# 007 · Preparación de la demo en Vercel

Solicitud de Maricielo: publicar la versión de main en el proyecto Vercel ya conectado. Git autenticado; main publicado y despliegue de producción verificado el 18 de noviembre de 2026.

- **RF-1.** Una función Node.js sirve las rutas existentes de Fastify, frontend, Three.js y PDF, sin abrir un puerto ni cargar un archivo .env en Vercel.
- **RF-2.** Supabase y el origen HTTPS se configuran como variables de entorno. Se conserva la comprobación de origen, autenticación y cookies seguras.
- **RF-3.** La demo serverless utiliza el catálogo público versionado, sin prometer una actualización mediante temporizadores persistentes. El scraping periódico del servidor local sigue disponible. Automatizar el scraping remoto con almacenamiento persistente queda pendiente.
- **RF-4.** Publicar código no aplica migraciones ni cambia permisos de Supabase. La migración 008 sigue pendiente de autorización/aplicación.

## Tareas

- [x] V1 · Adaptador y empaquetado preparados. 87 pruebas locales pasan; el adaptador verifica rutas/assets, arranque concurrente, rechazo de origen ajeno, sesión requerida y recuperación ante error sin revelar configuración. Empaquetado remoto pendiente de V3.
- [x] V2 · Guía en docs/VERCEL.md con variables, origen de Supabase, catálogo de demo y pasos de despliegue.
- [x] V3 · main publicado. En producción: /health 200, portada interactiva, registro e ingreso visibles, Three.js 200 y /web/universe 401 sin sesión. La luna redirige a ingresar sin cuenta autenticada. No se ha probado una sesión real ni una descarga de portafolio en producción.

## Corrección del arranque · 18 de noviembre de 2026

Vercel registra ERR_REQUIRE_ESM al cargar content-disposition desde @fastify/static antes de entrar al adaptador. Reproducido localmente con Node 22 y --no-experimental-require-module. Para RF-1 se conserva @fastify/static 10.1.10 con sus correcciones de seguridad y se fija su dependencia content-disposition en 2.0.1 (CommonJS) mediante overrides. Node queda en 22.x. La prueba de regresión importa el adaptador sin require(ESM). npm audit no registra vulnerabilidades con esta combinación. Se configuraron SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY y PUBLIC_API_URL en Production. El despliegue 179ad9a arranca y sirve la app en https://constela-warmi-innovathon.vercel.app. Pasan las 88 pruebas y npm run check. El envío/confirmación de correo y la sesión con una cuenta real quedan por validar; no se modificaron ajustes ni migraciones de Supabase.
