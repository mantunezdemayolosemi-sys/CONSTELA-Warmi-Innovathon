# Tareas: Spec 001

Las casillas completadas reflejan trabajo implementado y verificado antes de adoptar SDD. Están en el [PR #1](https://github.com/mantunezdemayolosemi-sys/CONSTELA-Warmi-Innovathon/pull/1), pendiente de revisión humana. No se atribuyen issues históricos que no existieron.

- [x] T1. Crear el perfil automático y permisos propios. (RF-5, RF-6) · Área: Backend y datos · PR: #1.
  Hecho cuando: las pruebas de PostgreSQL demuestran lectura y edición propias y bloqueo de otras identidades.
- [x] T2. Implementar registro, confirmación y errores genéricos. (RF-1, RF-2, RF-3, RF-10) · Área: Backend y datos · PR: #1.
  Hecho cuando: API y SDK validan entradas y no enumeran cuentas.
- [x] T3. Implementar sesión web, renovación, logout y protección de origen. (RF-4, RF-7, RF-8, RF-9) · Área: Backend y datos · PR: #1.
  Hecho cuando: las pruebas verifican cookies, rechazo de CSRF, límites y eliminación de cookies.
- [x] T4. Construir formularios y perfil adaptable. (RF-1, RF-3 a RF-7, RF-10) · Área: Frontend · PR: #1.
  Hecho cuando: el recorrido manual de registro, login, recarga, edición y logout está comprobado.
- [ ] T5. Revisar y aprobar la spec y el PR existente. (RF-1 a RF-10) · Área: Pruebas · Issue: pendiente · Responsable: por acordar.
  Hecho cuando: una integrante distinta de la autora registra su revisión y el equipo decide el merge.
- [ ] T6. Definir y configurar SMTP para correos externos. (RF-1, RF-3) · Área: Despliegue · Issue: pendiente · Responsable: por acordar.
  Hecho cuando: una cuenta autorizada externa al equipo recibe y confirma el correo sin divulgar claves.
- [ ] T7. Publicar y comprobar el flujo en HTTPS. (RF-1 a RF-10) · Área: Despliegue · Depende de T6 · Issue: pendiente.
  Hecho cuando: el enlace remoto ejecuta servidor e interfaz y supera las comprobaciones documentadas.

T6 y T7 son trabajo posterior a la implementación local y requieren completar su plan de publicación. El equipo decide el reparto; esta lista no asigna a ninguna integrante.
