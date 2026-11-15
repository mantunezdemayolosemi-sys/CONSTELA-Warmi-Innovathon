/* ══════════════════════════════════════════════════════════════
   CONSTELA · demo galaxia
   JavaScript sin dependencias.
   Cuentas locales: se guardan en localStorage de este navegador.
   La contraseña nunca se guarda en texto plano: se deriva con
   SHA-256 + sal aleatoria (o un respaldo simple si el navegador
   abre el archivo sin contexto seguro).
   ══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const CLAVE_USUARIAS = "constela.demo.usuarias.v1";
  const CLAVE_SESION = "constela.demo.sesion.v1";
  const META_NIVEL = 40;

  const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ─────────────────────────── Utilidades ─────────────────────────── */

  function leerJSON(clave, respaldo) {
    try {
      const crudo = localStorage.getItem(clave);
      if (!crudo) return respaldo;
      const dato = JSON.parse(crudo);
      return dato ?? respaldo;
    } catch (error) {
      return respaldo;
    }
  }

  function guardarJSON(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch (error) {
      avisar("No se pudo guardar en este navegador. Puede estar en modo privado.");
      return false;
    }
  }

  function normalizarCorreo(valor) {
    return String(valor).trim().toLowerCase();
  }

  function idUnico() {
    return "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function nuevaSal() {
    const bytes = new Uint8Array(12);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function derivarClave(texto, sal, metodo) {
    const datos = new TextEncoder().encode(sal + ":" + texto);
    const usar = metodo || (window.crypto && window.crypto.subtle ? "sha256" : "respaldo");
    if (usar === "sha256" && window.crypto && window.crypto.subtle) {
      try {
        const buffer = await window.crypto.subtle.digest("SHA-256", datos);
        return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
      } catch (error) {
        /* cae al respaldo */
      }
    }
    // Respaldo no criptográfico, solo para file:// sin contexto seguro.
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < datos.length; i += 1) {
      h1 ^= datos[i];
      h1 = Math.imul(h1, 16777619);
      h2 = (h2 + datos[i] * 31 + i) >>> 0;
    }
    return "r" + (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
  }

  function avisar(mensaje) {
    const contenedor = $("#avisos");
    if (!contenedor) return;
    while (contenedor.children.length >= 3) contenedor.firstElementChild.remove();
    const nodo = document.createElement("div");
    nodo.className = "aviso";
    nodo.textContent = mensaje;
    contenedor.appendChild(nodo);
    window.setTimeout(() => {
      nodo.classList.add("saliendo");
      window.setTimeout(() => nodo.remove(), 320);
    }, 4200);
  }

  function celebrar(x, y, cantidad) {
    if (movimientoReducido.matches) return;
    const signos = ["✦", "✧", "✺", "·", "✷"];
    const total = cantidad || 14;
    for (let i = 0; i < total; i += 1) {
      const chispa = document.createElement("span");
      chispa.className = "chispa-viva";
      chispa.textContent = signos[Math.floor(Math.random() * signos.length)];
      chispa.style.left = x + "px";
      chispa.style.top = y + "px";
      chispa.style.fontSize = 9 + Math.random() * 12 + "px";
      document.body.appendChild(chispa);

      const angulo = Math.random() * Math.PI * 2;
      const distancia = 40 + Math.random() * 150;
      const dx = Math.cos(angulo) * distancia;
      const dy = Math.sin(angulo) * distancia - 40;

      const animacion = chispa.animate(
        [
          { transform: "translate(-50%, -50%) scale(0.4)", opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(${0.6 + Math.random()}) rotate(${Math.random() * 240 - 120}deg)`, opacity: 0 },
        ],
        { duration: 700 + Math.random() * 700, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" }
      );
      animacion.onfinish = () => chispa.remove();
    }
  }

  function celebrarEnElemento(elemento, cantidad) {
    const caja = elemento.getBoundingClientRect();
    celebrar(caja.left + caja.width / 2, caja.top + caja.height / 2, cantidad);
  }

  /* ─────────────────────────── Sesión y estado ─────────────────────────── */

  let usuarias = leerJSON(CLAVE_USUARIAS, []);
  if (!Array.isArray(usuarias)) usuarias = [];

  let sesionId = (() => {
    try {
      return localStorage.getItem(CLAVE_SESION);
    } catch (error) {
      return null;
    }
  })();

  function usuariaActual() {
    if (!sesionId) return null;
    return usuarias.find((u) => u.id === sesionId) || null;
  }

  function estadoInicial() {
    return {
      estrellas: 0,
      habilidades: [],
      premiadas: [],
      arquetipo: null,
      testHecho: false,
      guardados: [],
      postulados: [],
    };
  }

  let juego = estadoInicial();

  function cargarJuegoDe(usuaria) {
    const estado = usuaria && usuaria.estado ? usuaria.estado : null;
    juego = estado ? { ...estadoInicial(), ...estado } : estadoInicial();
    juego.habilidades = Array.isArray(juego.habilidades) ? juego.habilidades : [];
    juego.premiadas = Array.isArray(juego.premiadas) ? juego.premiadas : [];
    juego.guardados = Array.isArray(juego.guardados) ? juego.guardados : [];
    juego.postulados = Array.isArray(juego.postulados) ? juego.postulados : [];
  }

  function guardarJuego() {
    const usuaria = usuariaActual();
    if (!usuaria) return;
    usuaria.estado = {
      estrellas: juego.estrellas,
      habilidades: juego.habilidades.slice(),
      premiadas: juego.premiadas.slice(),
      arquetipo: juego.arquetipo,
      testHecho: juego.testHecho,
      guardados: juego.guardados.slice(),
      postulados: juego.postulados.slice(),
    };
    guardarJSON(CLAVE_USUARIAS, usuarias);
    pintarPanel();
    pintarCabecera();
  }

  function nivelActual() {
    return Math.floor(juego.estrellas / META_NIVEL) + 1;
  }

  function sumarEstrellas(cantidad, motivo) {
    juego.estrellas += cantidad;
    guardarJuego();
    if (motivo) avisar("+" + cantidad + " ✦ · " + motivo);
  }

  /* ─────────────────────────── Cabecera ─────────────────────────── */

  function pintarCabecera() {
    const usuaria = usuariaActual();
    const chip = $("#usuario");
    const entrar = $('.barra-acciones [data-abrir="login"]');
    const crear = $('.barra-acciones [data-abrir="registro"]');

    if (usuaria) {
      const corto = usuaria.nombre.split(" ")[0];
      $("[data-nombre-corto]", chip).textContent = corto;
      $("[data-nivel]", chip).textContent = "Nv. " + nivelActual();
      chip.hidden = false;
      if (entrar) entrar.hidden = true;
      if (crear) crear.hidden = true;
    } else {
      chip.hidden = true;
      if (entrar) entrar.hidden = false;
      if (crear) crear.hidden = false;
    }
  }

  /* ─────────────────────────── Panel de perfil ─────────────────────────── */

  const ARQUETIPOS = {
    creadora: {
      nombre: "La Creadora",
      frase: "Imaginas y le das forma a lo que aún no existe.",
      desc: "Sueles encontrar salidas donde otras personas ven un muro. Tu fuerza está en imaginar, probar y dar forma: un afiche, un relato, una manera distinta de contar lo que haces.",
      fuerzas: ["imaginación", "diseño", "narrativa"],
    },
    estratega: {
      nombre: "La Estratega",
      frase: "Ordenas el caos hasta convertirlo en un plan.",
      desc: "Antes de actuar, entiendes. Te acomoda ver el panorama completo, priorizar y sostener un proceso hasta el final. Tu fuerza está en transformar ideas sueltas en pasos posibles.",
      fuerzas: ["organización", "análisis", "decisión"],
    },
    conectora: {
      nombre: "La Conectora",
      frase: "Tejes personas, conversaciones y confianza.",
      desc: "Detectas lo que alguien necesita antes de que lo diga y haces que un grupo se entienda. Tu fuerza está en comunicar, mediar y crear redes que sostienen los proyectos.",
      fuerzas: ["comunicación", "empatía", "redes"],
    },
    exploradora: {
      nombre: "La Exploradora",
      frase: "Pruebas, aprendes y vuelves con otra idea.",
      desc: "La curiosidad te mueve. No necesitas tenerlo todo claro para empezar: aprendes haciendo y te adaptas cuando el plan cambia. Tu fuerza está en la iniciativa y la flexibilidad.",
      fuerzas: ["curiosidad", "adaptación", "iniciativa"],
    },
  };

  function pintarPanel() {
    const usuaria = usuariaActual();
    const panel = $("#mi-constelacion");
    if (!panel) return;

    if (!usuaria) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;

    $("[data-nombre]", panel).textContent = usuaria.nombre.split(" ")[0];
    $("[data-estrellas]", panel).textContent = String(juego.estrellas);
    $("[data-nivel-num]", panel).textContent = String(nivelActual());

    const arquetipo = juego.arquetipo ? ARQUETIPOS[juego.arquetipo] : null;
    $("[data-arquetipo]", panel).textContent = arquetipo
      ? "Hoy te nombra " + arquetipo.nombre + ". " + arquetipo.frase
      : "Tu constelación está lista para empezar a brillar.";

    const progreso = juego.estrellas % META_NIVEL;
    const barra = $("[data-barra]", panel);
    const medidor = $(".medidor-barra", panel);
    barra.style.width = Math.round((progreso / META_NIVEL) * 100) + "%";
    medidor.setAttribute("aria-valuenow", String(progreso));
    $("[data-pista]", panel).textContent =
      progreso === 0 && juego.estrellas > 0
        ? "Nivel completo. Sigue así."
        : "Te faltan " + (META_NIVEL - progreso) + " estrellas para tu siguiente nivel.";

    const ganadas = {
      primera: juego.estrellas > 0,
      test: juego.testHecho,
      reto: juego.postulados.length > 0,
      constelacion: juego.habilidades.length >= 6,
    };
    $$(".insignia", panel).forEach((nodo) => {
      nodo.classList.toggle("ganada", Boolean(ganadas[nodo.dataset.insignia]));
    });
  }

  /* ─────────────────────────── Constelación interactiva ─────────────────────────── */

  const nodos = $$(".nodo");

  function pintarConstelacion() {
    nodos.forEach((nodo) => {
      const encendido = juego.habilidades.includes(nodo.dataset.skill);
      nodo.classList.toggle("encendido", encendido);
      nodo.setAttribute("aria-pressed", encendido ? "true" : "false");
    });

    $$(".arista").forEach((arista) => {
      const [a, b] = arista.dataset.nodos.split(" ");
      const activa = juego.habilidades.includes(a) && juego.habilidades.includes(b);
      arista.classList.toggle("encendida", activa);
    });

    const total = juego.habilidades.length;
    $("[data-encendidas]").textContent = String(total);
    const reiniciar = $("#reiniciar-constelacion");
    if (reiniciar) reiniciar.hidden = total === 0;
  }

  function alternarHabilidad(skill, origen) {
    const indice = juego.habilidades.indexOf(skill);
    if (indice >= 0) {
      juego.habilidades.splice(indice, 1);
      pintarConstelacion();
      guardarJuego();
      return;
    }

    juego.habilidades.push(skill);
    pintarConstelacion();
    guardarJuego();

    if (origen) celebrarEnElemento(origen, 10);

    if (!juego.premiadas.includes(skill)) {
      juego.premiadas.push(skill);
      sumarEstrellas(8, "encendiste «" + skill + "»");
    }

    if (juego.habilidades.length === 6) {
      avisar("Tu constelación completa se encendió. Ahora pide ser vista.");
    }
  }

  nodos.forEach((nodo) => {
    const activar = () => alternarHabilidad(nodo.dataset.skill, nodo);
    nodo.addEventListener("click", activar);
    nodo.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter" || evento.key === " ") {
        evento.preventDefault();
        activar();
      }
    });
  });

  const reiniciarConstelacion = $("#reiniciar-constelacion");
  if (reiniciarConstelacion) {
    reiniciarConstelacion.addEventListener("click", () => {
      juego.habilidades = [];
      pintarConstelacion();
      guardarJuego();
    });
  }

  /* ─────────────────────────── Ventana de acceso ─────────────────────────── */

  const dialogo = $("#acceso");
  const formularioLogin = $("#form-login");
  const formularioRegistro = $("#form-registro");
  const errorAcceso = $("#acceso-error");

  let modoDialogo = "login";

  function limpiarErrores() {
    if (errorAcceso) {
      errorAcceso.hidden = true;
      errorAcceso.textContent = "";
    }
    $$(".campo-error", dialogo).forEach((nodo) => {
      nodo.textContent = "";
    });
    $$("input", dialogo).forEach((nodo) => {
      nodo.removeAttribute("aria-invalid");
    });
  }

  function marcarError(input, mensaje) {
    if (!input) return;
    input.setAttribute("aria-invalid", "true");
    const destino = $('[data-error-de="' + input.id + '"]', dialogo);
    if (destino) destino.textContent = mensaje;
  }

  function abrirAcceso(modo) {
    if (!dialogo) return;
    limpiarErrores();
    definirModo(modo === "registro" ? "registro" : "login");
    if (!dialogo.open) {
      dialogo.showModal();
      document.body.classList.add("con-dialogo");
    }
    window.setTimeout(() => {
      const primero = modo === "registro" ? $("#registro-nombre") : $("#login-correo");
      if (primero) primero.focus();
    }, 60);
  }

  function cerrarAcceso() {
    if (dialogo && dialogo.open) dialogo.close();
    document.body.classList.remove("con-dialogo");
  }

  function definirModo(modo) {
    modoDialogo = modo;
    const esRegistro = modo === "registro";

    const pestanaLogin = $("#pestana-login");
    const pestanaRegistro = $("#pestana-registro");
    if (pestanaLogin) {
      pestanaLogin.setAttribute("aria-selected", String(!esRegistro));
      pestanaLogin.tabIndex = esRegistro ? -1 : 0;
    }
    if (pestanaRegistro) {
      pestanaRegistro.setAttribute("aria-selected", String(esRegistro));
      pestanaRegistro.tabIndex = esRegistro ? 0 : -1;
    }

    if (formularioLogin) formularioLogin.hidden = esRegistro;
    if (formularioRegistro) formularioRegistro.hidden = !esRegistro;

    const titulo = $("#acceso-titulo");
    const subtitulo = $("#acceso-sub");
    if (titulo) titulo.textContent = esRegistro ? "Empecemos por tu nombre." : "Qué bueno verte.";
    if (subtitulo) {
      subtitulo.textContent = esRegistro
        ? "Crea tu cuenta para guardar tus estrellas y tu constelación."
        : "Entra para guardar tus estrellas y tu constelación.";
    }
    limpiarErrores();
  }

  $$("[data-abrir]").forEach((boton) => {
    boton.addEventListener("click", () => abrirAcceso(boton.dataset.abrir));
  });

  const cerrarBoton = $("#cerrar-acceso");
  if (cerrarBoton) cerrarBoton.addEventListener("click", cerrarAcceso);

  if (dialogo) {
    dialogo.addEventListener("click", (evento) => {
      if (evento.target === dialogo) cerrarAcceso();
    });
    dialogo.addEventListener("close", () => document.body.classList.remove("con-dialogo"));
  }

  $$("[data-modo]").forEach((boton) => {
    boton.addEventListener("click", () => {
      definirModo(boton.dataset.modo);
      const destino = boton.dataset.modo === "registro" ? $("#registro-nombre") : $("#login-correo");
      if (destino) destino.focus();
    });
  });

  // Mostrar u ocultar contraseñas
  $$(".ojo").forEach((boton) => {
    boton.addEventListener("click", () => {
      const input = document.getElementById(boton.dataset.ver);
      if (!input) return;
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      boton.setAttribute("aria-pressed", String(!visible));
      boton.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
      input.focus();
    });
  });

  // Medidor de fuerza
  const campoClaveRegistro = $("#registro-clave");
  const medidorFuerza = $(".fuerza");
  if (campoClaveRegistro && medidorFuerza) {
    campoClaveRegistro.addEventListener("input", () => {
      const valor = campoClaveRegistro.value;
      let fuerza = 0;
      if (valor.length >= 8) fuerza += 1;
      if (valor.length >= 12) fuerza += 1;
      if (/[A-ZÁÉÍÓÚÑ]/.test(valor) && /[a-záéíóúñ]/.test(valor)) fuerza += 1;
      if (/[0-9]/.test(valor) && /[^\w\s]/.test(valor)) fuerza += 1;
      medidorFuerza.dataset.nivel = String(Math.min(fuerza, 4));
    });
  }

  // Limpiar error al escribir
  $$("input", dialogo || document).forEach((input) => {
    input.addEventListener("input", () => {
      input.removeAttribute("aria-invalid");
      const destino = $('[data-error-de="' + input.id + '"]', dialogo);
      if (destino) destino.textContent = "";
    });
  });

  function validarCorreo(valor) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor);
  }

  function iniciarSesion(usuaria) {
    sesionId = usuaria.id;
    try {
      localStorage.setItem(CLAVE_SESION, usuaria.id);
    } catch (error) {
      /* la sesión dura lo que la pestaña */
    }
    cargarJuegoDe(usuaria);
    pintarCabecera();
    pintarPanel();
    pintarConstelacion();
    pintarRetos();
    pintarTest();
    cerrarAcceso();
    avisar("Bienvenida, " + usuaria.nombre.split(" ")[0] + ". Tu constelación te espera.");
    window.setTimeout(() => {
      const panel = $("#mi-constelacion");
      if (panel && !panel.hidden) {
        panel.scrollIntoView({ behavior: movimientoReducido.matches ? "auto" : "smooth", block: "center" });
        celebrarEnElemento($("#panel-nucleo", panel) || panel, 18);
      }
    }, 260);
  }

  if (formularioRegistro) {
    formularioRegistro.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      limpiarErrores();

      const nombre = $("#registro-nombre");
      const correo = $("#registro-correo");
      const clave = $("#registro-clave");
      const confirmar = $("#registro-confirmar");

      let valido = true;
      if (!nombre.value.trim() || nombre.value.trim().length < 2) {
        marcarError(nombre, "Escribe al menos 2 caracteres.");
        valido = false;
      }
      if (!validarCorreo(correo.value)) {
        marcarError(correo, "Escribe un correo válido, por ejemplo nombre@correo.com.");
        valido = false;
      }
      if (clave.value.length < 12) {
        marcarError(clave, "Usa al menos 12 caracteres. Una frase es más fácil de recordar.");
        valido = false;
      }
      if (confirmar.value !== clave.value) {
        marcarError(confirmar, "Las contraseñas no coinciden.");
        valido = false;
      }
      if (!valido) {
        const primerError = $('input[aria-invalid="true"]', dialogo);
        if (primerError) primerError.focus();
        return;
      }

      const correoLimpio = normalizarCorreo(correo.value);
      if (usuarias.some((u) => u.correo === correoLimpio)) {
        marcarError(correo, "Ese correo ya tiene una cuenta en esta demo. Prueba iniciar sesión.");
        return;
      }

      const boton = $('button[type="submit"]', formularioRegistro);
      if (boton) boton.disabled = true;

      const sal = nuevaSal();
      const metodo = window.crypto && window.crypto.subtle ? "sha256" : "respaldo";
      const hash = await derivarClave(clave.value, sal, metodo);

      const nueva = {
        id: idUnico(),
        nombre: nombre.value.trim(),
        correo: correoLimpio,
        sal,
        metodo,
        hash,
        creada: Date.now(),
        estado: null,
      };

      usuarias.push(nueva);
      guardarJSON(CLAVE_USUARIAS, usuarias);

      // Conserva lo que la persona hizo como invitada.
      nueva.estado = {
        estrellas: juego.estrellas,
        habilidades: juego.habilidades.slice(),
        premiadas: juego.premiadas.slice(),
        arquetipo: juego.arquetipo,
        testHecho: juego.testHecho,
        guardados: juego.guardados.slice(),
        postulados: juego.postulados.slice(),
      };
      guardarJSON(CLAVE_USUARIAS, usuarias);

      if (boton) boton.disabled = false;
      formularioRegistro.reset();
      if (medidorFuerza) medidorFuerza.dataset.nivel = "0";
      iniciarSesion(nueva);
    });
  }

  if (formularioLogin) {
    formularioLogin.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      limpiarErrores();

      const correo = $("#login-correo");
      const clave = $("#login-clave");

      if (!validarCorreo(correo.value)) {
        marcarError(correo, "Escribe un correo válido.");
        return;
      }
      if (!clave.value) {
        marcarError(clave, "Escribe tu contraseña.");
        return;
      }

      const boton = $('button[type="submit"]', formularioLogin);
      if (boton) boton.disabled = true;

      const encontrada = usuarias.find((u) => u.correo === normalizarCorreo(correo.value));
      const hash = encontrada ? await derivarClave(clave.value, encontrada.sal, encontrada.metodo) : "";
      const coincide = Boolean(encontrada) && hash === encontrada.hash;

      if (boton) boton.disabled = false;

      if (!coincide) {
        if (errorAcceso) {
          errorAcceso.hidden = false;
          errorAcceso.textContent = "Correo o contraseña incorrectos. Inténtalo otra vez.";
        }
        clave.value = "";
        clave.focus();
        return;
      }

      formularioLogin.reset();
      iniciarSesion(encontrada);
    });
  }

  function cerrarSesion() {
    sesionId = null;
    try {
      localStorage.removeItem(CLAVE_SESION);
    } catch (error) {
      /* nada que limpiar */
    }
    juego = estadoInicial();
    pintarCabecera();
    pintarPanel();
    pintarConstelacion();
    pintarRetos();
    pintarTest();
    avisar("Sesión cerrada. Tus estrellas quedaron guardadas en este navegador.");
  }

  const salirPanel = $("#salir-panel");
  if (salirPanel) salirPanel.addEventListener("click", cerrarSesion);

  const chipUsuario = $("#usuario");
  if (chipUsuario) {
    chipUsuario.addEventListener("click", () => {
      const panel = $("#mi-constelacion");
      if (panel && !panel.hidden) {
        panel.scrollIntoView({ behavior: movimientoReducido.matches ? "auto" : "smooth", block: "center" });
      }
    });
  }

  $$("[data-ir]").forEach((boton) => {
    boton.addEventListener("click", () => {
      const destino = document.getElementById(boton.dataset.ir);
      if (destino) destino.scrollIntoView({ behavior: movimientoReducido.matches ? "auto" : "smooth", block: "start" });
    });
  });

  /* ─────────────────────────── Test de arquetipos ─────────────────────────── */

  const PREGUNTAS = [
    {
      texto: "Se canceló la persona que iba a abrir el local de la feria. Son las 7 de la mañana. ¿Qué haces primero?",
      opciones: [
        { texto: "Armo un plan rápido con lo que hay y reparto tareas.", arquetipo: "estratega" },
        { texto: "Escribo un mensaje que calme al grupo y nos ordene.", arquetipo: "conectora" },
        { texto: "Improviso una apertura distinta con lo que tengo a mano.", arquetipo: "creadora" },
      ],
    },
    {
      texto: "En una reunión de vecinas nadie se pone de acuerdo sobre el presupuesto. Tú…",
      opciones: [
        { texto: "Pregunto qué necesita cada una antes de proponer números.", arquetipo: "conectora" },
        { texto: "Propongo un orden de prioridades y lo escribo en la pizarra.", arquetipo: "estratega" },
        { texto: "Cuento un ejemplo de otra feria que salió bien.", arquetipo: "creadora" },
      ],
    },
    {
      texto: "Te dan 48 horas para entregar algo que nunca hiciste. Lo primero que sientes es…",
      opciones: [
        { texto: "Curiosidad: quiero ver de qué se trata.", arquetipo: "exploradora" },
        { texto: "Ganas de entender bien el problema antes de empezar.", arquetipo: "estratega" },
        { texto: "Impaciencia por probar tres versiones y quedarme con una.", arquetipo: "creadora" },
      ],
    },
    {
      texto: "Un reto sale mal y la organización pide explicaciones. Tú…",
      opciones: [
        { texto: "Hablo con todas las personas involucradas antes de responder.", arquetipo: "conectora" },
        { texto: "Presento qué falló, qué aprendí y qué haría distinto.", arquetipo: "estratega" },
        { texto: "Busco otra forma de resolverlo con lo que ya tengo.", arquetipo: "exploradora" },
      ],
    },
  ];

  let indicePregunta = 0;
  let respuestas = [];

  function pintarTest() {
    const contenedor = $("#test-contenido");
    const resultado = $("#test-resultado");
    if (!contenedor || !resultado) return;

    if (juego.testHecho && juego.arquetipo) {
      indicePregunta = PREGUNTAS.length;
      contenedor.hidden = true;
      resultado.hidden = false;
      pintarResultado(juego.arquetipo);
      return;
    }

    contenedor.hidden = false;
    resultado.hidden = true;
    if (indicePregunta >= PREGUNTAS.length) {
      indicePregunta = 0;
      respuestas = [];
    }
    pintarPregunta();
  }

  function pintarPregunta() {
    const pregunta = PREGUNTAS[indicePregunta];
    if (!pregunta) return;

    $("#test-pregunta").textContent = pregunta.texto;
    $("#test-paso").textContent = "Pregunta " + (indicePregunta + 1) + " de " + PREGUNTAS.length;

    const barra = $("#test-barra");
    const medidor = $(".test-barra");
    barra.style.width = Math.round((indicePregunta / PREGUNTAS.length) * 100) + "%";
    medidor.setAttribute("aria-valuenow", String(indicePregunta));

    const opciones = $("#test-opciones");
    opciones.textContent = "";
    pregunta.opciones.forEach((opcion) => {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "opcion";
      boton.textContent = opcion.texto;
      boton.addEventListener("click", () => {
        $$(".opcion", opciones).forEach((b) => {
          b.disabled = true;
        });
        respuestas.push(opcion.arquetipo);
        celebrarEnElemento(boton, 5);
        window.setTimeout(() => {
          indicePregunta += 1;
          if (indicePregunta < PREGUNTAS.length) {
            pintarPregunta();
          } else {
            terminarTest();
          }
        }, movimientoReducido.matches ? 0 : 230);
      });
      opciones.appendChild(boton);
    });
  }

  function calcularArquetipo() {
    const conteo = { creadora: 0, estratega: 0, conectora: 0, exploradora: 0 };
    respuestas.forEach((clave) => {
      if (conteo[clave] !== undefined) conteo[clave] += 1;
    });
    let ganador = "exploradora";
    let maximo = -1;
    Object.keys(conteo).forEach((clave) => {
      if (conteo[clave] > maximo) {
        maximo = conteo[clave];
        ganador = clave;
      }
    });
    // Desempate: la última respuesta manda, sin imponer una etiqueta fija.
    const empatados = Object.keys(conteo).filter((clave) => conteo[clave] === maximo);
    if (empatados.length > 1) {
      const ultima = respuestas[respuestas.length - 1];
      if (empatados.includes(ultima)) return ultima;
    }
    return ganador;
  }

  function terminarTest() {
    const arquetipo = calcularArquetipo();
    juego.arquetipo = arquetipo;
    juego.testHecho = true;

    if (!juego.premiadas.includes("test")) {
      juego.premiadas.push("test");
      sumarEstrellas(25, "completaste el test");
    } else {
      guardarJuego();
    }

    const barra = $("#test-barra");
    if (barra) barra.style.width = "100%";
    const medidor = $(".test-barra");
    if (medidor) medidor.setAttribute("aria-valuenow", String(PREGUNTAS.length));
    $("#test-paso").textContent = "Resultado";

    $("#test-contenido").hidden = true;
    $("#test-resultado").hidden = false;
    pintarResultado(arquetipo);

    const resultado = $("#test-resultado");
    resultado.scrollIntoView({ behavior: movimientoReducido.matches ? "auto" : "smooth", block: "center" });
  }

  function pintarResultado(clave) {
    const arquetipo = ARQUETIPOS[clave];
    if (!arquetipo) return;

    $("#test-paso").textContent = "Resultado";
    $("#test-barra").style.width = "100%";
    $("#resultado-nombre").textContent = arquetipo.nombre;
    $("#resultado-desc").textContent = arquetipo.desc;

    const fuerzas = $("#resultado-fuerzas");
    fuerzas.textContent = "";
    arquetipo.fuerzas.forEach((fuerza) => {
      const chip = document.createElement("span");
      chip.textContent = fuerza;
      fuerzas.appendChild(chip);
    });

    const botonGuardar = $("#guardar-test");
    if (botonGuardar) {
      botonGuardar.textContent = usuariaActual() ? "Ver mi constelación" : "Guardar en mi cuenta";
    }
  }

  const botonGuardarTest = $("#guardar-test");
  if (botonGuardarTest) {
    botonGuardarTest.addEventListener("click", () => {
      if (usuariaActual()) {
        const panel = $("#mi-constelacion");
        if (panel) panel.scrollIntoView({ behavior: movimientoReducido.matches ? "auto" : "smooth", block: "center" });
      } else {
        abrirAcceso("registro");
      }
    });
  }

  const botonRepetirTest = $("#repetir-test");
  if (botonRepetirTest) {
    botonRepetirTest.addEventListener("click", () => {
      indicePregunta = 0;
      respuestas = [];
      juego.testHecho = false;
      pintarTest();
      $("#test").scrollIntoView({ behavior: movimientoReducido.matches ? "auto" : "smooth", block: "start" });
    });
  }

  /* ─────────────────────────── Retos ─────────────────────────── */

  const tarjetasReto = $$(".reto");

  function nombreReto(tarjeta) {
    const titulo = $("h3", tarjeta);
    return titulo ? titulo.textContent.trim() : "";
  }

  function pintarRetos() {
    tarjetasReto.forEach((tarjeta) => {
      const nombre = nombreReto(tarjeta);
      const botonPostular = $("[data-postular]", tarjeta);
      const botonGuardar = $("[data-guardar]", tarjeta);

      const postulado = juego.postulados.includes(nombre);
      const guardado = juego.guardados.includes(nombre);

      tarjeta.classList.toggle("postulado", postulado);
      if (botonPostular) {
        botonPostular.textContent = postulado ? "Postulaste ✦" : "Postular";
        botonPostular.disabled = postulado;
      }
      if (botonGuardar) {
        botonGuardar.textContent = guardado ? "Guardado ✦" : "Guardar";
        botonGuardar.setAttribute("aria-pressed", String(guardado));
      }
    });
  }

  tarjetasReto.forEach((tarjeta) => {
    const nombre = nombreReto(tarjeta);
    const botonPostular = $("[data-postular]", tarjeta);
    const botonGuardar = $("[data-guardar]", tarjeta);

    if (botonPostular) {
      botonPostular.addEventListener("click", () => {
        if (!usuariaActual()) {
          avisar("Crea tu cuenta para postular y guardar este reto.");
          abrirAcceso("registro");
          return;
        }
        if (juego.postulados.includes(nombre)) return;
        juego.postulados.push(nombre);
        guardarJuego();
        pintarRetos();
        sumarEstrellas(15, "postulaste a un reto");
        celebrarEnElemento(botonPostular, 14);
        avisar("En el piloto real, aquí enviarías tu propuesta a la organización.");
      });
    }

    if (botonGuardar) {
      botonGuardar.addEventListener("click", () => {
        if (!usuariaActual()) {
          avisar("Crea tu cuenta para guardar retos en tu constelación.");
          abrirAcceso("registro");
          return;
        }
        const indice = juego.guardados.indexOf(nombre);
        if (indice >= 0) {
          juego.guardados.splice(indice, 1);
          guardarJuego();
          pintarRetos();
          return;
        }
        juego.guardados.push(nombre);
        guardarJuego();
        pintarRetos();
        if (!juego.premiadas.includes("reto:" + nombre)) {
          juego.premiadas.push("reto:" + nombre);
          sumarEstrellas(5, "guardaste un reto");
        }
      });
    }
  });

  $$(".filtro").forEach((boton) => {
    boton.addEventListener("click", () => {
      $$(".filtro").forEach((otro) => {
        const activo = otro === boton;
        otro.classList.toggle("activo", activo);
        otro.setAttribute("aria-pressed", String(activo));
      });

      const filtro = boton.dataset.filtro;
      tarjetasReto.forEach((tarjeta) => {
        const visible = filtro === "todos" || tarjeta.dataset.categoria === filtro;
        tarjeta.classList.toggle("oculto", !visible);
      });
    });
  });

  /* ─────────────────────────── Pasos acordeón ─────────────────────────── */

  $$(".paso").forEach((paso) => {
    const boton = $(".paso-boton", paso);
    if (!boton) return;
    boton.addEventListener("click", () => {
      const abierto = paso.classList.contains("abierto");

      $$(".paso").forEach((otro) => {
        otro.classList.remove("abierto");
        const otroBoton = $(".paso-boton", otro);
        if (otroBoton) otroBoton.setAttribute("aria-expanded", "false");
        const signo = $(".paso-signo", otro);
        if (signo) signo.textContent = "+";
      });

      if (!abierto) {
        paso.classList.add("abierto");
        boton.setAttribute("aria-expanded", "true");
        const signo = $(".paso-signo", paso);
        if (signo) signo.textContent = "−";
      }
    });
  });

  /* ─────────────────────────── Cielo animado ─────────────────────────── */

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
      botonCalma.setAttribute("aria-pressed", String(pausado));
      botonCalma.addEventListener("click", () => {
        pausado = !pausado;
        botonCalma.setAttribute("aria-pressed", String(pausado));
        if (pausado) {
          window.cancelAnimationFrame(frame);
          pintarQuieto();
          avisar("Cielo en calma. Puedes reanudar el movimiento cuando quieras.");
        } else {
          ultimo = 0;
          frame = window.requestAnimationFrame(pintar);
          avisar("El cielo vuelve a moverse.");
        }
      });
    }

    medir();
  }

  /* ─────────────────────────── Revelado y contadores ─────────────────────────── */

  function animarNumero(nodo) {
    const destino = parseFloat(nodo.dataset.contar);
    const decimales = parseInt(nodo.dataset.decimales || "0", 10);
    if (Number.isNaN(destino)) return;

    if (movimientoReducido.matches) {
      nodo.textContent = destino.toFixed(decimales);
      return;
    }

    const inicio = performance.now();
    const duracion = 1200;
    function paso(ahora) {
      const avance = Math.min((ahora - inicio) / duracion, 1);
      const suavizado = 1 - Math.pow(1 - avance, 3);
      nodo.textContent = (destino * suavizado).toFixed(decimales);
      if (avance < 1) window.requestAnimationFrame(paso);
      else nodo.textContent = destino.toFixed(decimales);
    }
    window.requestAnimationFrame(paso);
  }

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add("dentro");
        $$("[data-contar]", entrada.target).forEach(animarNumero);
        observador.unobserve(entrada.target);
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -40px 0px" }
  );

  $$(".revelar").forEach((nodo, indice) => {
    nodo.style.transitionDelay = (indice % 3) * 60 + "ms";
    observador.observe(nodo);
  });

  /* ─────────────────────────── Menú móvil ─────────────────────────── */

  const botonMenu = $("#boton-menu");
  const menu = $("#menu");
  if (botonMenu && menu) {
    botonMenu.addEventListener("click", () => {
      const abierto = menu.classList.toggle("abierto");
      botonMenu.setAttribute("aria-expanded", String(abierto));
    });

    $$("a", menu).forEach((enlace) => {
      enlace.addEventListener("click", () => {
        menu.classList.remove("abierto");
        botonMenu.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("pointerdown", (evento) => {
      if (!menu.classList.contains("abierto")) return;
      if (menu.contains(evento.target) || botonMenu.contains(evento.target)) return;
      menu.classList.remove("abierto");
      botonMenu.setAttribute("aria-expanded", "false");
    });
  }

  /* ─────────────────────────── Arranque ─────────────────────────── */

  cargarJuegoDe(usuariaActual());
  pintarConstelacion();
  pintarTest();
  pintarRetos();
  pintarCabecera();
  pintarPanel();
  montarCielo();
})();
