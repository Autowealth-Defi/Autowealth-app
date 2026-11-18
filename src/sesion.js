// =====================================================================
//  sesion.js — Saber quién está usando la app y proteger las rutas privadas.
// =====================================================================
const db = require('./db');
const seg = require('./seguridad');
const { enviarJson, leerCookies } = require('./http');

// Devuelve { id, nombre, email, version_sesion } del usuario con sesión abierta, o null.
// Si la cookie es de una versión vieja (la persona cambió la contraseña después de
// iniciar esa sesión), la sesión ya no vale: así "cambiar la contraseña" cierra las demás.
async function usuarioActual(req) {
  const sesion = seg.leerSesion(leerCookies(req)[seg.NOMBRE_COOKIE]);
  if (!sesion) return null;
  const usuario = await db.buscarUsuarioPorId(sesion.uid);
  if (!usuario || Number(usuario.version_sesion || 1) !== sesion.v) return null;
  return usuario;
}

// Para rutas de la API que exigen sesión: si no hay, responde 401 y devuelve null
async function exigirUsuario(req, res) {
  const usuario = await usuarioActual(req);
  if (!usuario) {
    enviarJson(res, 401, { ok: false, error: 'Tu sesión terminó. Inicia sesión de nuevo.', sesion: false });
    return null;
  }
  return usuario;
}

module.exports = { usuarioActual, exigirUsuario };
