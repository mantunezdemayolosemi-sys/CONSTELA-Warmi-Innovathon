# Constela · demo galaxia

Demo visual e interactiva del concepto **CONSTELA** (Grupo 1, Warmi Innovathon, Eje 2).
Es una pieza **independiente** de la aplicación real: no usa el servidor Fastify, no toca
`public/`, no lee Supabase y no modifica ninguna spec.

## Cómo verla

```bash
node demo/constela-galaxia/serve.mjs
```

Abre <http://localhost:4173>. También puedes abrir `index.html` con doble clic, aunque el
servidor local es más fiable para las funciones del navegador.

## Qué incluye

- **Cielo animado** en canvas: estrellas con parallax, constelaciones que se dibujan solas y
  estrellas fugaces. Botón *Calma* para pausar el movimiento.
- **Constelación interactiva**: seis habilidades que se encienden al tocarlas y conectan sus
  aristas.
- **Test de arquetipos**: cuatro preguntas, resultado con la aclaración de que un arquetipo no
  es una etiqueta y puede cambiarse.
- **Retos de ejemplo** con filtros por categoría, guardado y postulación simulada.
- **Registro e inicio de sesión** con cuentas guardadas en `localStorage` de este navegador.
  La contraseña se deriva con SHA-256 y una sal aleatoria; nunca se guarda en texto plano.
- **Progreso**: estrellas, niveles e insignias que se conservan por cuenta.
- Accesibilidad: enlace de salto, foco visible, diálogo nativo, etiquetas y respeto por
  `prefers-reduced-motion`.

## Límites, dichos en voz alta

- No hay backend ni base de datos: las cuentas viven **solo en este navegador**. Si borras los
  datos del sitio, se pierden.
- No es un sistema de autenticación de producción. No sirve para datos reales ni contraseñas
  reales.
- Los retos, organizaciones y cifras de perfil son **ejemplos ficticios** para mostrar el flujo.
- No implementa scraping, avatares, pagos ni portafolio persistente: son partes del concepto
  que el piloto todavía debe acotar y validar.

## Archivos

| Archivo | Para qué |
| --- | --- |
| `index.html` | Estructura y contenido de la página |
| `styles.css` | Sistema visual galaxia/morado |
| `app.js` | Interacciones, estado local y autenticación de demo |
| `serve.mjs` | Servidor estático para desarrollo |
