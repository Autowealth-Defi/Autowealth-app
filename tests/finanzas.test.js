// =====================================================================
//  tests/finanzas.test.js — Pruebas de los presupuestos por categoría.
//
//  1) "estadoPresupuesto": la cuenta de bien / cerca / excedido. Es una función
//     pura (no usa la base de datos), así que estas pruebas corren SIEMPRE.
//  2) Las rutas /api/finanzas/presupuestos: arrancan el servidor de verdad contra
//     una base de datos de PRUEBAS (igual que tests/api.test.js). Necesitan
//     TEST_DATABASE_URL; sin ella se saltan.
//  ⚠️ Nunca uses la base de datos de producción: las pruebas crean usuarios.
// =====================================================================
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const path = require('node:path');
const { estadoPresupuesto } = require('../src/finanzas/analisis');

const DB = process.env.TEST_DATABASE_URL;
const PUERTO = 4100 + Math.floor(Math.random() * 90); // distinto de api.test.js y deudas.test.js
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
  const r = await c.pedir('/api/registro', {
    method: 'POST',
    body: { nombre: 'Persona de Prueba', email: `presupuestos.${unico()}@ejemplo.test`, telefono: '3001234567', cedula: cedula(), password: CLAVE, acepta_datos: true },
  });
  assert.equal(r.estado, 201, JSON.stringify(r.datos));
}

// Registra un gasto a mano en una categoría y fecha concretas
async function gastar(c, categoria, valor, fecha) {
  const r = await c.pedir('/api/finanzas/movimientos', {
    method: 'POST', body: { fecha, descripcion: `Gasto de prueba ${unico()}`, valor, tipo: 'gasto', categoria },
  });
  assert.equal(r.estado, 201, JSON.stringify(r.datos));
}

const hoy = () => new Date().toISOString().slice(0, 10);
const mesActual = () => hoy().slice(0, 7);
// Día 15 del mes anterior (siempre existe y siempre está en el pasado)
function diaDelMesAnterior() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 15)).toISOString().slice(0, 10);
}

// ----------------------- 1) La cuenta del estado (sin BD) -----------------------

describe('estadoPresupuesto (bien / cerca / excedido)', () => {
  test('bien: menos del 80 % del límite', () => {
    assert.deepEqual(estadoPresupuesto(0, 100_000), { gastado: 0, porcentaje: 0, disponible: 100_000, estado: 'bien' });
    assert.equal(estadoPresupuesto(79_000, 100_000).estado, 'bien');
  });

  test('79,6 % se muestra como 80 % pero sigue en "bien" (se compara sin redondear)', () => {
    const r = estadoPresupuesto(79_600, 100_000);
    assert.equal(r.porcentaje, 80);
    assert.equal(r.estado, 'bien');
  });

  test('cerca: desde el 80 % hasta el 100 % exacto', () => {
    assert.equal(estadoPresupuesto(80_000, 100_000).estado, 'cerca');
    assert.equal(estadoPresupuesto(100_000, 100_000).estado, 'cerca', 'gastar justo el límite todavía no es pasarse');
  });

  test('excedido: más del 100 %, y "disponible" queda negativo', () => {
    const r = estadoPresupuesto(130_000, 100_000);
    assert.equal(r.estado, 'excedido');
    assert.equal(r.porcentaje, 130);
    assert.equal(r.disponible, -30_000);
  });
});

// --------------------------- 2) Las rutas (con BD) ---------------------------

