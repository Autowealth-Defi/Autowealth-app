// =====================================================================
//  scripts/seed-demo.js — Datos de demostración para la presentación.
//  Crea un usuario demo con 3 meses de movimientos, deudas,
//  presupuestos y una meta.
//
//  Uso:  node scripts/seed-demo.js
//
//  Es idempotente: si ya existe el usuario demo, borra sus datos y
//  los vuelve a crear. Nunca toca datos de otros usuarios.
// =====================================================================
'use strict';

const path = require('node:path');
const { Pool } = require('pg');

// Carga el .env desde la raíz del proyecto
const envPath = path.join(__dirname, '..', '.env');
require('node:fs').existsSync(envPath) && process.loadEnvFile(envPath);

const { cifrar } = require('../src/cifrado');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

const DEMO_EMAIL = 'demo@auto-wealth.app';

// Genera una fecha en los últimos 3 meses
function fechaAleatoria(diasAtras) {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Buscar o crear el usuario demo ──────────────────────────
    let { rows } = await client.query(
      'SELECT id FROM usuarios WHERE email = $1', [DEMO_EMAIL]
    );

    let usuarioId;
    if (rows.length) {
      usuarioId = rows[0].id;
      console.log(`Usuario demo encontrado (id=${usuarioId}). Limpiando datos anteriores...`);

      // Borra en orden para respetar las llaves foráneas
      await client.query('DELETE FROM aportes_meta       WHERE usuario_id = $1', [usuarioId]);
      await client.query('DELETE FROM metas              WHERE usuario_id = $1', [usuarioId]);
      await client.query('DELETE FROM presupuestos       WHERE usuario_id = $1', [usuarioId]);
      await client.query('DELETE FROM redirecciones      WHERE usuario_id = $1', [usuarioId]);
      await client.query('DELETE FROM deudas             WHERE usuario_id = $1', [usuarioId]);
      await client.query('DELETE FROM movimientos        WHERE usuario_id = $1', [usuarioId]);
      await client.query('DELETE FROM cuentas            WHERE usuario_id = $1', [usuarioId]);
      await client.query('DELETE FROM conexiones         WHERE usuario_id = $1', [usuarioId]);
      await client.query(
        `UPDATE consentimientos SET estado = 'revocado', revocado_en = now()
          WHERE usuario_id = $1 AND estado IN ('activo','pendiente')`, [usuarioId]);
      await client.query('DELETE FROM auditoria          WHERE usuario_id = $1', [usuarioId]);
    } else {
      // Contraseña fija para demo: "Demo1234!" (bcrypt generado de antemano)
      const HASH = '$2b$10$rOTIaFBMmHATkB1yDpESx.tOi4FMF3H3tIFwkCMHPjr4hzJeWuq2K';
      const { rows: nuevo } = await client.query(
        `INSERT INTO usuarios
           (nombre, email, telefono, cedula, password_hash, acepta_datos, acepta_datos_en)
         VALUES ('Usuario Demo','${DEMO_EMAIL}','3001234567','1000000000',$1,true,now())
         RETURNING id`,
        [HASH]
      );
      usuarioId = nuevo[0].id;
      console.log(`Usuario demo creado (id=${usuarioId}).`);
    }

    // ── 2. Cuenta manual ───────────────────────────────────────────
    const { rows: cuentaRows } = await client.query(
      `INSERT INTO cuentas (usuario_id, origen, nombre, tipo, saldo)
       VALUES ($1, 'manual', 'Cuenta principal', 'ahorros', 0)
       RETURNING id`,
      [usuarioId]
    );
    const cuentaId = cuentaRows[0].id;

    // ── 3. Movimientos — 3 meses (90 días) ────────────────────────
    const movimientos = [
      // Ingresos
      { dias: 85, desc: 'Salario agosto',      monto:  3_200_000, cat: 'ingresos' },
      { dias: 55, desc: 'Salario septiembre',  monto:  3_200_000, cat: 'ingresos' },
      { dias: 25, desc: 'Salario octubre',     monto:  3_200_000, cat: 'ingresos' },
      { dias: 20, desc: 'Freelance diseño',    monto:    450_000, cat: 'ingresos' },
      // Gastos
      { dias: 83, desc: 'Arriendo agosto',     monto:   -800_000, cat: 'vivienda' },
      { dias: 53, desc: 'Arriendo septiembre', monto:   -800_000, cat: 'vivienda' },
      { dias: 23, desc: 'Arriendo octubre',    monto:   -800_000, cat: 'vivienda' },
      { dias: 80, desc: 'Supermercado',        monto:   -210_000, cat: 'alimentacion' },
      { dias: 60, desc: 'Supermercado',        monto:   -195_000, cat: 'alimentacion' },
      { dias: 40, desc: 'Supermercado',        monto:   -225_000, cat: 'alimentacion' },
      { dias: 15, desc: 'Supermercado',        monto:   -180_000, cat: 'alimentacion' },
      { dias: 78, desc: 'Restaurante',         monto:    -45_000, cat: 'alimentacion' },
      { dias: 50, desc: 'Restaurante',         monto:    -38_000, cat: 'alimentacion' },
      { dias: 22, desc: 'Restaurante',         monto:    -52_000, cat: 'alimentacion' },
      { dias: 75, desc: 'Internet y celular',  monto:    -89_000, cat: 'servicios' },
      { dias: 45, desc: 'Internet y celular',  monto:    -89_000, cat: 'servicios' },
      { dias: 10, desc: 'Internet y celular',  monto:    -89_000, cat: 'servicios' },
      { dias: 70, desc: 'Transporte',          monto:    -95_000, cat: 'transporte' },
      { dias: 40, desc: 'Transporte',          monto:   -102_000, cat: 'transporte' },
      { dias: 12, desc: 'Transporte',          monto:    -98_000, cat: 'transporte' },
      { dias: 65, desc: 'Farmacia',            monto:    -32_000, cat: 'salud' },
      { dias: 30, desc: 'Entretenimiento',     monto:    -60_000, cat: 'ocio' },
      { dias: 8,  desc: 'Ropa',                monto:   -150_000, cat: 'otros' },
    ];

    for (const m of movimientos) {
      await client.query(
        `INSERT INTO movimientos
           (usuario_id, cuenta_id, origen, id_externo, fecha, descripcion_cifrada, monto, categoria)
         VALUES ($1, $2, 'manual', $3, $4, $5, $6, $7)
         ON CONFLICT (cuenta_id, id_externo) DO NOTHING`,
        [
          usuarioId, cuentaId,
          `demo-mov-${m.dias}-${m.cat}`,   // id_externo único y estable
          fechaAleatoria(m.dias),
          cifrar(m.desc),
          m.monto,
          m.cat,
        ]
      );
    }

    // ── 4. Deudas ─────────────────────────────────────────────────
    const deudas = [
      { nombre: 'Crédito libre inversión Bancolombia', tipo: 'libre_inversion', saldo: 8_500_000, tasa: 24.5, cuota: 320_000, dia: 5  },
      { nombre: 'Tarjeta de crédito Visa',             tipo: 'tarjeta_credito', saldo: 2_300_000, tasa: 28.8, cuota: 115_000, dia: 15 },
    ];

    for (const d of deudas) {
      await client.query(
        `INSERT INTO deudas (usuario_id, nombre_cifrado, tipo, saldo, tasa_ea, cuota_minima, dia_pago)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [usuarioId, cifrar(d.nombre), d.tipo, d.saldo, d.tasa, d.cuota, d.dia]
      );
    }

    // ── 5. Presupuestos (mes actual) ──────────────────────────────
    const mesActual = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const presupuestos = [
      { categoria: 'alimentacion', limite: 500_000 },
      { categoria: 'vivienda',     limite: 850_000 },
      { categoria: 'transporte',   limite: 120_000 },
      { categoria: 'servicios',    limite: 100_000 },
      { categoria: 'ocio',         limite:  80_000 },
    ];

    for (const p of presupuestos) {
      await client.query(
        `INSERT INTO presupuestos (usuario_id, mes, categoria, limite)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (usuario_id, mes, categoria) DO UPDATE SET limite = EXCLUDED.limite`,
        [usuarioId, mesActual, p.categoria, p.limite]
      );
    }

    // ── 6. Meta de ahorro ─────────────────────────────────────────
    const { rows: metaRows } = await client.query(
      `INSERT INTO metas (usuario_id, nombre, objetivo, plazo)
       VALUES ($1, 'Viaje a Cartagena', 2000000, now() + interval '6 months')
       RETURNING id`,
      [usuarioId]
    );
    const metaId = metaRows[0].id;

    // Tres aportes anteriores a la meta
    for (const [dias, monto] of [[70, 300_000], [40, 250_000], [10, 200_000]]) {
      await client.query(
        `INSERT INTO aportes_meta (usuario_id, meta_id, monto, nota, creado_en)
         VALUES ($1, $2, $3, 'Aporte demo', now() - ($4 || ' days')::interval)`,
        [usuarioId, metaId, monto, dias]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Datos de demo cargados correctamente.');
    console.log(`   Email:      ${DEMO_EMAIL}`);
    console.log('   Contraseña: Demo1234!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error al cargar datos de demo:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();