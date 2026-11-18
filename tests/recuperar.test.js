// =====================================================================
//  tests/recuperar.test.js — Pruebas de "¿Olvidaste tu contraseña?".
//
//  Arrancan el servidor de verdad contra una base de datos de PRUEBAS con el
//  correo en modo "consola": el enlace del correo se lee de lo que el servidor
//  escribe en la terminal. Necesitan TEST_DATABASE_URL; sin ella se saltan.
//  ⚠️ Nunca uses la base de datos de producción: las pruebas crean usuarios.
// =====================================================================
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const path = require('node:path');

const DB = process.env.TEST_DATABASE_URL;
const PUERTO = 4300 + Math.floor(Math.random() * 90); // distinto de los otros archivos de pruebas
const B = `http://localhost:${PUERTO}`;
const CLAVE = 'clave-segura-1';
let servidor;
let salidaServidor = '';

// ------------------------------- Ayudas -------------------------------
// (las mismas de tests/api.test.js: un "navegador" mínimo que guarda la cookie)
function cliente() {
  let cookie = '';
  async function pedir(ruta, { method = 'GET', body, headers = {} } = {}) {
    const opciones = { method, redirect: 'manual', headers: { ...(method !== 'GET' ? { Origin: B } : {}), ...headers } };
    if (cookie) opciones.headers.Cookie = cookie;
    if (body !== undefined) { opciones.headers['Content-Type'] = 'application/json'; opciones.body = JSON.stringify(body); }
    const res = await fetch(B + ruta, opciones);
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0].endsWith('=') ? '' : setCookie.split(';')[0];
    const tipo = res.headers.get('content-type') || '';
    const datos = tipo.includes('json') ? await res.json() : await res.text();
    return { estado: res.status, datos };
  }
  return { pedir };
}

const unico = () => crypto.randomBytes(4).toString('hex');
const cedula = () => String(10_000_000 + Math.floor(Math.random() * 89_999_999));

async function registrar(c) {
  const email = `recuperar.${unico()}@ejemplo.test`;
  const r = await c.pedir('/api/registro', {
    method: 'POST',
    body: { nombre: 'Persona de Prueba', email, telefono: '3001234567', cedula: cedula(), password: CLAVE, acepta_datos: true },
  });
  assert.equal(r.estado, 201, JSON.stringify(r.datos));
  return email;
}

// Pide el enlace y espera a que el "correo" (modo consola) aparezca en la salida del servidor
async function pedirEnlace(email) {
  const antes = salidaServidor.length;
  const r = await cliente().pedir('/api/recuperar', { method: 'POST', body: { email } });
  assert.equal(r.estado, 200);
  for (let i = 0; i < 40; i++) {
    const nueva = salidaServidor.slice(antes);
    const m = nueva.match(new RegExp(`Para:\\s+${email.replace(/[.]/g, '\\.')}[\\s\\S]*?Enlace:\\s+(\\S+)`));
    if (m) return new URL(m[1]).searchParams.get('token');
    await new Promise((res) => setTimeout(res, 100));
  }
  return null;
}

// --------------------------- Arranque / cierre ---------------------------
before(async () => {
  if (!DB) return;
  servidor = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'test', PORT: String(PUERTO), DATABASE_URL: DB, APP_URL: B,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      DATA_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
      EMAIL_PROVIDER: 'consola', OPEN_FINANCE_PROVIDER: 'simulado', ADMIN_PASSWORD: '',
    },
  });
  servidor.stdout.on('data', (d) => { salidaServidor += d; });
  servidor.stderr.on('data', (d) => { salidaServidor += d; });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(B + '/api/salud')).ok) return; } catch { /* todavía arrancando */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('El servidor no arrancó:\n' + salidaServidor);
});

after(() => { if (servidor) servidor.kill(); });

