// =====================================================================
//  finanzas/rutas.js — API del panel financiero y del centro de privacidad.
//  Todas las rutas exigen sesión y solo tocan los datos de ese usuario.
//
//   GET    /api/finanzas/resumen?mes=YYYY-MM     → indicadores del mes
//   GET    /api/finanzas/movimientos?mes=&cuenta= → lista de movimientos
//   POST   /api/finanzas/movimientos             → registrar un movimiento a mano
//   PATCH  /api/finanzas/movimientos/:id         → cambiar categoría
//   DELETE /api/finanzas/movimientos/:id         → borrar (solo manuales/importados)
//   GET    /api/finanzas/cuentas                 → cuentas y bancos conectados
//   POST   /api/finanzas/cuentas                 → crear cuenta manual
//   DELETE /api/finanzas/cuentas/:id             → borrar cuenta manual
//   POST   /api/finanzas/importar                → importar extracto (filas ya leídas del CSV)
//   GET    /api/privacidad                       → autorizaciones e historial
//   GET    /api/privacidad/exportar              → descargar todos mis datos (JSON)
//   POST   /api/privacidad/borrar-finanzas       → borrar toda mi información financiera
//   POST   /api/privacidad/eliminar-cuenta       → eliminar mi cuenta por completo
//   GET    /api/finanzas/presupuestos?mes=YYYY-MM → presupuestos con lo gastado en el mes
//   POST   /api/finanzas/presupuestos            → crear un presupuesto (una categoría de gasto)
//   PATCH  /api/finanzas/presupuestos/:id        → cambiar el límite
//   DELETE /api/finanzas/presupuestos/:id        → borrar un presupuesto
//   GET    /api/finanzas/metas                   → metas de ahorro con su progreso
//   POST   /api/finanzas/metas                   → crear una meta
//   POST   /api/finanzas/metas/:id/aportes       → aportar (valor > 0) o retirar (valor < 0)
//   DELETE /api/finanzas/metas/:id               → borrar una meta
//  Las deudas y el plan para el dinero ocioso están en finanzas/deudas.js.
// =====================================================================
const crypto = require('node:crypto');
const db = require('../db');
const fdb = require('./db');
const auditoria = require('../auditoria');
const openfinance = require('../openfinance');
const { cifrar, descifrar } = require('../cifrado');
const { TODAS, INGRESOS, GASTOS, NEUTRA, categorizar } = require('./categorias');
const { resumen: calcularResumen, mesesAtras, estadoPresupuesto, estadoMeta } = require('./analisis');
const { deudaParaRespuesta } = require('./deudas');
const { enviarJson, leerJson } = require('../http');
const { exigirUsuario } = require('../sesion');
const { verificarContrasena, crearLimitador, cookieCerrarSesion } = require('../seguridad');

const TIPOS_CUENTA = ['ahorros', 'corriente', 'tarjeta_credito', 'billetera', 'efectivo', 'otra'];
const limiteContrasena = crearLimitador({ maximo: 5, ventanaMin: 15 });
const limiteImportar = crearLimitador({ maximo: 20, ventanaMin: 15 });
const TOPE_PESOS = 10_000_000_000; // 10.000 millones: el mismo tope que usan cuentas y deudas
const MAX_METAS = 30;

const hoyISO = () => new Date().toISOString().slice(0, 10);
const mesActual = () => hoyISO().slice(0, 7);
const esMes = (m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m || '');
const finDeMes = (mes) => {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
};

