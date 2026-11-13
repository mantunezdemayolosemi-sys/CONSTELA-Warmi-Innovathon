# Spec 002: Tu universo de habilidades

**Estado:** implementación existente documentada; pendiente de revisión y aprobación del equipo. Contenido acordado con la usuaria e implementado en el PR #1.

## Contexto y objetivo

Algunas mujeres no reconocen como fortalezas las acciones que realizan cotidianamente. Constela propone una exploración breve: seis situaciones que muestran distintas formas de aportar, sin respuestas correctas ni perfiles de personalidad.

## Propuesta de valor

Comparar la percepción inicial con las elecciones del recorrido para invitar a reconocer «la estrella que no veías». El resultado es un punto de partida para explorar y practicar, no una afirmación científica de capacidad. La correspondencia con el reto oficial sigue pendiente de validación del equipo.

## Usuarias / actores

Una usuaria con cuenta y correo confirmado, desde celular o computadora. Cada cuenta conserva su propio avance.

## Historias de usuaria

- H1: Como usuaria quiero explorar situaciones cercanas para reconocer formas de aportar.
- H2: Como usuaria quiero pausar y retomar sin perder las respuestas guardadas.
- H3: Como usuaria quiero comprender el resultado y compararlo con mi percepción inicial.
- H4: Como usuaria quiero un primer ejercicio que me invite a seguir explorando.

## Requisitos funcionales (EARS)

- RF-1: CUANDO la usuaria inicia sesión correctamente, EL SISTEMA abre su misión o sus resultados guardados.
- RF-2: ANTES de comenzar las misiones, EL SISTEMA permite seleccionar de cero a tres habilidades reconocidas inicialmente, sin duplicados.
- RF-3: EL SISTEMA presenta seis misiones de cuatro opciones, con cuatro oportunidades de elección para cada una de las seis habilidades.
- RF-4: CUANDO se continúa desde una misión con una opción elegida, EL SISTEMA guarda esa elección y actualiza la constelación de progreso.
- RF-5: CUANDO la usuaria vuelve a la misión, EL SISTEMA recupera la primera situación pendiente o los resultados si ya terminó.
- RF-6: CUANDO se completan las seis misiones, EL SISTEMA calcula un punto por elección y muestra las tres primeras posiciones positivas incluyendo todos los empates en el corte.
- RF-7: CUANDO existen habilidades elegidas durante las misiones pero no reconocidas al inicio, EL SISTEMA muestra las de mayor puntuación entre ellas como posibilidades por explorar, incluyendo sus empates.
- RF-8: SI todas las habilidades que aparecieron ya estaban reconocidas al inicio, ENTONCES EL SISTEMA lo comunica sin inventar una estrella adicional.
- RF-9: CUANDO la usuaria termina, EL SISTEMA permite guardar una reflexión entre «Sí, nunca lo había pensado», «Más o menos» y «Ya lo sabía».
- RF-10: CUANDO se lee o guarda una misión, EL SISTEMA usa la identidad autenticada y rechaza modificaciones con una revisión obsoleta.
- RF-11: CUANDO se muestran los resultados, EL SISTEMA explica el significado de las elecciones y propone ejercicios sin marcar habilidades como practicadas o demostradas.

## Requisitos no funcionales

Mensajes de reconocimiento sin clasificar a la usuaria por debilidades. Interfaz adaptable a celular y teclado, foco al cambiar de escena y movimiento reducido. Resultados privados y ausencia de tokens en almacenamiento del navegador. No se permite enviar puntuaciones ni IDs ajenos al guardar.

## Contenido versionado

Habilidades: Creatividad, Análisis, Colaboración, Liderazgo, Comunicación y Organización.

Misiones: El equipo en problemas; Una idea que necesita brillar; El tiempo corre; Algo no salió como esperabas; Una oportunidad inesperada; La misión final.

La versión 1 está en `src/discovery.js` y su validación equivalente de datos en la migración SQL. Cambiar el catálogo requiere revisar ambos, la compatibilidad con resultados guardados y las pruebas.

## Casos límite

No seleccionar habilidades iniciales; intentar una cuarta; elegir una opción que no existe en una misión; empates; ninguna estrella nueva; desconexión al guardar; dos pestañas abiertas; sesión expirada; editar respuestas de una misión ya completada. Los resultados se muestran solo al terminar las seis situaciones.

## Fuera de alcance

IA para clasificar personas, diagnóstico psicológico, rankings entre usuarias, entrega y evaluación de retos, evidencias en portafolio, recomendaciones de empleo, sonidos y avatar definitivo. Las sugerencias actuales son ejercicios de texto, no un sistema de retos completados.

## Criterios de finalización

Validación de catálogo, puntuación, empates, seguridad, revisión y persistencia en verde; recorrido real de seis misiones y reflexión; revisión visual en escritorio y 375 px. El equipo debe revisar y aprobar la redacción y la spec antes de dar por cerrada su revisión humana.

## Dudas abiertas

- ¿La redacción resulta cercana y comprensible para las usuarias objetivo del reto?
- ¿Qué ejercicios se convertirán en retos con evidencia en una siguiente spec?
- ¿Cuál será la identidad visual definitiva y el avatar? Su diseño es trabajo pendiente.
