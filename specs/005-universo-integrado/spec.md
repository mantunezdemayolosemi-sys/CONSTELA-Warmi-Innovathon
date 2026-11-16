# 005 · De una chispa a una constelación

Solicitud de Maricielo: integrar la portada y el estilo del PR #5 de Tyra con la aplicación funcional del PR #4. La revisión del equipo sigue pendiente.

- **RF-1.** `/` muestra la portada pública en estilo galaxia de Tyra, con cielo en movimiento, control Calma y constelación interactiva de muestra. Entrar y Crear cuenta abren el flujo real. La muestra no crea cuentas ni suma puntos.
- **RF-2.** Tras acceder, las usuarias entran a `/universo` y las cuentas publicadoras a `/publicar`. «Mi universo» muestra una estrella avatar, las galaxias, fortalezas del test y estrellas de práctica. El botón «Continuar mi viaje» guía a galaxias, misión guardada, siguiente reto u oportunidades según lo ya guardado. «Explorar» agrupa Retos, Oportunidades de Lima y Empleos simulados. Las rutas anteriores siguen disponibles.
- **RF-3.** Las publicaciones, el test de seis misiones, «La estrella que no veías», el scraping de Lima y la sesión usan el backend existente. Se mantiene la privacidad de propuestas y la separación entre simulación y eventos reales. El tema galaxia se aplica a las pantallas internas con estados de foco, contraste y movimiento reducido.
- **RF-4.** Cada reto con práctica registrada otorga una estrella y 25 puntos. El nivel inicial es 1; cada 75 puntos (3 prácticas) sube un nivel. Los puntos, estrellas y niveles se calculan en el servidor desde prácticas propias únicas ya guardadas. No hay premios por clics, por guardar, por repetir un reto ni por resultados del test. Mostrar nivel, puntos, estrella encendida y progreso al siguiente nivel en Mi universo y Retos. Las estrellas de habilidad no suman puntos; tampoco acreditan una evaluación.
- **RF-5.** Las prácticas registradas se pueden revisar en privado desde Mi universo incluso si la publicación ya cerró. Un reto puede sugerirse por galaxias y, a igualdad, por habilidades del test, sin limitar el acceso. La demo mantiene un avatar visual sencillo sin migración de datos.

## Plan y tareas

- [x] U1 · Portada y cielo adaptados de Tyra, con navegación real. Se comprobaron interacción de estrellas y modo Calma.
- [x] U2 · Mi universo y Explorar; con sesión existente se recuperaron galaxias, misión, reto recomendado y eventos de Lima.
- [x] U3 · 25 puntos por práctica y nivel cada 75 puntos. Fixture local verificado: 2 estrellas/50 puntos → 3 estrellas/75 puntos/nivel 2 → recarga y lectura de propuesta propia.
- [x] U4 · 81 pruebas y vista previa; `test/universe.test.js` cubre rutas, identidad, privacidad, recomendación e hitos.

Se reutilizan HTML, CSS, JavaScript, Fastify y Supabase. No hay una nueva migración ni se ejecuta el servidor o la autenticación del prototipo de Tyra. `/web/universe` verifica la sesión, prepara un resumen sin propuestas privadas y aprovecha la consulta privada de prácticas ya existente para abrir cada propuesta. El progreso se deriva de claves únicas de reto de las prácticas persistidas, sin columnas nuevas ni contadores editables.

Portada, cielo, diseño de constelación y paleta adaptados del trabajo de Tyra Rivera Delgado en el [PR #5](https://github.com/mantunezdemayolosemi-sys/CONSTELA-Warmi-Innovathon/pull/5), commit `70eb6a0`. La integración usa como base el [PR #4](https://github.com/mantunezdemayolosemi-sys/CONSTELA-Warmi-Innovathon/pull/4).