function fechaValida(f) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f || '')) return false;
  const d = new Date(f + 'T00:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== f) return false;
  const hace5anios = new Date(); hace5anios.setUTCFullYear(hace5anios.getUTCFullYear() - 5);
  const manana = new Date(Date.now() + 86_400_000);
  return d >= hace5anios && d <= manana;
}
const textoLimpio = (t, max) => (typeof t === 'string' ? t.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');

function descifrarMovimientos(filas) {
  return filas.map(({ descripcion_cifrada, ...m }) => {
    let descripcion;
    try { descripcion = descifrar(descripcion_cifrada); } catch { descripcion = '(no se pudo leer)'; }
    return { ...m, descripcion };
  });
}

// ------------------------------- RESUMEN -------------------------------

async function resumen(req, res, params, url) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario) return;
  const meses = await fdb.mesesConDatos(usuario.id);
  let mes = url.searchParams.get('mes');
  if (!esMes(mes)) {
    // Por defecto: el mes en curso. Pero en los primeros días del mes (cuando casi
    // no hay movimientos ni ha llegado el sueldo) se muestra el mes anterior completo.
    const anterior = mesesAtras(mesActual(), 2)[0];
    const dia = Number(hoyISO().slice(8, 10));
    if (dia < 10 && meses.includes(anterior)) mes = anterior;
    else mes = meses.includes(mesActual()) ? mesActual() : (meses[0] || mesActual());
  }

  const ventana = mesesAtras(mes, 6);
  const movimientos = descifrarMovimientos(await fdb.listarMovimientos(usuario.id, { desde: ventana[0] + '-01', hasta: finDeMes(mes) }));
  const cuentas = await fdb.listarCuentas(usuario.id);
  const conexiones = (await fdb.listarConexiones(usuario.id)).map((c) => ({ ...c, banco: openfinance.nombreBanco(c.institucion) }));

  const presupuestos = await presupuestosDelMes(usuario.id, mes);

  enviarJson(res, 200, {
    ok: true,
    usuario: { nombre: usuario.nombre.split(' ')[0] },
    mesesDisponibles: meses,
    cuentas,
    conexiones,
    ...calcularResumen({ movimientos, cuentas, mes, presupuestos }),
  });
}

// ----------------------------- MOVIMIENTOS -----------------------------

async function listarMovimientos(req, res, params, url) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario) return;
  const mes = url.searchParams.get('mes');
  const cuentaId = Number(url.searchParams.get('cuenta')) || null;
  const filtro = esMes(mes) ? { desde: mes + '-01', hasta: finDeMes(mes), cuentaId } : { cuentaId };
  const movimientos = descifrarMovimientos(await fdb.listarMovimientos(usuario.id, filtro));
  enviarJson(res, 200, { ok: true, movimientos, categorias: { ingresos: INGRESOS, gastos: GASTOS, neutra: NEUTRA } });
}

// Si el usuario no tiene cuentas manuales, se crea "Efectivo y otros" automáticamente
async function cuentaManualPorDefecto(usuarioId) {
  const manual = (await fdb.listarCuentas(usuarioId)).find((c) => c.origen === 'manual');
  if (manual) return manual.id;
  const id = await fdb.crearCuentaManual({ usuarioId, nombre: 'Efectivo y otros', tipo: 'efectivo', saldoInicial: 0 });
  await auditoria.registrar(usuarioId, 'cuenta_manual_creada', 'Efectivo y otros');
  return id;
}

async function crearMovimiento(req, res) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario) return;
  const b = await leerJson(req);
  const descripcion = textoLimpio(b.descripcion, 120);
  const valor = Math.abs(Number(b.valor));
  if (!fechaValida(b.fecha)) return enviarJson(res, 400, { ok: false, error: 'Escribe una fecha válida (de los últimos 5 años).' });
  if (!descripcion) return enviarJson(res, 400, { ok: false, error: 'Escribe una descripción.' });
  if (!Number.isFinite(valor) || valor <= 0 || valor > 10_000_000_000) return enviarJson(res, 400, { ok: false, error: 'Escribe un valor mayor que cero.' });
  if (!['ingreso', 'gasto'].includes(b.tipo)) return enviarJson(res, 400, { ok: false, error: 'Indica si es ingreso o gasto.' });

  const monto = b.tipo === 'ingreso' ? valor : -valor;
  let categoria = b.categoria && TODAS.includes(b.categoria) ? b.categoria : categorizar(descripcion, monto);
  if (b.tipo === 'ingreso' && GASTOS.includes(categoria)) categoria = 'Otros ingresos';
  if (b.tipo === 'gasto' && INGRESOS.includes(categoria)) categoria = 'Otros gastos';

  let cuentaId = Number(b.cuentaId) || null;
  if (cuentaId) {
    const cuenta = await fdb.obtenerCuenta(usuario.id, cuentaId);
    if (!cuenta || cuenta.origen !== 'manual') return enviarJson(res, 400, { ok: false, error: 'Solo puedes registrar movimientos en tus cuentas manuales.' });
  } else {
    cuentaId = await cuentaManualPorDefecto(usuario.id);
  }

  await fdb.insertarMovimientos(usuario.id, cuentaId, 'manual', [{
    id_externo: 'man-' + crypto.randomUUID(), fecha: b.fecha, monto, descripcion_cifrada: cifrar(descripcion), categoria,
  }]);
  await auditoria.registrar(usuario.id, 'movimiento_manual', `${b.tipo} · ${b.fecha}`);
  enviarJson(res, 201, { ok: true, categoria });
}

