/* Cielo de Tyra Rivera Delgado (PR #5), adaptado para la app integrada. */
const $ = id => document.querySelector(id);
const movimientoReducido = matchMedia("(prefers-reduced-motion: reduce)");
function avisar(texto) { document.querySelector("#cielo-estado").textContent = texto; }
  function montarCielo() {
    const lienzo = $("#cielo");
    if (!lienzo) return;
    const ctx = lienzo.getContext("2d");
    if (!ctx) return;

    let ancho = 0;
    let alto = 0;
    let dpr = 1;
    let estrellas = [];
    let fugaces = [];
    let pausado = movimientoReducido.matches;
    let frame = 0;
    let t = 0;
    let ultimo = 0;
    const puntero = { x: 0, y: 0, destinoX: 0, destinoY: 0 };

    function sembrar() {
      const cantidad = Math.round(Math.min(230, Math.max(70, (ancho * alto) / 12000)));
      estrellas = Array.from({ length: cantidad }, () => {
        const capa = Math.random();
        return {
          x: Math.random() * ancho,
          y: Math.random() * alto,
          r: 0.35 + capa * 1.5,
          capa,
          base: 0.22 + Math.random() * 0.55,
          velocidad: 0.0006 + Math.random() * 0.0022,
          fase: Math.random() * Math.PI * 2,
          deriva: (Math.random() - 0.5) * 0.06,
        };
      });
    }

    function medir() {
      ancho = window.innerWidth;
      alto = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      lienzo.width = Math.round(ancho * dpr);
      lienzo.height = Math.round(alto * dpr);
      lienzo.style.width = ancho + "px";
      lienzo.style.height = alto + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sembrar();
      if (pausado) pintarQuieto();
      else {
        window.cancelAnimationFrame(frame);
        ultimo = 0;
        frame = window.requestAnimationFrame(pintar);
      }
    }

    function posicion(estrella) {
      const px = (puntero.x / Math.max(ancho, 1) - 0.5) * 26 * estrella.capa;
      const py = (puntero.y / Math.max(alto, 1) - 0.5) * 18 * estrella.capa;
      const vaiven = Math.sin(t * estrella.velocidad + estrella.fase) * 4;
      return {
        x: estrella.x + px + vaiven + Math.cos(estrella.fase) * 2,
        y: estrella.y + py + vaiven * 0.6,
      };
    }

    function pintarQuieto() {
      ctx.clearRect(0, 0, ancho, alto);
      estrellas.forEach((estrella) => {
        ctx.beginPath();
        ctx.fillStyle = "rgba(226, 216, 255, " + estrella.base * 0.85 + ")";
        ctx.arc(estrella.x, estrella.y, estrella.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function pintar(ts) {
      if (pausado) return;
      if (!ultimo) ultimo = ts;
      const dt = Math.min(50, ts - ultimo);
      ultimo = ts;
      t += dt;

      puntero.x += (puntero.destinoX - puntero.x) * 0.045;
      puntero.y += (puntero.destinoY - puntero.y) * 0.045;

      ctx.clearRect(0, 0, ancho, alto);

      // Líneas tenues entre estrellas cercanas (constelaciones que aparecen solas)
      const puntos = [];
      for (let i = 0; i < estrellas.length; i += 1) {
        const estrella = estrellas[i];
        const p = posicion(estrella);
        if (estrella.capa < 0.75) puntos.push(p);
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < puntos.length; i += 1) {
        for (let j = i + 1; j < puntos.length; j += 1) {
          const dx = puntos[i].x - puntos[j].x;
          const dy = puntos[i].y - puntos[j].y;
          const distancia = dx * dx + dy * dy;
          if (distancia < 12100) {
            const alfa = (1 - distancia / 12100) * 0.1;
            ctx.strokeStyle = "rgba(183, 156, 255, " + alfa.toFixed(3) + ")";
            ctx.beginPath();
            ctx.moveTo(puntos[i].x, puntos[i].y);
            ctx.lineTo(puntos[j].x, puntos[j].y);
            ctx.stroke();
          }
        }
      }

      // Estrellas
      estrellas.forEach((estrella) => {
        const p = posicion(estrella);
        const titileo = 0.55 + Math.sin(t * estrella.velocidad * 2.4 + estrella.fase) * 0.45;
        const alfa = Math.max(0.06, estrella.base * (0.45 + titileo * 0.55));
        ctx.beginPath();
        ctx.fillStyle = "rgba(233, 225, 255, " + alfa.toFixed(3) + ")";
        ctx.arc(p.x, p.y, estrella.r, 0, Math.PI * 2);
        ctx.fill();

        if (estrella.r > 1.35) {
          ctx.beginPath();
          ctx.fillStyle = "rgba(183, 156, 255, " + (alfa * 0.16).toFixed(3) + ")";
          ctx.arc(p.x, p.y, estrella.r * 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Estrellas fugaces
      if (Math.random() < 0.0035 && fugaces.length < 2) {
        fugaces.push({
          x: Math.random() * ancho * 0.8,
          y: Math.random() * alto * 0.4,
          vx: 3.4 + Math.random() * 2.6,
          vy: 1.4 + Math.random() * 1.4,
          vida: 0,
          max: 90 + Math.random() * 50,
        });
      }

      fugaces = fugaces.filter((f) => f.vida < f.max);
      fugaces.forEach((f) => {
        f.x += f.vx;
        f.y += f.vy;
        f.vida += 1;
        const progreso = f.vida / f.max;
        const alfa = Math.sin(progreso * Math.PI) * 0.9;
        const cola = 90;
        const gradiente = ctx.createLinearGradient(f.x, f.y, f.x - f.vx * cola * 0.5, f.y - f.vy * cola * 0.5);
        gradiente.addColorStop(0, "rgba(255, 240, 210, " + alfa.toFixed(3) + ")");
        gradiente.addColorStop(1, "rgba(255, 240, 210, 0)");
        ctx.strokeStyle = gradiente;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(f.x - f.vx * 14, f.y - f.vy * 14);
        ctx.stroke();
      });

      frame = window.requestAnimationFrame(pintar);
    }

    let temporizador = 0;
    window.addEventListener("resize", () => {
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(medir, 160);
    });

    window.addEventListener("pointermove", (evento) => {
      puntero.destinoX = evento.clientX;
      puntero.destinoY = evento.clientY;

      const brillo = $("#brillo-cursor");
      if (brillo && !movimientoReducido.matches) {
        brillo.style.transform = "translate3d(" + evento.clientX + "px," + evento.clientY + "px,0)";
        brillo.style.opacity = "1";
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frame);
      } else if (!pausado) {
        ultimo = 0;
        frame = window.requestAnimationFrame(pintar);
      }
    });

    const botonCalma = $("#calma");
    if (botonCalma) {
      const ajustarCalma = (valor) => {
        pausado = valor;
        botonCalma.setAttribute("aria-pressed", String(pausado));
        document.documentElement.classList.toggle("cielo-en-calma", pausado);
        window.cancelAnimationFrame(frame);
        if (pausado) {
          pintarQuieto();
        } else if (!document.hidden) {
          ultimo = 0;
          frame = window.requestAnimationFrame(pintar);
        }
      };
      document.documentElement.classList.toggle("cielo-en-calma", pausado);
      botonCalma.setAttribute("aria-pressed", String(pausado));
      movimientoReducido.addEventListener("change", evento => ajustarCalma(evento.matches));
      botonCalma.addEventListener("click", () => {
        ajustarCalma(!pausado);
        avisar(pausado ? "Cielo en calma. Puedes reanudar el movimiento cuando quieras." : "El cielo vuelve a moverse.");
      });
    }

    medir();
  }

montarCielo();
