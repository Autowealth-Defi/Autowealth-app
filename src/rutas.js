// =====================================================================
//  rutas.js — La "API": lo que hace el servidor cuando la página le pide algo.
//
//   POST /api/registro   → crea la cuenta, la guarda y envía el correo
//   POST /api/ingreso    → inicia sesión (y lo anota en la tabla ingresos)
//   POST /api/salir      → cierra la sesión
//   GET  /api/yo         → dice si hay una sesión abierta y de quién
//   GET  /api/salud      → comprueba que el servidor y la base de datos funcionan
//   POST /api/recuperar            → envía un enlace para crear una contraseña nueva
//   POST /api/recuperar/confirmar  → guarda la contraseña nueva (enlace de un solo uso)
// =====================================================================
const crypto = require('node:crypto');
const db = require('./db');
const seg = require('./seguridad');
const auditoria = require('./auditoria');
const { huella } = require('./cifrado');
const { usuarioActual } = require('./sesion');
const { validarRegistro, validarIngreso, validarEmail, validarNuevaContrasena } = require('./validacion');
const { enviarCorreoEncuesta, enviarCorreoRecuperacion, crearEnlaceRecuperacion } = require('./correo');
const { enviarJson, leerJson, ipCliente } = require('./http');

// Límites de intentos (cada 15 minutos). Son generosos por IP porque muchas
// personas pueden compartir la misma red (ej. la wifi de una universidad),
// y estrictos por cuenta para frenar a quien intente adivinar una contraseña.
const limiteRegistroIp = seg.crearLimitador({ maximo: 30, ventanaMin: 15 });
const limiteIngresoIp = seg.crearLimitador({ maximo: 100, ventanaMin: 15 });
const limiteIngresoCuenta = seg.crearLimitador({ maximo: 8, ventanaMin: 15 });
const mensajeEspera = (min) => `Demasiados intentos. Intenta de nuevo en ${min} min.`;
// Recuperar contraseña: 3 correos por dirección cada hora (contrato de api.md §6) y un
// tope por IP para que nadie use el formulario para llenar de correos a otras personas.
const limiteRecuperarCorreo = seg.crearLimitador({ maximo: 3, ventanaMin: 60 });
const limiteRecuperarIp = seg.crearLimitador({ maximo: 20, ventanaMin: 60 });
const limiteConfirmarIp = seg.crearLimitador({ maximo: 20, ventanaMin: 15 });
const MINUTOS_TOKEN = 30;

const primerNombre = (nombre) => String(nombre).split(' ')[0];

async function registro(req, res) {
  const { datos, error } = validarRegistro(await leerJson(req));
  if (error) return enviarJson(res, 400, { ok: false, error }); // un error de escritura no cuenta como intento

  const espera = limiteRegistroIp(ipCliente(req));
  if (espera) return enviarJson(res, 429, { ok: false, error: mensajeEspera(espera) });

  const passwordHash = await seg.crearHashContrasena(datos.password);

  let usuario;
  try {
    usuario = await db.crearUsuario({ ...datos, passwordHash });
  } catch (err) {
    if (err.code === '23505') { // 23505 = dato repetido (UNIQUE)
      const campo = String(err.constraint || '').includes('cedula') ? 'esa cédula' : 'ese correo';
      return enviarJson(res, 409, { ok: false, error: `Ya existe una cuenta con ${campo}. Inicia sesión.` });
    }
    throw err;
  }

  // Enviar el correo con la encuesta. Si falla, la cuenta igual queda creada
  // y el error queda anotado en la base de datos para revisarlo después.
  let correoEnviado = true;
  try {
    await enviarCorreoEncuesta(usuario.email, usuario.nombre);
    await db.marcarCorreoEnviado(usuario.id);
  } catch (err) {
    correoEnviado = false;
    console.error(`No se pudo enviar el correo a ${usuario.email}:`, err.message);
    await db.marcarCorreoFallido(usuario.id, err.message).catch(() => {});
  }

  console.log(`✅ Nuevo registro: ${usuario.email}`);
  const token = seg.crearTokenSesion(usuario.id, usuario.version_sesion || 1);
  enviarJson(res, 201, { ok: true, nombre: primerNombre(usuario.nombre), correoEnviado },
    { 'Set-Cookie': seg.cookieSesion(token) });
}

async function ingreso(req, res) {
  const { datos, error } = validarIngreso(await leerJson(req));
  if (error) return enviarJson(res, 400, { ok: false, error });

  const espera = limiteIngresoIp(ipCliente(req)) || limiteIngresoCuenta(datos.email);
  if (espera) return enviarJson(res, 429, { ok: false, error: mensajeEspera(espera) });

  const usuario = await db.buscarUsuarioPorEmail(datos.email);
  const correcta = usuario
    ? await seg.verificarContrasena(datos.password, usuario.password_hash)
    : await seg.compararConHashFalso(datos.password);

  await db.registrarIngreso({ usuarioId: usuario ? usuario.id : null, email: datos.email, exitoso: correcta });

  if (!correcta) {
    // Mismo mensaje para "no existe" y "contraseña incorrecta" (no revelar qué correos existen)
    return enviarJson(res, 401, { ok: false, error: 'Correo o contraseña incorrectos.' });
  }

  const token = seg.crearTokenSesion(usuario.id, usuario.version_sesion || 1);
  enviarJson(res, 200, { ok: true, nombre: primerNombre(usuario.nombre) }, { 'Set-Cookie': seg.cookieSesion(token) });
}

