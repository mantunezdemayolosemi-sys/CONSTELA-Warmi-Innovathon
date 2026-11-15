// Servidor estático mínimo para ver la demo localmente.
// Uso: node serve.mjs   ·   luego abre http://localhost:4173

import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL(".", import.meta.url));
const PUERTO = Number(process.env.PORT || 4173);

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
};

const servidor = createServer((peticion, respuesta) => {
  const url = new URL(peticion.url || "/", "http://localhost");
  let ruta = decodeURIComponent(url.pathname);
  if (ruta === "/") ruta = "/index.html";

  const archivo = normalize(join(RAIZ, ruta));
  if (!archivo.startsWith(RAIZ.endsWith(sep) ? RAIZ : RAIZ + sep)) {
    respuesta.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    respuesta.end("Acceso denegado");
    return;
  }

  let info;
  try {
    info = statSync(archivo);
  } catch {
    respuesta.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    respuesta.end("No encontrado");
    return;
  }

  if (info.isDirectory()) {
    respuesta.writeHead(302, { location: ruta.replace(/\/?$/, "/") + "index.html" });
    respuesta.end();
    return;
  }

  respuesta.writeHead(200, {
    "content-type": TIPOS[extname(archivo).toLowerCase()] || "application/octet-stream",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  createReadStream(archivo).pipe(respuesta);
});

servidor.listen(PUERTO, () => {
  console.log(`Constela · demo galaxia en http://localhost:${PUERTO}`);
});
