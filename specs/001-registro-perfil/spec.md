# Spec 001: Registro, sesión y perfil privado

**Estado:** implementación existente documentada; pendiente de revisión y aprobación del equipo. Evidencia: PR #1 y pruebas automatizadas. Fecha de documentación: 12 de noviembre de 2026.

## Contexto y objetivo

Una usuaria necesita una cuenta para conservar su perfil y su recorrido en Constela. El registro recopila únicamente nombre, correo y contraseña; Supabase Auth gestiona las credenciales y la confirmación del correo.

## Propuesta de valor

Ofrecer una entrada sencilla a la experiencia de autodescubrimiento, con información privada y recuperable al volver a iniciar sesión. La relación con el briefing oficial está pendiente de completar en [RETO.md](../../docs/RETO.md).

## Usuarias / actores

- Usuaria con correo propio, desde celular o computadora.
- Equipo que desarrolla y verifica la demo con cuentas autorizadas.
- Proveedor de autenticación y datos, sin acceso administrativo desde el código de la aplicación.

## Historias de usuaria

- H1: Como usuaria quiero crear y confirmar mi cuenta para entrar a Constela.
- H2: Como usuaria quiero mantener mi sesión y recuperar mi perfil cuando vuelva.
- H3: Como usuaria quiero cambiar mi nombre y cerrar sesión desde mi cuenta.

## Requisitos funcionales (EARS)

- RF-1: CUANDO se envía un registro válido, EL SISTEMA solicita a Auth el alta con un nombre de 2–100 caracteres, un correo válido y una contraseña de 12–128 caracteres.
- RF-2: CUANDO se solicita registrar un correo existente, EL SISTEMA responde con el mismo mensaje genérico de aceptación que para una solicitud válida nueva.
- RF-3: SI el correo no está confirmado o las credenciales no son válidas, ENTONCES EL SISTEMA rechaza el acceso autenticado.
- RF-4: CUANDO una usuaria inicia sesión correctamente en la web, EL SISTEMA mantiene la sesión mediante cookies HttpOnly y permite renovarla sin exponer tokens al JavaScript de la interfaz.
- RF-5: CUANDO se consulta o edita un perfil, EL SISTEMA usa exclusivamente la identidad de la sesión verificada.
- RF-6: CUANDO se actualiza el perfil, EL SISTEMA permite modificar únicamente el nombre dentro del rango válido.
- RF-7: CUANDO se cierra la sesión web, EL SISTEMA revoca la renovación de esa sesión y elimina sus cookies.
- RF-8: SI una operación web que modifica datos proviene de otro origen o carece de Origin válido, ENTONCES EL SISTEMA la rechaza.
- RF-9: SI se supera el presupuesto de intentos de autenticación, ENTONCES EL SISTEMA responde con un límite de peticiones sin revelar información privada.
- RF-10: CUANDO Supabase vuelve a la ruta de confirmación, EL SISTEMA redirige a una pantalla informativa eliminando el fragmento de la URL.

## Requisitos no funcionales

Mensajes en español, interfaz adaptable a celular, controles con etiquetas y uso por teclado. RLS protege el perfil en PostgreSQL. No se guardan contraseñas en `profiles`, tokens en localStorage ni secretos en Git. El access token revocado para renovación puede seguir siendo válido hasta expirar; la interfaz elimina sus cookies al salir.

## Casos límite

Correo duplicado; contraseña corta; nombre vacío o demasiado largo; cuenta sin confirmar; caída del proveedor; sesión expirada; solicitudes mal formadas; intento de editar otro ID; página abierta con el servidor local apagado.

## Fuera de alcance

Recuperación de contraseña, OAuth/Google, administración de cuentas, recopilación de documentos personales, SMTP propio y despliegue público. Los dos últimos están pendientes para permitir pruebas con usuarias externas.

## Criterios de finalización

Pruebas automatizadas y recorrido manual documentados; revisión humana y merge aún pendientes. Para una entrega pública hacen falta además SMTP, configuración HTTPS y una nueva comprobación en el entorno publicado.

## Dudas abiertas

- Aprobación del equipo de este comportamiento documentado.
- Revisión de privacidad, información legal y soporte antes de abrir el registro al público.
- Definir proveedor de correo y alojamiento sin incluir credenciales en documentos o issues.
