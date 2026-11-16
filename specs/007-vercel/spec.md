# 007 · Preparación de la demo en Vercel

Solicitud de Maricielo: publicar la versión de main en el proyecto Vercel ya conectado. La subida requiere autenticar Git en su Mac. Configuración y despliegue remotos pendientes de verificar.

- **RF-1.** Una función Node.js sirve las rutas existentes de Fastify, frontend, Three.js y PDF, sin abrir un puerto ni cargar un archivo .env en Vercel.
- **RF-2.** Supabase y el origen HTTPS se configuran como variables de entorno. Se conserva la comprobación de origen, autenticación y cookies seguras.
- **RF-3.** La demo serverless utiliza el catálogo público versionado, sin prometer una actualización mediante temporizadores persistentes. El scraping periódico del servidor local sigue disponible. Automatizar el scraping remoto con almacenamiento persistente queda pendiente.
- **RF-4.** Publicar código no aplica migraciones ni cambia permisos de Supabase. La migración 008 sigue pendiente de autorización/aplicación.

## Tareas

- [x] V1 · Adaptador y empaquetado preparados. 87 pruebas locales pasan; el adaptador verifica rutas/assets, arranque concurrente, rechazo de origen ajeno, sesión requerida y recuperación ante error sin revelar configuración. Empaquetado remoto pendiente de V3.
- [x] V2 · Guía en docs/VERCEL.md con variables, origen de Supabase, catálogo de demo y pasos de despliegue.
- [ ] V3 · Publicar main y verificar el despliegue remoto, acceso y assets.
