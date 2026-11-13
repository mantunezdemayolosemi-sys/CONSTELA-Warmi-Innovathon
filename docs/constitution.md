# Constitución de Constela

Propuesta de principios para revisión del equipo. Esta documentación incorpora el flujo SDD a una aplicación que ya tenía registro, perfiles y misión de habilidades implementados. Las specs 001 y 002 registran ese comportamiento; su aprobación humana sigue pendiente.

1. **La usuaria es el centro.** Constela ayuda a reconocer posibilidades mediante situaciones cotidianas. Sus resultados no son diagnósticos, certificaciones ni criterios para decidir acceso a oportunidades.
2. **Las decisiones quedan escritas.** Cada cambio funcional se vincula a una spec con requisitos verificables. Si cambia el alcance, se actualiza esa spec antes de implementar el cambio.
3. **Simplicidad.** El stack actual es HTML, CSS y JavaScript, Node.js 22, Fastify y Supabase. Una nueva dependencia debe resolver una necesidad concreta y quedar explicada en el plan.
4. **Privacidad.** Cada usuaria accede a su propio perfil y misión. Credenciales y datos personales quedan fuera del repositorio. Las pruebas automatizadas usan datos ficticios; una prueba real requiere una cuenta autorizada.
5. **Pruebas y revisión.** Los cambios pasan por `npm run check`, `npm test` y revisión humana mediante PR. Se distingue entre implementado, verificado, aprobado e integrado a `main`.
6. **Accesibilidad y lenguaje.** La interfaz debe poder usarse en celular y con teclado, ofrecer mensajes comprensibles y respetar movimiento reducido. Documentación y mensajes a la usuaria se escriben en español; se mantienen los identificadores técnicos existentes.
7. **Trabajo compartido.** Las integrantes deciden quién toma cada tarea y quién la revisa. La IA puede asistir, pero no asigna responsabilidades, aprueba PRs ni fusiona cambios por su cuenta.
