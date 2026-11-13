# Spec 004 · Retos y organizaciones de la demo

Estado: solicitada por Maricielo; implementada y probada en la demo local. Revisión y aprobación del equipo pendientes.

- RF-1: El registro distingue `learner` (usuaria), `company` y `entrepreneur`. Las dos últimas requieren nombre de organización. Cuentas anteriores siguen siendo usuarias. El tipo se fija al crear el perfil y no se deriva de metadatos editables en cada petición.
- RF-2: Tras iniciar sesión, usuarias conservan galaxias/misión; organizaciones acceden a su panel de publicaciones. La sesión incluye tipo y organización desde el perfil privado.
- RF-3: Retos muestra casos ficticios de empresas/emprendedoras, siempre identificados como simulación, con problema, entregable, esfuerzo, nivel, galaxias y habilidades a practicar. Se puede filtrar por galaxia y ver detalle sin condicionar acceso al resultado del test.
- RF-4: Una usuaria puede guardar y quitar retos para practicar. Sus guardados son privados. Guardar no acredita participación, evaluación ni habilidad demostrada.
- RF-5: Empresas/emprendedoras pueden publicar retos y oportunidades laborales simuladas, ver sus publicaciones y cerrarlas. La identidad, organización y marca de simulación se derivan del servidor/DB, nunca del cuerpo recibido. No editan ni cierran publicaciones ajenas o semillas.
- RF-6: Empleos muestra oportunidades simuladas con requisitos, modalidad, dedicación y remuneración referencial; no hay postulaciones reales, envío de CV ni promesa de contratación.
- RF-7: Datos persistentes en Supabase, RLS y permisos mínimos; API verifica identidad, tipo, origen y cuerpos estrictos. No se expone correo del publicador ni datos privados de usuarias. Fechas vencidas o publicaciones cerradas no aparecen en exploración.
- RF-8: Formularios accesibles, estados carga/error/vacío, protección contra HTML y enlaces inseguros. Galaxias, test y catálogo público de Lima se conservan. Sin nuevas dependencias, claves administrativas ni cambios a migraciones previas.
- RF-9 · Estrellas solicitadas durante la revisión: Al registrar una propuesta y reflexión de práctica en un reto activo, la usuaria enciende una estrella de práctica en su constelación. Cada reto otorga una sola estrella; reintentos no duplican premios. Mostrar progreso, habilidades practicadas y celebraciones con movimiento reducido. Propuesta y reflexión son privadas. No se confunden con una evaluación de empresa, certificación, selección laboral o habilidad demostrada. Guardar un reto por sí solo no otorga estrellas.

Fuera de este incremento: archivos/evidencias, evaluación por empresas, portafolio, mensajería, verificación de empresas y vacantes reales. El tipo de cuenta declara intención; no acredita una empresa verificada.
