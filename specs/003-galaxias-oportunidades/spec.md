# 003 · Galaxias y oportunidades

Pedido de implementación de Maricielo, 12 de noviembre de 2026. Basado en la propuesta de «Presentación de Constela (1)» pegada por la usuaria. Revisión del equipo pendiente.

## Recorrido

Cuenta → galaxias de interés → percepción de habilidades → seis misiones → resultados → oportunidades. Los intereses expresan curiosidad, no experiencia ni aptitud. No se añade avatar en este incremento.

## Requisitos

- **RF-1:** Ofrecer Tecnología e IA; Diseño y creatividad; Negocios y emprendimiento; Ciencia e investigación; Impacto social; Marketing y comunicación; Sostenibilidad; Salud y bienestar; Educación; Datos y análisis; Arte y cultura; y «Quiero explorar».
- **RF-2:** Guardar de una a cinco áreas únicas. «Quiero explorar» es una elección exclusiva que abre todo el catálogo. Se puede editar desde el perfil sin repetir el test.
- **RF-3:** Guardar las elecciones privadas en Supabase, con RLS y escritura atómica que derive la identidad de la sesión y rechace revisiones antiguas.
- **RF-4:** Solicitar intereses antes de la misión a cuentas nuevas y existentes sin intereses. Conservar respuestas y resultados ya guardados.
- **RF-5:** Recopilar metadatos mínimos de fuentes públicas permitidas: nombre, tipo, enlace, fechas disponibles, modalidad, lugar, fuente y momento de consulta. No recopilar perfiles, credenciales ni inscribir a nadie.
- **RF-6:** El recolector usa fuentes fijas, tiempos y tamaños limitados, verifica robots.txt y conserva la última copia si una fuente falla. No ejecuta scripts de terceros ni acepta URLs de usuarias. Sin claves administrativas.
- **RF-7:** Etiquetar temas con reglas documentadas. Ordenar primero por intereses; para retos, las habilidades solo aportan una sugerencia secundaria de práctica. Mostrar el motivo, sin inferir elegibilidad, nivel ni fechas límite ausentes.
- **RF-8:** Permitir ver recomendaciones o todo el catálogo y filtrar por tipo y modalidad. Ocultar convocatorias vencidas; señalar datos ausentes, copia antigua y fuentes temporalmente indisponibles. No presentar datos ficticios como oportunidades reales.
- **RF-9:** Ejecutar una sincronización al iniciar el servidor y cada 12 horas mientras esté activo, con comando manual. El catálogo público se conserva como JSON local; los intereses se guardan en la base de datos. Documentar que alojamiento y proceso permanente siguen pendientes.
- **RF-10:** Mantener sesión segura, control de origen, navegación con teclado, diseño móvil, estados de carga/error/vacío y protección frente a contenido o enlaces inseguros.
- **RF-11 · Ajuste para la demo:** Por solicitud de Maricielo, mostrar únicamente oportunidades presenciales o híbridas con sede identificada en Lima Metropolitana, Perú. El filtro se aplica en el servidor a recomendaciones y «Todo el catálogo». Ni un nombre que mencione Lima ni la hora de Lima prueban ubicación. Registros antiguos sin país/ciudad confirmados, virtuales globales y otras ciudades se excluyen. La fuente activa pasa a la agenda pública de hack0; se muestran la página de procedencia y el enlace del organizador. Mantener caducidad, privacidad y actualización existentes.

## Límites

Este incremento no comprueba requisitos individuales, no solicita nivel de experiencia, no aplica a convocatorias, no implementa evaluaciones ni crea evidencia de habilidades. La cobertura depende de fuentes disponibles y puede ser desigual entre galaxias. La fecha del evento no equivale al cierre de inscripción.
