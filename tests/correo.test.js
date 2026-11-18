// =====================================================================
//  tests/correo.test.js — Pruebas del correo de recuperación de contraseña.
//
//  No necesitan base de datos: corren siempre con  npm test.
//  Revisan que solo se envíen enlaces a NUESTRA página de recuperar y que
//  en producción el modo "consola" no muestre el token en los Logs.
// =====================================================================
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const APP = 'https://autowealth.onrender.com';
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde'; // como crypto.randomBytes(32).toString('base64url')

// Carga correo.js con una configuración de prueba (sin .env ni base de datos real)
function cargarCorreo({ nodeEnv = 'test', appUrl = APP } = {}) {
  Object.assign(process.env, {
    NODE_ENV: nodeEnv,
    DATABASE_URL: 'postgresql://prueba:prueba@localhost:5432/prueba',
    SESSION_SECRET: 'x'.repeat(40),
    DATA_ENCRYPTION_KEY: '0'.repeat(64),
    EMAIL_PROVIDER: 'consola',
    APP_URL: appUrl,
  });
  for (const archivo of ['config.js', 'correo.js']) delete require.cache[path.join(__dirname, '..', 'src', archivo)];
  return require('../src/correo');
}

// Guarda lo que se imprime en la terminal mientras corre "fn"
async function capturarConsola(fn) {
  const original = console.log;
  const lineas = [];
  console.log = (...partes) => lineas.push(partes.join(' '));
  try { await fn(); } finally { console.log = original; }
  return lineas.join('\n');
}

describe('Correo de recuperación', () => {
  test('crearEnlaceRecuperacion usa APP_URL y la ruta /recuperar', () => {
    const correo = cargarCorreo();
    assert.equal(correo.crearEnlaceRecuperacion(TOKEN), `${APP}/recuperar?token=${TOKEN}`);
  });

  test('rechaza enlaces a otros sitios o con un token raro', async () => {
    const correo = cargarCorreo();
    const malos = [
      `https://sitio-falso.com/recuperar?token=${TOKEN}`,
      `${APP}.sitio-falso.com/recuperar?token=${TOKEN}`, // empieza igual que APP_URL, pero es otro sitio
      `${APP}/otra-pagina?token=${TOKEN}`,
      `${APP}/recuperar?token=corto`,
      `${APP}/recuperar?token=${TOKEN}&siguiente=https://sitio-falso.com`,
      '',
    ];
    for (const enlace of malos) {
      await assert.rejects(correo.enviarCorreoRecuperacion('ana@example.com', 'Ana', enlace), /Enlace de recuperación inválido/, enlace);
    }
  });

  test('el error no incluye el token', async () => {
    const correo = cargarCorreo();
    await assert.rejects(correo.enviarCorreoRecuperacion('ana@example.com', 'Ana', `https://sitio-falso.com/recuperar?token=${TOKEN}`),
      (err) => !err.message.includes(TOKEN));
  });

  test('sin APP_URL en producción no se puede armar el enlace', () => {
    const correo = cargarCorreo({ nodeEnv: 'production', appUrl: '' });
    assert.throws(() => correo.crearEnlaceRecuperacion(TOKEN), /Falta APP_URL/);
  });

  test('la plantilla tiene el botón, el aviso y escapa el nombre', () => {
    const correo = cargarCorreo();
    const { asunto, html, textoPlano } = correo.plantillaRecuperacion('<b>Ana</b> Pérez', `${APP}/recuperar?token=${TOKEN}`);
    assert.match(asunto, /Crea una contraseña nueva/);
    assert.match(html, /Crea una contraseña nueva/);
    assert.match(html, /Si no fuiste tú, ignora este correo\.<\/strong> El enlace vence en 30 minutos\./);
    assert.ok(html.includes(`href="${APP}/recuperar?token=${TOKEN}"`));
    assert.ok(!html.includes('<b>Ana</b>'), 'el nombre debe ir escapado');
    assert.match(textoPlano, /El enlace vence en 30 minutos/);
  });

  test('modo consola: en tu computador muestra el enlace', async () => {
    const correo = cargarCorreo();
    const salida = await capturarConsola(() => correo.enviarCorreoRecuperacion('ana@example.com', 'Ana', correo.crearEnlaceRecuperacion(TOKEN)));
    assert.ok(salida.includes(TOKEN));
  });

  test('modo consola: en producción NO muestra el token', async () => {
    const correo = cargarCorreo({ nodeEnv: 'production' });
    const salida = await capturarConsola(() => correo.enviarCorreoRecuperacion('ana@example.com', 'Ana', correo.crearEnlaceRecuperacion(TOKEN)));
    assert.ok(!salida.includes(TOKEN));
    assert.match(salida, /••••••/);
  });
});
