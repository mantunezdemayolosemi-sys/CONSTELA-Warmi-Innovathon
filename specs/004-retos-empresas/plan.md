# Plan 004

Añadir migración 006 con tipos/organización, publicaciones compartidas de demo y guardados privados. Actualizar el trigger de alta sin reescribir migraciones anteriores. Publicaciones creadas mediante RPC que deriva identidad y organización del perfil, con controles equivalentes en PostgreSQL y API. Semillas ficticias sin cuentas Auth artificiales.

Añadir módulo web de retos, empleos y panel de publicaciones, reutilizando estilos/galaxias. Registro con selección explícita y campo condicional. Tipos inmutables desde clientes; cuentas anteriores conservadas como learner. Guardados idempotentes; cierre solo del propietario. No hay evaluación ni acceso basado en puntuaciones.

Verificar contratos, roles, RLS entre cuentas, metadatos manipulados, validación, filtros y simulación con Node/PGlite; aplicar únicamente 006 al proyecto de desarrollo autorizado y revisar la interfaz real sin modificar el perfil de Maricielo.

Revisión de gamificación: añadir 007 (006 ya está aplicada) con prácticas privadas y RPC idempotente. Derivar estrellas de prácticas completadas únicas, sin contador editable. Registrar una propuesta textual y una reflexión; mostrar constelación y habilidades ejercitadas. La entrega es un autorregistro de práctica, pendiente de evaluación. Sin archivos, revisión de empresas ni insignias profesionales.