async function salir(req, res) {
  enviarJson(res, 200, { ok: true }, { 'Set-Cookie': seg.cookieCerrarSesion() });
}

async function yo(req, res) {
  // usuarioActual también revisa que la sesión no sea de antes de un cambio de contraseña
  const usuario = await usuarioActual(req);
  if (!usuario) return enviarJson(res, 200, { ok: true, sesion: false });
  enviarJson(res, 200, { ok: true, sesion: true, nombre: primerNombre(usuario.nombre) });
}

async function salud(req, res) {
  try {
    await db.verificarConexion();
    enviarJson(res, 200, { ok: true, baseDeDatos: 'conectada' });
  } catch (err) {
    enviarJson(res, 503, { ok: false, baseDeDatos: 'sin conexión' });
  }
}

// ------------------------- RECUPERAR CONTRASEÑA -------------------------
// Regla de oro: la respuesta es SIEMPRE la misma, exista o no el correo. Si dijéramos
// "ese correo no está registrado", cualquiera podría averiguar quién usa Auto-Wealth.
// Por eso también respondemos ANTES de buscar el correo y enviar el mensaje: así la
// respuesta tarda lo mismo en los dos casos (enviar un correo tarda más).
const RESPUESTA_RECUPERAR = { ok: true, mensaje: 'Si ese correo está registrado, te enviamos un enlace para crear una contraseña nueva.' };

async function recuperar(req, res) {
  const email = validarEmail((await leerJson(req)).email);
  if (!email) return enviarJson(res, 400, { ok: false, error: 'Escribe un correo válido.' });

  // El límite por IP sí se puede contar (no revela nada sobre el correo).
  const espera = limiteRecuperarIp(ipCliente(req));
  if (espera) return enviarJson(res, 429, { ok: false, error: mensajeEspera(espera) });

  enviarJson(res, 200, RESPUESTA_RECUPERAR);
  // Lo que sigue pasa después de responder. Los errores se anotan sin datos sensibles.
  enviarEnlaceRecuperacion(email).catch((err) => console.error('No se pudo procesar una solicitud de recuperación:', err.message));
}

async function enviarEnlaceRecuperacion(email) {
  // Tope por correo: si ya pidió 3 en la última hora, no se envía otro (en silencio).
  if (limiteRecuperarCorreo(email)) return;
  const usuario = await db.buscarUsuarioPorEmail(email);
  if (!usuario) return;

  // Token aleatorio de 256 bits. En la base de datos solo queda su huella (HMAC):
  // aunque alguien leyera la tabla, no podría usar el enlace.
  const token = crypto.randomBytes(32).toString('base64url');
  const expira = new Date(Date.now() + MINUTOS_TOKEN * 60 * 1000);
  await db.crearTokenRecuperacion(usuario.id, huella(token), expira); // invalida los anteriores
  await auditoria.registrar(usuario.id, 'recuperacion_solicitada', '');
  await enviarCorreoRecuperacion(usuario.email, usuario.nombre, crearEnlaceRecuperacion(token));
}

async function confirmarRecuperacion(req, res) {
  const espera = limiteConfirmarIp(ipCliente(req));
  if (espera) return enviarJson(res, 429, { ok: false, error: mensajeEspera(espera) });

  const b = await leerJson(req);
  const token = typeof b.token === 'string' ? b.token.trim() : '';
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(token)) return enviarJson(res, 400, { ok: false, error: ENLACE_INVALIDO });
  const error = validarNuevaContrasena(b.password);
  if (error) return enviarJson(res, 400, { ok: false, error });

  // Se gasta el token (un solo uso, y solo si no está usado ni vencido) y después se
  // cambia la contraseña. cambiarPassword sube version_sesion: se cierran todas las sesiones.
  const registro = await db.consumirTokenRecuperacion(huella(token));
  if (!registro) return enviarJson(res, 400, { ok: false, error: ENLACE_INVALIDO });
  await db.cambiarPassword(registro.usuario_id, await seg.crearHashContrasena(b.password));
  await auditoria.registrar(registro.usuario_id, 'contrasena_cambiada', 'con enlace de recuperación');
  console.log(`🔑 Contraseña cambiada con enlace de recuperación (usuario ${registro.usuario_id})`);
  // También se borra la cookie de este navegador: la persona entra con su contraseña nueva.
  enviarJson(res, 200, { ok: true }, { 'Set-Cookie': seg.cookieCerrarSesion() });
}
const ENLACE_INVALIDO = 'El enlace no es válido o ya venció. Pide uno nuevo desde "¿Olvidaste tu contraseña?".';

module.exports = { registro, ingreso, salir, yo, salud, recuperar, confirmarRecuperacion };
