// =====================================================================
//  scripts/metricas.js — Métricas de uso para la presentación.
//  Sin datos personales: solo conteos.
//
//  Uso:  node scripts/metricas.js
// =====================================================================
'use strict';

const path = require('node:path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '..', '.env');
require('node:fs').existsSync(envPath) && process.loadEnvFile(envPath);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

async function main() {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*)                FROM usuarios)             AS usuarios_registrados,
      (SELECT COUNT(*)                FROM conexiones
        WHERE estado = 'activa')                                 AS bancos_conectados,
      (SELECT COUNT(DISTINCT usuario_id) FROM conexiones
        WHERE estado = 'activa')                                 AS usuarios_con_banco,
      (SELECT COUNT(*)                FROM movimientos)          AS movimientos_totales,
      (SELECT COUNT(DISTINCT usuario_id) FROM movimientos)       AS usuarios_con_movimientos
  `);

  const m = rows[0];
  console.log('\n📊 Métricas de uso (sin datos personales)\n');
  console.log(`   Usuarios registrados         : ${m.usuarios_registrados}`);
  console.log(`   Bancos conectados (activos)  : ${m.bancos_conectados}`);
  console.log(`   Usuarios con banco conectado : ${m.usuarios_con_banco}`);
  console.log(`   Movimientos registrados      : ${m.movimientos_totales}`);
  console.log(`   Usuarios con movimientos     : ${m.usuarios_con_movimientos}`);
  console.log('');

  await pool.end();
}

main().catch((err) => { console.error(err.message); process.exit(1); });

// =====================================================================
// Para correr metricas.js y seed-demo.js: 
// node scripts/seed-demo.js    # carga los datos de demo
//node scripts/metricas.js     # muestra las métricas