async function actualizarMovimiento(req, res, params) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario) return;
  const b = await leerJson(req);
  if (!TODAS.includes(b.categoria)) return enviarJson(res, 400, { ok: false, error: 'Categoría no válida.' });
  const ok = await fdb.cambiarCategoria(usuario.id, Number(params.id), b.categoria);
  enviarJson(res, ok ? 200 : 404, ok ? { ok: true } : { ok: false, error: 'Movimiento no encontrado.' });
}

async function eliminarMovimiento(req, res, params) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario) return;
  const ok = await fdb.eliminarMovimiento(usuario.id, Number(params.id));
  enviarJson(res, ok ? 200 : 404, ok ? { ok: true } : { ok: false, error: 'Solo puedes borrar movimientos que registraste o importaste tú.' });
}

// ------------------------------- CUENTAS -------------------------------

async function listarCuentas(req, res) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario) return;
  const cuentas = await fdb.listarCuentas(usuario.id);
  const conexiones = (await fdb.listarConexiones(usuario.id)).map((c) => ({ ...c, banco: openfinance.nombreBanco(c.institucion) }));
  enviarJson(res, 200, { ok: true, cuentas, conexiones, tipos: TIPOS_CUENTA });
}

async function crearCuenta(req, res) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario) return;
  const b = await leerJson(req);
  const nombre = textoLimpio(b.nombre, 60);
  const saldoInicial = Number(b.saldoInicial || 0);
  if (nombre.length < 2) return enviarJson(res, 400, { ok: false, error: 'Ponle un nombre a la cuenta.' });
  if (!TIPOS_CUENTA.includes(b.tipo)) return enviarJson(res, 400, { ok: false, error: 'Elige el tipo de cuenta.' });
  if (!Number.isFinite(saldoInicial) || Math.abs(saldoInicial) > 10_000_000_000) return enviarJson(res, 400, { ok: false, error: 'Saldo inicial no válido.' });
  const id = await fdb.crearCuentaManual({ usuarioId: usuario.id, nombre, tipo: b.tipo, saldoInicial });
  await auditoria.registrar(usuario.id, 'cuenta_manual_creada', nombre);
  enviarJson(res, 201, { ok: true, id });
}

async function eliminarCuenta(req, res, params) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario) return;
  const ok = await fdb.eliminarCuentaManual(usuario.id, Number(params.id));
  if (ok) await auditoria.registrar(usuario.id, 'cuenta_manual_eliminada', `cuenta ${params.id}`);
  enviarJson(res, ok ? 200 : 404, ok ? { ok: true }
    : { ok: false, error: 'Solo se pueden borrar cuentas manuales. Para un banco conectado, revoca la autorización.' });
}

// ------------------------------- IMPORTAR ------------------------------
// La página lee el CSV en el navegador y envía solo fecha, descripción y valor.

