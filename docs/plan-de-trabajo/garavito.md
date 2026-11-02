# Plan de Garavito · Base de datos

**Tu área:** dónde y cómo se guarda la información: estructura de las tablas, consultas, datos de demostración y copias de seguridad.
**Tus archivos:** `src/schema.sql`, `src/db.js`, `src/finanzas/db.js`, `src/auditoria.js`, `src/admin.js`, `scripts/` (nueva) y `docs/base-de-datos.md`.
**Trabajas de cerca con:** Juanes (sus rutas llaman a tus funciones) y Samu (copias de seguridad y entornos).

> Reglas de tu área: **siempre `$1, $2…`**, **siempre filtrar por `usuario_id`**, y `schema.sql` **solo agrega** (nunca borra ni renombra). Ver [base-de-datos.md](../base-de-datos.md#reglas-para-escribir-consultas).

> **Actualizado el 2 de noviembre.** La presentación final es el **viernes 20 de noviembre**. Calendario y prioridades del equipo en [README.md](README.md). Eres el primer eslabón: **Juanes no puede terminar sus rutas sin tus tablas**, así que tu Semana A empieza el mismo martes 3.

---

## Antes de seguir · Revisa que esto ya esté hecho (mar 3)

- [ ] Existen las ramas de Neon `dev-juanes`, `dev-garavito`, `dev-aleja`, `dev-david`, `dev-samu` y `pruebas`, y cada persona recibió **por mensaje privado** su *Connection string*.
- [ ] Los 5 confirmaron que su app arranca con su propia rama.
- [ ] El diseño de las tablas nuevas ([base-de-datos.md](../base-de-datos.md#tablas-planeadas-para-este-mes)) está aprobado por Juanes y sin la marca "Propuesta". Si no, ciérralo con él el **martes 3**.

---

## Semana A · Tablas y consultas (3–6 nov)

### Sesión 1 · Tablas nuevas (martes 3 o miércoles 4)
- [ ] Rama `feature/garavito-tablas`.
- [ ] Agrega al **final** de `src/schema.sql`, con comentarios como las demás: `presupuestos`, `metas`, `aportes_meta` (con índice por `meta_id`), `tokens_recuperacion` y la columna `usuarios.version_sesion` (`ADD COLUMN IF NOT EXISTS`).
- [ ] Reinicia la app con tu rama: las tablas deben crearse solas. Reinicia otra vez: no debe fallar (prueba de que es repetible).
- [ ] Actualiza el diagrama de `docs/base-de-datos.md`.
- [ ] Abre el PR **a más tardar el miércoles 4** y pide revisión a Juanes.

### Sesión 2 · Consultas de presupuestos y metas
- [ ] En `src/finanzas/db.js` agrega: `listarPresupuestos`, `crearPresupuesto` (409 si se repite: deja que Postgres lance el error `23505`), `actualizarPresupuesto`, `eliminarPresupuesto`, `gastadoPorCategoria(usuarioId, mes)`, `listarMetas` (con `ahorrado` = suma de aportes), `crearMeta`, `agregarAporte` y `eliminarMeta`.
- [ ] **Todas** filtran por `usuario_id`.
- [ ] En `src/auditoria.js` agrega las acciones nuevas (`presupuesto_creado`, `meta_creada`, `aporte_meta`, `contrasena_recuperada`…) con su texto para el usuario.
- [ ] En `borrarFinanzas` (`src/finanzas/db.js`), borra también presupuestos y metas.

**Pídele a Claude:** *"Agrega a src/finanzas/db.js las funciones de presupuestos y metas siguiendo el estilo de las existentes: consultas parametrizadas, filtro por usuario_id, números con ::float8 y fechas con to_char."*

### Sesión 3 · Consultas de recuperación de contraseña (viernes 6)
- [ ] En `src/db.js`: `crearTokenRecuperacion(usuarioId, tokenHash, minutos)`, `buscarTokenRecuperacion(tokenHash)` (solo si no está usado ni vencido), `marcarTokenUsado(id)`, `cambiarContrasena(usuarioId, hash)` (que también suma 1 a `version_sesion`) y `versionSesion(usuarioId)`.
- [ ] Al crear un token nuevo, invalida los anteriores de ese usuario.
- [ ] Prueba cada función en el SQL Editor de Neon con datos de tu rama.

**Listo cuando:** tablas y consultas en `main`, y Juanes ya usa tus funciones. ← **Hito A**

---

## Semana B · Datos de demostración y métricas (9–13 nov)

### Sesión 1 · Script de datos de demostración
- [ ] Crea `scripts/datos-demo.js`: contra la base de datos que digas, crea usuarios de demostración (por ejemplo `demo1@autowealth.co` con contraseña conocida) con 3 meses de movimientos, un banco de prueba conectado, 2 deudas con tasas distintas (para que el plan muestre la más cara primero), presupuestos (uno `cerca` y uno `excedido`, para que la demo muestre los avisos) y una meta con aportes.
- [ ] Reutiliza las funciones de `src/` (`crearUsuario`, `crearHashContrasena`, el generador de `simulado.js`, `cifrar`).
- [ ] Que se pueda correr de nuevo sin duplicar datos.
- [ ] Agrega el comando `"demo": "node scripts/datos-demo.js"` en `package.json`.
- [ ] **Protección:** el script se niega a correr si `NODE_ENV=production`, salvo con una confirmación explícita (por ejemplo `--si-estoy-seguro`).

**Pídele a Claude:** *"Crea scripts/datos-demo.js que genere usuarios de demostración usando las funciones existentes de src/, que se pueda correr varias veces sin duplicar y que no corra en producción sin confirmación."*

### Sesión 2 · Métricas para la presentación
- [ ] En el panel `/admin`, agrega `/admin/resumen.csv` con métricas agregadas **sin datos personales**: usuarios por semana, bancos conectados, uso de presupuestos y metas.
- [ ] Prepara 2–3 cifras reales para la presentación.

### Sesión 3 · Revisión con el equipo (viernes 13)
- [ ] Corre el script de demo en tu rama y muéstraselo a David: él arma el guion de la demo con esos datos.
- [ ] Revisa que `docs/base-de-datos.md` coincida con `schema.sql`.

**Listo cuando:** script de demo y métricas en `main`. ← **Hito B**

---

## Semana C · Carga final y presentación (17–20 nov)

### Sesión 1 · Datos de demo en producción (martes 17)
- [ ] Con Samu, carga los datos de demostración en producción (Neon `main`) usando tu script con la confirmación.
- [ ] Verifica en la URL de Render que el usuario de demo entra y se ve bien.

### Sesión 2 · Tu parte de la presentación
- [ ] 2 diapositivas: el diagrama de la base de datos y "cómo protegemos los datos" (cifrado, `usuario_id`, cascadas).
- [ ] **Miércoles 18 · ensayo general · Viernes 20 · presentación final.**

---

## Si sobra tiempo (prioridad 3)
- **Rendimiento:** `EXPLAIN ANALYZE` de `listarMovimientos` y `gastadoPorCategoria` con un usuario de demo. Si hay *Seq Scan* sobre `movimientos`, propone un índice. Documéntalo en `docs/base-de-datos.md`.
- **Retención:** `borrarMovimientosAntiguos()` para movimientos de Open Finance de más de 13 meses (la autorización cubre 12), llamada al final de `sincronizarConexion` (con revisión de Juanes).
- **Simulacro de copia de seguridad:** restaurar desde un punto anterior en Neon y escribir el procedimiento en `docs/base-de-datos.md`.
