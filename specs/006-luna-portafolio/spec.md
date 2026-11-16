# 006 · Luna explorable y portafolio

Solicitud de Maricielo para adaptar la plataforma a una luna 3D con cuatro estaciones y un personaje controlable. Revisión del equipo pendiente.

- **RF-1.** Registro, verificación y acceso usan Supabase. Una usuaria nueva elige galaxias y termina las seis misiones antes de entrar a la luna. Una usuaria que ya completó el recorrido entra directamente. Las cuentas publicadoras conservan su panel.
- **RF-2.** «Mi luna» reúne las estaciones Eventos, Retos, Portafolio y Perfil. WASD o flechas mueven a la astronauta, Espacio la hace saltar y E abre la puerta cercana. Se puede volver desde cualquier estación. Controles táctiles y enlaces a las estaciones permiten usar el recorrido con distintos dispositivos o sin WebGL.
- **RF-3.** Cada estación muestra sus herramientas reales. Eventos ofrece el catálogo de Lima y acceso a empleos simulados. Retos conserva propuestas, reflexión, estrellas y niveles. Perfil conserva intereses, datos de cuenta y constelación.
- **RF-4.** El portafolio incorpora las prácticas propias existentes con propuesta, reflexión, fecha y título, incluso cuando cierra el reto. La usuaria registra asistencia y aprendizajes de eventos del catálogo o de eventos pasados por su cuenta. Puede editar los aprendizajes de sus eventos. Guardar un evento no da estrellas ni marca automáticamente una asistencia al abrir una convocatoria.
- **RF-5.** El historial es privado por cuenta y descargable en PDF con sus aprendizajes. Las prácticas simuladas y las asistencias registradas por la usuaria se distinguen en pantalla y en el PDF.

- **RF-6.** La luna es una esfera recorrible con estaciones grandes orientadas a su superficie, cráteres, rocas, cristales y equipamiento espacial. El giro ambiental es lento. Al caminar, el mundo rueda y la cámara se acerca de forma gradual para seguir a la astronauta. Los controles siguen la dirección de la pantalla.
- **RF-7.** El cielo muestra estrellas con variación suave de brillo y estrellas fugaces espaciadas. Un control Calma y la preferencia de movimiento reducido desactivan los efectos ambientales. «Vista completa» permite alejarse para ver el planeta. Las etiquetas y puertas siguen a sus estaciones durante el giro.

## Plan

- [x] L1 · Escena, controles y acceso guiado integrados. En navegador se abrió Retos con E y se comprobó la vista táctil.
- [x] L2 · Historial privado con RLS y accesos en las estaciones. Verificado con PGlite y una sesión local ficticia.
- [x] L3 · PDF descargado con un evento y tres prácticas ficticias. Se extrajo el texto y se revisaron ambas páginas renderizadas.
- [x] L4 · Pruebas de rutas, descarga, permisos y aislamiento. La tercera práctica del escenario local subió al nivel 2.

- [x] L5 · Esfera, movimiento sobre su superficie, seguimiento de cámara, estaciones ampliadas y decoración. Recorrido WASD y entrada al Portafolio con E comprobados en navegador; las colisiones impiden atravesar los edificios.
- [x] L6 · Cielo animado y Calma implementados. Verificadas las etiquetas sobre la curvatura, la cámara cercana y la vista de 390 × 844 con controles táctiles. Las 85 pruebas existentes pasan, junto con comprobación de sintaxis y diff. Un fallo transitorio de conexión al volver a la luna se recuperó al recargar.

La migración 008 está pendiente de aplicar en el Supabase compartido. Mientras tanto, el portafolio muestra las prácticas que ya existen y permite exportarlas. La interfaz habilita el registro de eventos cuando la tabla está disponible.

Three.js sirve la escena desde el mismo servidor, con modelos geométricos locales. PDFKit exporta el historial desde Node.js. La migración 008 agrega las participaciones y permite a cada usuaria consultar los metadatos de sus retos practicados.