async function importar(req, res) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario) return;
  const espera = limiteImportar(String(usuario.id));
  if (espera) return enviarJson(res, 429, { ok: false, error: `Demasiadas importaciones. Espera ${espera} min.` });

  const b = await leerJson(req, 1024 * 1024); // hasta 1 MB
  if (!Array.isArray(b.filas) || b.filas.length === 0) return enviarJson(res, 400, { ok: false, error: 'El archivo no tiene filas para importar.' });
  if (b.filas.length > 3000) return enviarJson(res, 400, { ok: false, error: 'Máximo 3.000 movimientos por archivo.' });

  let cuentaId = Number(b.cuentaId) || null;
  if (cuentaId) {
    const cuenta = await fdb.obtenerCuenta(usuario.id, cuentaId);
    if (!cuenta || cuenta.origen !== 'manual') return enviarJson(res, 400, { ok: false, error: 'Elige una de tus cuentas manuales.' });
  } else {
    const nombre = textoLimpio(b.nombreCuentaNueva, 60) || 'Cuenta importada';
    const tipo = TIPOS_CUENTA.includes(b.tipoCuentaNueva) ? b.tipoCuentaNueva : 'ahorros';
    cuentaId = await fdb.crearCuentaManual({ usuarioId: usuario.id, nombre, tipo, saldoInicial: 0 });
    await auditoria.registrar(usuario.id, 'cuenta_manual_creada', nombre);
  }

  const validas = [];
  let invalidas = 0;
  const vistas = {};
  for (const f of b.filas) {
    const descripcion = textoLimpio(f && f.descripcion, 120);
    const monto = Math.round(Number(f && f.monto) * 100) / 100;
    if (!f || !fechaValida(f.fecha) || !descripcion || !Number.isFinite(monto) || monto === 0 || Math.abs(monto) > 10_000_000_000) {
      invalidas++;
      continue;
    }
    // Identificador estable: importar el mismo extracto dos veces no duplica
    const base = `${f.fecha}|${descripcion}|${monto}`;
    vistas[base] = (vistas[base] || 0) + 1;
    const idExterno = 'csv-' + crypto.createHash('sha256').update(`${base}|${vistas[base]}`).digest('hex').slice(0, 32);
    validas.push({ id_externo: idExterno, fecha: f.fecha, monto, descripcion_cifrada: cifrar(descripcion), categoria: categorizar(descripcion, monto) });
  }
  const nuevos = await fdb.insertarMovimientos(usuario.id, cuentaId, 'extracto', validas);
  await auditoria.registrar(usuario.id, 'extracto_importado', `${nuevos} movimientos`);
  enviarJson(res, 201, { ok: true, cuentaId, importados: nuevos, duplicados: validas.length - nuevos, invalidas });
}

// ----------------------------- PRESUPUESTOS -----------------------------
// Un presupuesto es un límite mensual de gasto para UNA categoría de gasto. Se crea en
// un mes y sigue valiendo los siguientes hasta que se borre. Lo gastado no se guarda:
// se calcula con los movimientos del mes que se pide.

// Revisa un valor en pesos. Devuelve el número entero o null si no sirve.
function validarPesos(valor) {
  if (valor === '' || valor === null || valor === undefined || typeof valor === 'boolean') return null;
  const n = Math.round(Number(valor));
  return Number.isFinite(n) && n > 0 && n < TOPE_PESOS ? n : null;
}
const ERROR_LIMITE = 'Escribe un límite mayor que cero y menor que 10.000 millones.';

async function presupuestosDelMes(usuarioId, mes) {
  const filas = await fdb.listarPresupuestosVigentes(usuarioId, mes, mes + '-01', finDeMes(mes));
  return filas.map((p) => ({ id: p.id, categoria: p.categoria, limite: p.limite, ...estadoPresupuesto(p.gastado, p.limite) }));
}

async function listarPresupuestos(req, res, params, url) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario) return;
  // Sin ?mes= (o con uno mal escrito) se usa el mes en curso
  const pedido = url.searchParams.get('mes');
  const mes = esMes(pedido) ? pedido : mesActual();
  const presupuestos = await presupuestosDelMes(usuario.id, mes);
  // categoriasDisponibles: las de gasto que todavía no tienen presupuesto (para el selector del panel)
  const usadas = new Set(presupuestos.map((p) => p.categoria));
  enviarJson(res, 200, { ok: true, mes, presupuestos, categoriasDisponibles: GASTOS.filter((c) => !usadas.has(c)) });
}