before(async () => {
  if (!DB) return;
  servidor = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'test', PORT: String(PUERTO), DATABASE_URL: DB,
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

describe('Presupuestos por categoría', { skip: !DB && 'Define TEST_DATABASE_URL para correr las pruebas' }, () => {
  test('crear (201), repetido (409), listar, cambiar el límite y borrar', async () => {
    const c = cliente();
    await registrar(c);

    const creado = await c.pedir('/api/finanzas/presupuestos', { method: 'POST', body: { categoria: 'Mercado', limite: 600_000 } });
    assert.equal(creado.estado, 201, JSON.stringify(creado.datos));
    assert.ok(Number.isInteger(creado.datos.id));
    const { id } = creado.datos;

    const repetido = await c.pedir('/api/finanzas/presupuestos', { method: 'POST', body: { categoria: 'Mercado', limite: 1_000 } });
    assert.equal(repetido.estado, 409);
    assert.equal(repetido.datos.ok, false);

    let lista = (await c.pedir('/api/finanzas/presupuestos')).datos;
    assert.equal(lista.mes, mesActual(), 'sin ?mes= usa el mes en curso');
    assert.equal(lista.presupuestos.length, 1);
    assert.deepEqual(lista.presupuestos[0], { id, categoria: 'Mercado', limite: 600_000, gastado: 0, porcentaje: 0, disponible: 600_000, estado: 'bien' });
    assert.ok(!lista.categoriasDisponibles.includes('Mercado'), 'una categoría con presupuesto ya no aparece como disponible');
    assert.ok(lista.categoriasDisponibles.includes('Transporte'));

    assert.equal((await c.pedir(`/api/finanzas/presupuestos/${id}`, { method: 'PATCH', body: { limite: 750_000 } })).estado, 200);
    lista = (await c.pedir('/api/finanzas/presupuestos')).datos;
    assert.equal(lista.presupuestos[0].limite, 750_000);

    assert.equal((await c.pedir(`/api/finanzas/presupuestos/${id}`, { method: 'DELETE' })).estado, 200);
    assert.equal((await c.pedir(`/api/finanzas/presupuestos/${id}`, { method: 'DELETE' })).estado, 404, 'borrar dos veces → 404');
    assert.equal((await c.pedir('/api/finanzas/presupuestos')).datos.presupuestos.length, 0);
  });

  test('validaciones: categoría de gasto y límite entre 0 y 10.000 millones (400)', async () => {
    const c = cliente();
    await registrar(c);
    const crear = (body) => c.pedir('/api/finanzas/presupuestos', { method: 'POST', body });

    assert.equal((await crear({ categoria: 'Salario', limite: 100_000 })).estado, 400, 'una categoría de ingreso no lleva presupuesto');
    assert.equal((await crear({ categoria: 'Inventada', limite: 100_000 })).estado, 400);
    assert.equal((await crear({ limite: 100_000 })).estado, 400);
    for (const limite of [0, -5_000, 10_000_000_000, 'mucho', '', null, true]) {
      const r = await crear({ categoria: 'Transporte', limite });
      assert.equal(r.estado, 400, `limite = ${JSON.stringify(limite)}`);
      assert.match(r.datos.error, /límite/);
    }
    // Un número en texto ("250000") sí sirve: así lo envían muchos formularios
    assert.equal((await crear({ categoria: 'Transporte', limite: '250000' })).estado, 201);

    const { id } = (await c.pedir('/api/finanzas/presupuestos')).datos.presupuestos[0];
    assert.equal((await c.pedir(`/api/finanzas/presupuestos/${id}`, { method: 'PATCH', body: { limite: 0 } })).estado, 400);
    assert.equal((await c.pedir(`/api/finanzas/presupuestos/${id}`, { method: 'PATCH', body: {} })).estado, 400);
  });

  test('gastado, porcentaje y estado salen de los movimientos del mes pedido', async () => {
    const c = cliente();
    await registrar(c);
    await c.pedir('/api/finanzas/presupuestos', { method: 'POST', body: { categoria: 'Restaurantes y domicilios', limite: 100_000 } });
    await c.pedir('/api/finanzas/presupuestos', { method: 'POST', body: { categoria: 'Transporte', limite: 200_000 } });
    const buscar = (lista, cat) => lista.presupuestos.find((p) => p.categoria === cat);

    // Este mes: $85.000 en restaurantes → 85 % → "cerca"
    await gastar(c, 'Restaurantes y domicilios', 85_000, hoy());
    // Un gasto de OTRA categoría no cuenta para este presupuesto
    await gastar(c, 'Mercado', 500_000, hoy());
    let lista = (await c.pedir('/api/finanzas/presupuestos')).datos;
    assert.deepEqual(
      { ...buscar(lista, 'Restaurantes y domicilios'), id: 0 },
      { id: 0, categoria: 'Restaurantes y domicilios', limite: 100_000, gastado: 85_000, porcentaje: 85, disponible: 15_000, estado: 'cerca' });
    assert.equal(buscar(lista, 'Transporte').estado, 'bien');

    // Otros $30.000 → $115.000 de $100.000 → "excedido"
    await gastar(c, 'Restaurantes y domicilios', 30_000, hoy());
    lista = (await c.pedir('/api/finanzas/presupuestos')).datos;
    const r = buscar(lista, 'Restaurantes y domicilios');
    assert.equal(r.estado, 'excedido');
    assert.equal(r.porcentaje, 115);
    assert.equal(r.disponible, -15_000);

    // Un ingreso (ej. una devolución) no baja lo gastado
    await c.pedir('/api/finanzas/movimientos', { method: 'POST', body: { fecha: hoy(), descripcion: 'Reembolso', valor: 50_000, tipo: 'ingreso' } });
    assert.equal(buscar((await c.pedir('/api/finanzas/presupuestos')).datos, 'Restaurantes y domicilios').gastado, 115_000);

    // El mes anterior tiene sus propios gastos: no se mezclan con los de este mes
    const anterior = diaDelMesAnterior();
    await gastar(c, 'Transporte', 40_000, anterior);
    const delAnterior = (await c.pedir(`/api/finanzas/presupuestos?mes=${anterior.slice(0, 7)}`)).datos;
    assert.equal(delAnterior.mes, anterior.slice(0, 7));
    assert.equal(buscar(delAnterior, 'Transporte').gastado, 40_000);
    assert.equal(buscar(delAnterior, 'Restaurantes y domicilios').gastado, 0);
    assert.equal(buscar((await c.pedir('/api/finanzas/presupuestos')).datos, 'Transporte').gastado, 0);

    // Un ?mes= mal escrito no rompe nada: se usa el mes en curso
    assert.equal((await c.pedir('/api/finanzas/presupuestos?mes=2026-13')).datos.mes, mesActual());
  });

  test('otro usuario no puede verlos, cambiarlos ni borrarlos (404)', async () => {
    const a = cliente();
    const b = cliente();
    await registrar(a);
    await registrar(b);
    const { id } = (await a.pedir('/api/finanzas/presupuestos', { method: 'POST', body: { categoria: 'Compras', limite: 300_000 } })).datos;

    assert.equal((await b.pedir('/api/finanzas/presupuestos')).datos.presupuestos.length, 0);
    assert.equal((await b.pedir(`/api/finanzas/presupuestos/${id}`, { method: 'PATCH', body: { limite: 1 } })).estado, 404);
    assert.equal((await b.pedir(`/api/finanzas/presupuestos/${id}`, { method: 'DELETE' })).estado, 404);
    // ...y B sí puede tener su propio presupuesto de "Compras" (la regla es una por usuario, no una en total)
    assert.equal((await b.pedir('/api/finanzas/presupuestos', { method: 'POST', body: { categoria: 'Compras', limite: 50_000 } })).estado, 201);

    const deA = (await a.pedir('/api/finanzas/presupuestos')).datos.presupuestos[0];
    assert.equal(deA.limite, 300_000, 'el intento de B no cambió nada');
  });

  test('exportar mis datos los incluye y borrar mi información financiera los borra', async () => {
    const c = cliente();
    await registrar(c);
    await c.pedir('/api/finanzas/presupuestos', { method: 'POST', body: { categoria: 'Suscripciones', limite: 80_000 } });
    const exportado = (await c.pedir('/api/privacidad/exportar')).datos;
    assert.deepEqual(exportado.presupuestos.map(({ categoria, limite }) => ({ categoria, limite })), [{ categoria: 'Suscripciones', limite: 80_000 }]);

    const historial = (await c.pedir('/api/privacidad')).datos.historial;
    assert.ok(historial.some((h) => h.accion === 'presupuesto_creado'), 'crear un presupuesto queda en la auditoría');

    assert.equal((await c.pedir('/api/privacidad/borrar-finanzas', { method: 'POST', body: { password: CLAVE } })).estado, 200);
    assert.equal((await c.pedir('/api/finanzas/presupuestos')).datos.presupuestos.length, 0);
  });

  test('exigen sesión (401) y que la petición venga de la misma página (403)', async () => {
    const c = cliente();
    assert.equal((await c.pedir('/api/finanzas/presupuestos')).estado, 401);
    assert.equal((await c.pedir('/api/finanzas/presupuestos', { method: 'POST', body: { categoria: 'Mercado', limite: 1 } })).estado, 401);
    assert.equal((await c.pedir('/api/finanzas/presupuestos/1', { method: 'PATCH', body: { limite: 1 } })).estado, 401);
    assert.equal((await c.pedir('/api/finanzas/presupuestos/1', { method: 'DELETE' })).estado, 401);
    const otroSitio = await c.pedir('/api/finanzas/presupuestos', { method: 'POST', body: { categoria: 'Mercado', limite: 1 }, headers: { Origin: 'https://sitio-malicioso.example' } });
    assert.equal(otroSitio.estado, 403);
  });
});