// ---------------------------------- Pruebas ----------------------------------
describe('Recuperar contraseña', { skip: !DB && 'Define TEST_DATABASE_URL para correr las pruebas' }, () => {
  test('responde lo mismo exista o no el correo (no revela quién está registrado)', async () => {
    const email = await registrar(cliente());
    const existe = await cliente().pedir('/api/recuperar', { method: 'POST', body: { email } });
    const noExiste = await cliente().pedir('/api/recuperar', { method: 'POST', body: { email: `nadie.${unico()}@ejemplo.test` } });
    assert.equal(existe.estado, 200);
    assert.deepEqual(existe.datos, noExiste.datos);
    assert.equal((await cliente().pedir('/api/recuperar', { method: 'POST', body: { email: 'no-es-correo' } })).estado, 400);
  });

  test('flujo completo: el enlace cambia la contraseña, sirve una sola vez y cierra las sesiones', async () => {
    const abierta = cliente();
    const email = await registrar(abierta); // esta sesión debe cerrarse al cambiar la contraseña
    assert.equal((await abierta.pedir('/api/yo')).datos.sesion, true);

    const token = await pedirEnlace(email);
    assert.ok(token, 'el correo (modo consola) trae el enlace:\n' + salidaServidor.slice(-800));
    assert.match(token, /^[A-Za-z0-9_-]{43}$/, '32 bytes aleatorios en base64url');

    const corta = await cliente().pedir('/api/recuperar/confirmar', { method: 'POST', body: { token, password: '123' } });
    assert.equal(corta.estado, 400, 'contraseña de menos de 8 caracteres');

    const nueva = 'otra-clave-segura-2';
    const ok = await cliente().pedir('/api/recuperar/confirmar', { method: 'POST', body: { token, password: nueva } });
    assert.equal(ok.estado, 200, JSON.stringify(ok.datos));

    const otraVez = await cliente().pedir('/api/recuperar/confirmar', { method: 'POST', body: { token, password: 'tercera-clave-3' } });
    assert.equal(otraVez.estado, 400, 'el enlace es de un solo uso');

    assert.equal((await abierta.pedir('/api/yo')).datos.sesion, false, 'la sesión abierta antes del cambio ya no vale');
    assert.equal((await abierta.pedir('/api/finanzas/resumen')).estado, 401);

    const vieja = await cliente().pedir('/api/ingreso', { method: 'POST', body: { email, password: CLAVE } });
    assert.equal(vieja.estado, 401, 'la contraseña anterior ya no sirve');
    const c = cliente();
    assert.equal((await c.pedir('/api/ingreso', { method: 'POST', body: { email, password: nueva } })).estado, 200);
    assert.equal((await c.pedir('/api/yo')).datos.sesion, true, 'una sesión nueva sí funciona');

    const acciones = (await c.pedir('/api/privacidad')).datos.historial.map((h) => h.accion);
    assert.ok(acciones.includes('recuperacion_solicitada') && acciones.includes('contrasena_cambiada'));
  });

  test('pedir un enlace nuevo invalida el anterior, y un token inventado no sirve', async () => {
    const email = await registrar(cliente());
    const primero = await pedirEnlace(email);
    const segundo = await pedirEnlace(email);
    assert.ok(primero && segundo && primero !== segundo);
    assert.equal((await cliente().pedir('/api/recuperar/confirmar', { method: 'POST', body: { token: primero, password: 'clave-nueva-123' } })).estado, 400);
    assert.equal((await cliente().pedir('/api/recuperar/confirmar', { method: 'POST', body: { token: crypto.randomBytes(32).toString('base64url'), password: 'clave-nueva-123' } })).estado, 400);
    assert.equal((await cliente().pedir('/api/recuperar/confirmar', { method: 'POST', body: { token: segundo, password: 'clave-nueva-123' } })).estado, 200);
  });

  test('máximo 3 correos por dirección cada hora (el cuarto no se envía, pero la respuesta es igual)', async () => {
    const email = await registrar(cliente());
    for (let i = 0; i < 3; i++) assert.ok(await pedirEnlace(email), `correo ${i + 1}`);
    const r = await cliente().pedir('/api/recuperar', { method: 'POST', body: { email } });
    assert.equal(r.estado, 200);
    await new Promise((res) => setTimeout(res, 800));
    // Solo los correos de recuperación (el de bienvenida también escribe "Para:")
    const enviados = (salidaServidor.match(new RegExp(`recuperación que se enviaría:\\s+Para:\\s+${email.replace(/[.]/g, '\\.')}`, 'g')) || []).length;
    assert.equal(enviados, 3);
  });

  test('la página /recuperar existe y no deja escapar el token a otros sitios', async () => {
    const r = await cliente().pedir('/recuperar?token=abc');
    assert.equal(r.estado, 200);
    assert.match(r.datos, /no-referrer/);
  });
});