async function crearPresupuesto(req, res) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario) return;
  const b = await leerJson(req);
  // Solo categorías de GASTO: no tiene sentido un "límite" para el salario
  if (!GASTOS.includes(b.categoria)) return enviarJson(res, 400, { ok: false, error: 'Elige una categoría de gasto.' });
  const limite = validarPesos(b.limite);
  if (limite === null) return enviarJson(res, 400, { ok: false, error: ERROR_LIMITE });

  // Una categoría, un presupuesto: si ya hay uno vigente, se edita (409 = ya existe)
  const mes = mesActual();
  const vigentes = await fdb.listarPresupuestosVigentes(usuario.id, mes, mes + '-01', finDeMes(mes));
  if (vigentes.some((p) => p.categoria === b.categoria)) {
    return enviarJson(res, 409, { ok: false, error: `Ya tienes un presupuesto para "${b.categoria}". Cambia su límite en vez de crear otro.` });
  }
  const id = await fdb.insertarPresupuesto(usuario.id, mes, b.categoria, limite);
  if (!id) return enviarJson(res, 409, { ok: false, error: `Ya tienes un presupuesto para "${b.categoria}". Cambia su límite en vez de crear otro.` });
  await auditoria.registrar(usuario.id, 'presupuesto_creado', `${b.categoria}: límite ${limite}`);
  enviarJson(res, 201, { ok: true, id });
}

async function actualizarPresupuesto(req, res, params) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario) return;
  const limite = validarPesos((await leerJson(req)).limite);
  if (limite === null) return enviarJson(res, 400, { ok: false, error: ERROR_LIMITE });
  // La consulta filtra por usuario_id: si el id es de otra persona, no cambia nada y responde 404
  const ok = await fdb.actualizarPresupuesto(usuario.id, Number(params.id), limite);
  if (!ok) return enviarJson(res, 404, { ok: false, error: 'Presupuesto no encontrado.' });
  await auditoria.registrar(usuario.id, 'presupuesto_actualizado', `presupuesto ${params.id}: límite ${limite}`);
  enviarJson(res, 200, { ok: true });
}

async function eliminarPresupuesto(req, res, params) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario) return;
  const p = await fdb.obtenerPresupuesto(usuario.id, Number(params.id));
  if (!p) return enviarJson(res, 404, { ok: false, error: 'Presupuesto no encontrado.' });
  await fdb.eliminarPresupuestoCategoria(usuario.id, p.categoria);
  await auditoria.registrar(usuario.id, 'presupuesto_eliminado', p.categoria);
  enviarJson(res, 200, { ok: true });
}

// -------------------------------- METAS ---------------------------------
// Una meta de ahorro: nombre, objetivo en pesos y, si la persona quiere, una fecha límite.
// El nombre se guarda cifrado (puede decir algo personal, ej. "Pagar el abogado").
const MAX_NOMBRE_META = 60;
const MESES_SIN_FECHA = 12; // fecha de referencia que se guarda en "plazo" cuando no eligen una

function metaParaRespuesta(m) {
  let nombre = m.nombre; // metas de los datos de demo: nombre en claro
  if (m.nombre_cifrado) {
    try { nombre = descifrar(m.nombre_cifrado); } catch { nombre = '(no se pudo leer)'; }
  }
  const plazo = m.sin_fecha ? null : m.plazo;
  const estado = estadoMeta({ objetivo: m.objetivo, aportado: m.aportado, plazo });
  return { id: m.id, nombre, objetivo: m.objetivo, fechaLimite: plazo, ...estado };
}

async function listarMetas(req, res) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario) return;
  enviarJson(res, 200, { ok: true, metas: (await fdb.listarMetas(usuario.id)).map(metaParaRespuesta) });
}

