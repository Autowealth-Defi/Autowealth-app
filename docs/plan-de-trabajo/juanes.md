# Plan de Juanes · APIs

**Tu área:** la lógica del servidor, es decir, todo lo que pasa cuando una página llama a `/api/...`.
**Tus archivos:** `src/rutas.js`, `src/finanzas/rutas.js`, `src/finanzas/analisis.js`, `src/finanzas/categorias.js`, `src/openfinance/`, `src/validacion.js`, la tabla `API` de `server.js` y `docs/api.md`.
**Trabajas de cerca con:** Garavito (te da las consultas a la base de datos), David y Aleja (usan tus rutas), Samu (correo y pruebas).

> Regla de tu área: **el contrato manda**. Antes de programar una ruta, su formato está en `docs/api.md` y el equipo lo conoce. Si cambias un formato, avisa a David y a Aleja.

> **Actualizado el 2 de noviembre.** La presentación final es el **viernes 20 de noviembre**. Calendario y prioridades del equipo en [README.md](README.md). Orden de tus prioridades: **presupuestos → metas → recuperar contraseña**. Lo demás queda en "Si sobra tiempo".

---

## Antes de seguir · Revisa que esto ya esté hecho (mar 3)

Estas tareas eran de las primeras semanas. Si alguna falta, hazla primero: bloquea al resto.
- [ ] Los 4 están invitados al repositorio de GitHub y Samu es **Admin**.
- [ ] Garavito tiene acceso al proyecto de Neon.
- [ ] Las variables de tu servicio viejo de Render están en el gestor de contraseñas del equipo, para que Samu termine el traspaso. **Nunca** por WhatsApp ni por el grupo. La más importante es `DATA_ENCRYPTION_KEY`.
- [ ] Cuando Samu confirme que su servicio funciona: **Settings → Suspend Web Service** en el tuyo (no lo borres todavía).
- [ ] El contrato de [api.md §6](../api.md#6-rutas-planeadas-para-este-mes-propuesta) está aprobado por Garavito, David y Aleja, sin la marca "PROPUESTA". Si no, cierra esto el **martes 3** en la reunión después del avance.

---

## Semana A · Presupuestos y metas (3–6 nov)

> Garavito entrega las tablas y consultas en esta misma semana. Mientras tanto, escribe la validación y la forma de las respuestas.

### Sesión 1 · Rutas de presupuestos
- [ ] Crea la rama `feature/juanes-presupuestos`.
- [ ] En `src/finanzas/rutas.js` agrega `listarPresupuestos`, `crearPresupuesto`, `actualizarPresupuesto` y `eliminarPresupuesto`. Sigue el estilo de `crearCuenta`: `exigirUsuario` → validar → llamar a `fdb` → `enviarJson`.
- [ ] Validaciones: la categoría debe estar en `GASTOS` (`categorias.js`), y el límite debe ser mayor que 0 y menor que 10.000 millones.
- [ ] Calcula `gastado`, `porcentaje` y `estado` (`bien` hasta 79 %, `cerca` de 80 % a 100 %, `excedido` más de 100 %) con los movimientos del mes.
- [ ] Registra las rutas en la tabla `API` de `server.js`.

**Listo cuando:** las 4 rutas responden en Thunder Client o Postman con el formato del contrato.
**Pídele a Claude:** *"Implementa las rutas de presupuestos de docs/api.md §6 en src/finanzas/rutas.js siguiendo el estilo de crearCuenta. Usa las funciones de src/finanzas/db.js que hizo Garavito. No cambies otras rutas."*

### Sesión 2 · Rutas de metas de ahorro
- [ ] Rama `feature/juanes-metas`.
- [ ] Rutas `GET/POST /api/finanzas/metas`, `POST /api/finanzas/metas/:id/aportes` y `DELETE /api/finanzas/metas/:id`.
- [ ] `aporteMensualSugerido` = (objetivo − ahorrado) ÷ meses que faltan hasta `fechaLimite` (mínimo 1 mes). Si no hay fecha, `null`.
- [ ] Un aporte negativo (retiro) no puede dejar `ahorrado` por debajo de 0.
- [ ] Cada aporte queda en `auditoria` (Garavito agrega la acción en `src/auditoria.js`).

**Listo cuando:** puedes crear una meta, aportar, retirar y ver el progreso.

### Sesión 3 · Pruebas y PR (viernes 6)
- [ ] Escribe pruebas en `tests/finanzas.test.js`: crear un presupuesto, uno repetido (409), un límite inválido (400) y que otro usuario no pueda borrarlo (404). Lo mismo para una meta.
- [ ] Corre `npm test` con la rama `pruebas` de Neon.
- [ ] Actualiza `docs/api.md` si algo cambió y abre el PR. Pide revisión a **Garavito**.

**Listo cuando:** presupuestos fusionado en `main` y metas en revisión. ← **Hito A**
**Pídele a Claude:** *"Escribe pruebas para las rutas de presupuestos y metas en tests/finanzas.test.js usando las ayudas cliente() y registrar() de tests/api.test.js."*

---

## Semana B · Recuperar contraseña e integración (9–13 nov)

### Sesión 1 · Recuperar contraseña
- [ ] Rama `feature/juanes-recuperar`. Necesitas: la tabla `tokens_recuperacion` (Garavito) y `enviarCorreoRecuperacion(email, nombre, enlace)` (Samu).
- [ ] `POST /api/recuperar`: **siempre** responde `{ ok: true }`. Si el correo existe, crea un token con `crypto.randomBytes(32).toString('base64url')`, guarda solo `huella(token)` con vencimiento a 30 minutos y envía el enlace `https://<tu-app>/recuperar?token=...`.
- [ ] `POST /api/recuperar/confirmar`: busca por `huella(token)`, revisa que no esté usado ni vencido, valida la contraseña nueva (mínimo 8), guarda el hash nuevo y marca el token como usado.
- [ ] Límite: 3 solicitudes por correo cada hora (`crearLimitador`). Todo queda en `auditoria`.

**Listo cuando:** el correo llega (en modo `consola` se ve en la terminal), el enlace funciona una sola vez y a los 30 minutos vence.
**Pídele a Claude:** *"Implementa la recuperación de contraseña de docs/api.md §6 con las reglas de seguridad indicadas. Muéstrame cómo evita revelar si un correo existe."*

### Sesión 2 · Presupuestos en el resumen
- [ ] En `src/finanzas/analisis.js`, si algún presupuesto está `excedido` o `cerca`, agrega una recomendación (tipo `alerta` o `atencion`).
- [ ] Prueba con un usuario que tenga un presupuesto excedido.

### Sesión 3 · Integración con las pantallas (viernes 13)
- [ ] Haz *Live Share* con **David** para conectar presupuestos y metas, y con **Aleja** para la página de recuperar contraseña.
- [ ] Corrige lo que aparezca. Si cambia algún formato, actualiza `docs/api.md` en el mismo PR.
- [ ] Revisa en la URL de Render que las tres funciones nuevas funcionan de punta a punta.

**Listo cuando:** presupuestos, metas y recuperar contraseña funcionan en Render. ← **Hito B**

---

## Semana C · Cierre y presentación (17–20 nov)

### Sesión 1 · Revisión final (lunes 16 es festivo; martes 17 congelamiento)
- [ ] Recorre tus rutas con la [lista de seguridad](../seguridad-y-cumplimiento.md#lista-de-revisión-rápida-para-cada-pull-request) y corrige los issues con etiqueta `error`.
- [ ] `docs/api.md` completo y fiel al código, con las rutas nuevas y ejemplos reales. Actualiza la colección de `docs/api/`.
- [ ] Ayuda a Samu con las notas de la versión `v1.0`.

### Sesión 2 · Tu parte de la presentación
- [ ] 2–3 diapositivas: "Cómo funciona la API" (el recorrido de una petición), "Open Finance: consentimiento → banco → datos" y "Dinero ocioso: del plan al pago autorizado" (apóyate en `docs/redireccion-de-dinero.md`, incluido por qué los pagos son simulados).
- [ ] **Miércoles 18 · ensayo general:** presentas tu parte y la demo de conectar un banco (3 minutos).
- [ ] **Viernes 20 · presentación final.**

---

## Si sobra tiempo (prioridad 3)
- **Cerrar sesiones al cambiar la contraseña:** columna `usuarios.version_sesion` (Garavito), incluir `version` en el token de sesión en `src/seguridad.js` y rechazar versiones viejas en `src/sesion.js` (avísale a Samu: son sus archivos). Al confirmar la contraseña nueva, suma 1 a `version_sesion`.