async function crearMeta(req, res) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario) return;
  const b = await leerJson(req);
  const nombre = textoLimpio(b.nombre, 200);
  if (!nombre) return enviarJson(res, 400, { ok: false, error: 'Ponle un nombre a la meta.' });
  if (nombre.length > MAX_NOMBRE_META) return enviarJson(res, 400, { ok: false, error: `El nombre puede tener máximo ${MAX_NOMBRE_META} caracteres.` });
  const objetivo = validarPesos(b.objetivo);
  if (objetivo === null) return enviarJson(res, 400, { ok: false, error: 'El objetivo debe ser mayor que cero y menor que 10.000 millones.' });

  // La fecha límite es opcional. Sin ella no hay aporte mensual sugerido.
  const sinFecha = b.fechaLimite === undefined || b.fechaLimite === null || b.fechaLimite === '';
  const fecha = sinFecha ? enMeses(MESES_SIN_FECHA) : String(b.fechaLimite);
  if (!sinFecha && !fechaFutura(fecha)) return enviarJson(res, 400, { ok: false, error: 'La fecha límite debe ser desde hoy y hasta dentro de 30 años.' });
  if (await fdb.contarMetas(usuario.id) >= MAX_METAS) return enviarJson(res, 400, { ok: false, error: `Puedes tener máximo ${MAX_METAS} metas.` });

  const id = await fdb.crearMeta({ usuarioId: usuario.id, nombreCifrado: cifrar(nombre), objetivo, plazo: fecha, sinFecha });
  await auditoria.registrar(usuario.id, 'meta_creada', `meta ${id}: objetivo ${objetivo}`);
  enviarJson(res, 201, { ok: true, id });
}

// Fecha (YYYY-MM-DD) dentro de n meses
function enMeses(n) {
  const d = new Date(); d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

// Fecha YYYY-MM-DD real, desde hoy y hasta 30 años
function fechaFutura(f) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return false;
  const d = new Date(f + 'T00:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== f) return false;
  const tope = new Date(); tope.setUTCFullYear(tope.getUTCFullYear() + 30);
  return f >= hoyISO() && d <= tope;
}

async function aportarMeta(req, res, params) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario) return;
  const b = await leerJson(req);
  const valor = typeof b.valor === 'boolean' || b.valor === '' || b.valor === null ? NaN : Math.round(Number(b.valor));
  if (!Number.isFinite(valor) || valor === 0 || Math.abs(valor) >= TOPE_PESOS) {
    return enviarJson(res, 400, { ok: false, error: 'Escribe un valor distinto de cero (negativo para retirar).' });
  }
  const fecha = b.fecha === undefined || b.fecha === null || b.fecha === '' ? hoyISO() : b.fecha;
  if (!fechaValida(fecha)) return enviarJson(res, 400, { ok: false, error: 'La fecha no es válida (no puede ser futura).' });

  const meta = await fdb.obtenerMeta(usuario.id, Number(params.id));
  if (!meta) return enviarJson(res, 404, { ok: false, error: 'Meta no encontrada.' });
  const ahorrado = Math.max(0, meta.aportado);
  // Un retiro no puede dejar la meta en negativo
  if (valor < 0 && -valor > ahorrado) {
    return enviarJson(res, 400, { ok: false, error: `Solo puedes retirar hasta ${pesosTexto(ahorrado)}.` });
  }
  const tipo = valor > 0 ? 'aporte' : 'retiro';
  const id = await fdb.aportarMeta(usuario.id, meta.id, Math.abs(valor), { tipo, fecha });
  if (!id) return enviarJson(res, 404, { ok: false, error: 'Meta no encontrada.' });
  await auditoria.registrar(usuario.id, 'aporte_meta', `meta ${meta.id}: ${tipo} de ${Math.abs(valor)}`);
  enviarJson(res, 201, { ok: true, ahorrado: ahorrado + valor });
}
const pesosTexto = (v) => '$' + Math.round(v).toLocaleString('es-CO');

async function eliminarMeta(req, res, params) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario) return;
  const ok = await fdb.eliminarMeta(usuario.id, Number(params.id)); // sus aportes se borran en cascada
  if (!ok) return enviarJson(res, 404, { ok: false, error: 'Meta no encontrada.' });
  await auditoria.registrar(usuario.id, 'meta_eliminada', `meta ${params.id}`);
  enviarJson(res, 200, { ok: true });
}

// ------------------------------ PRIVACIDAD -----------------------------

async function privacidad(req, res) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario) return;
  const consentimientos = (await fdb.listarConsentimientos(usuario.id)).map((c) => ({
    ...c,
    banco: openfinance.nombreBanco(c.institucion),
    estado: c.estado === 'activo' && new Date(c.expira_en) < new Date() ? 'vencido' : c.estado,
  }));
  enviarJson(res, 200, { ok: true, consentimientos, historial: await auditoria.listar(usuario.id, 60), textoConsentimiento: openfinance.textoConsentimiento() });
}

async function exportar(req, res) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario) return;
  const perfil = await db.buscarUsuarioCompleto(usuario.id);
  delete perfil.password_hash; // nunca se exporta (ni siquiera cifrada)
  const datos = {
    generado_en: new Date().toISOString(),
    nota: 'Copia de todos los datos que Auto-Wealth tiene sobre ti (Ley 1581 de 2012, derecho de acceso).',
    perfil,
    autorizaciones: await fdb.listarConsentimientos(usuario.id),
    cuentas: await fdb.listarCuentas(usuario.id),
    movimientos: descifrarMovimientos(await fdb.listarMovimientos(usuario.id)),
    deudas: (await fdb.listarDeudas(usuario.id)).map(deudaParaRespuesta),
    pagos_e_inversiones: await fdb.listarRedirecciones(usuario.id),
    presupuestos: (await fdb.listarPresupuestosVigentes(usuario.id, mesActual(), mesActual() + '-01', finDeMes(mesActual())))
      .map(({ id, categoria, limite }) => ({ id, categoria, limite })),
    metas: (await fdb.listarMetas(usuario.id)).map(metaParaRespuesta),
    historial: await auditoria.listar(usuario.id, 1000),
  };
  await auditoria.registrar(usuario.id, 'datos_exportados', '');
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="mis-datos-autowealth-${hoyISO()}.json"`,
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(datos, null, 2));
}

// Las acciones irreversibles piden la contraseña otra vez
async function confirmarContrasena(req, res, usuario) {
  const espera = limiteContrasena(String(usuario.id));
  if (espera) { enviarJson(res, 429, { ok: false, error: `Demasiados intentos. Espera ${espera} min.` }); return false; }
  const b = await leerJson(req);
  const completo = await db.buscarUsuarioCompleto(usuario.id);
  const ok = typeof b.password === 'string' && await verificarContrasena(b.password, completo.password_hash);
  if (!ok) enviarJson(res, 401, { ok: false, error: 'La contraseña no es correcta.' });
  return ok;
}

async function borrarFinanzas(req, res) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario || !(await confirmarContrasena(req, res, usuario))) return;
  await openfinance.revocarTodas(usuario.id);
  await fdb.borrarFinanzas(usuario.id);
  await auditoria.registrar(usuario.id, 'finanzas_borradas', '');
  enviarJson(res, 200, { ok: true });
}

async function eliminarCuentaUsuario(req, res) {
  const usuario = await exigirUsuario(req, res);
  if (!usuario || !(await confirmarContrasena(req, res, usuario))) return;
  await openfinance.revocarTodas(usuario.id);
  await db.eliminarUsuario(usuario.id); // borra en cascada todo lo relacionado
  console.log(`🗑️  Cuenta eliminada a petición del usuario (id ${usuario.id})`);
  enviarJson(res, 200, { ok: true }, { 'Set-Cookie': cookieCerrarSesion() });
}

module.exports = {
  resumen, listarMovimientos, crearMovimiento, actualizarMovimiento, eliminarMovimiento,
  listarCuentas, crearCuenta, eliminarCuenta, importar,
  privacidad, exportar, borrarFinanzas, eliminarCuentaUsuario,
  listarPresupuestos, crearPresupuesto, actualizarPresupuesto, eliminarPresupuesto,
  listarMetas, crearMeta, aportarMeta, eliminarMeta,
};
