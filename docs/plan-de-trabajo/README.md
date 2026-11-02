# Plan de trabajo · Recta final

**Hoy:** lunes 2 de noviembre de 2026 · **Presentación de avance:** martes 3 de noviembre · **Presentación final:** viernes 20 de noviembre de 2026

> **Qué cambió (2 de noviembre):** la entrega final pasó del 12 al **20 de noviembre**. Este archivo reemplaza el calendario de 4 semanas anterior. Los planes individuales (`juanes.md`, `garavito.md`, `aleja.md`, `david.md`, `samu.md`) siguen sirviendo como **guía paso a paso** de cada tarea, pero **las fechas que valen son las de este archivo**.

---

## 1. Dónde estamos

Partimos de lo que hay hoy en el código y en Render. Lo que dice **"Por confirmar"** se revisa en la reunión del martes 3: si alguien ya lo tiene en su rama, lo marca y abre el Pull Request ese mismo día.

| Función | Estado | Nota |
|---|---|---|
| Registro, inicio de sesión y sesiones seguras | ✅ Hecho | |
| Correo de bienvenida con la encuesta | ✅ Hecho | |
| Panel: resumen, categorías, recurrentes, gastos hormiga, recomendaciones | ✅ Hecho en el código | ⚠️ **No se ve en el enlace publicado.** Ver §3, tarea 0 |
| Open Finance con Banco Ceiba (de prueba) | ✅ Hecho | |
| **Deudas y dinero ocioso:** registro de deudas, plan (deudas más caras primero, luego renta fija) y pagos autorizados en el banco | ✅ Hecho | Pagos **simulados** con el banco de prueba. Ver `docs/redireccion-de-dinero.md` |
| Importar CSV y registrar movimientos a mano | ✅ Hecho | |
| Centro de privacidad (descargar, borrar, eliminar cuenta) | ✅ Hecho | |
| Presupuestos por categoría | ⏳ Por confirmar | Contrato en `docs/api.md` §6 |
| Metas de ahorro | ⏳ Por confirmar | Contrato en `docs/api.md` §6 |
| Recuperar contraseña por correo | ⏳ Por confirmar | |
| Términos y condiciones, política revisada | ⏳ Por confirmar | |
| Pruebas automáticas de lo nuevo, revisión OWASP, monitoreo | ⏳ Por confirmar | |
| Datos de demostración | ❌ Pendiente | |

**Lo más urgente no es construir más, sino que lo que ya existe se vea en el enlace publicado.** Una app que funciona en el computador de alguien no cuenta para la presentación.

---

## 2. Prioridades: qué entra sí o sí

Con 13 días hábiles no alcanza para todo lo del plan original. Este es el orden. Si algo de la prioridad 2 o 3 no está listo el **martes 17**, se presenta como "siguiente fase" y no se fuerza.

| Prioridad | Qué | Por qué |
|---|---|---|
| **1 · Obligatorio** | App publicada en Render mostrando el panel, con la URL en el `README.md` | Sin esto no hay demo |
| **1 · Obligatorio** | Datos de demostración y un usuario de demo listo (con deudas y dinero ocioso, para mostrar el plan) | La demo no puede depender de registrar datos en vivo |
| **1 · Obligatorio** | **Presupuestos por categoría** de punta a punta | Es la función nueva más visible en el panel |
| **2 · Importante** | Metas de ahorro | Usa el mismo patrón que presupuestos: reutilicen lo aprendido |
| **2 · Importante** | Recuperar contraseña | Ya existe el envío de correo; falta el flujo |
| **2 · Importante** | Términos y condiciones, pruebas de lo nuevo, revisión OWASP | Respaldan la parte de seguridad y regulación |
| **3 · Si sobra tiempo** | Quitar `'unsafe-inline'` de la CSP, monitoreo con UptimeRobot | Mejoras técnicas que no se ven en la demo |

---

## 3. Calendario

```
           Lun    Mar    Mié    Jue    Vie
Semana A    2*     3      4      5      6  ← Hito A    (2 nov: festivo · 3 nov: AVANCE)
Semana B    9     10     11     12     13  ← Hito B
Semana C   16*    17     18     19     20  ← PRESENTACIÓN FINAL   (16 nov: festivo)
                  ↑ congelamiento   ↑ ensayo   ↑ video
```

| Hito | Fecha | Qué debe estar listo |
|---|---|---|
| **Avance** | mar 3 nov | Presentar lo que hay (ver §5). Reunión de 30 min después: confirmar la tabla de §1 |
| **Hito 0 · Enlace arreglado** | mié 4 nov | El enlace de Render muestra el panel al iniciar sesión. La URL está en el `README.md` |
| **Hito A · Base lista** | vie 6 nov | Tablas de presupuestos, metas y recuperación fusionadas en `main`. Rutas de presupuestos funcionando. Pantalla de presupuestos con datos de ejemplo. Términos publicados |
| **Hito B · Todo conectado** | vie 13 nov | Presupuestos y metas funcionando **en Render** con la API real. Recuperar contraseña de punta a punta. Pruebas de lo nuevo en verde. Revisión OWASP hecha |
| **Congelamiento** | mar 17 nov | Desde aquí solo se corrigen errores. Datos de demostración cargados. Versión `v1.0` publicada en GitHub |
| **Ensayo general** | mié 18 nov | Presentación completa con cronómetro, en la URL de Render, desde el computador que se usará |
| **Video de respaldo** | jue 19 nov | Grabación de la demo por si falla internet |
| **Presentación final** | **vie 20 nov** | |

---

## 4. Tareas de cada persona

Cada fila es más o menos una sesión de trabajo de 2 horas. Los pasos detallados están en el plan individual (sección indicada entre paréntesis).

### Juanes · APIs
| Cuándo | Tarea |
|---|---|
| Sem. A | Rutas de **presupuestos** (`GET/PUT/DELETE /api/finanzas/presupuestos`), con validación y filtro por `usuario_id`. Actualizar `docs/api.md` |
| Sem. A | Rutas de **metas** y aportes |
| Sem. B | Rutas de **recuperar contraseña** (token guardado con `huella()`, vence en 30 min, un solo uso) |
| Sem. B | Revisar con David y Aleja que las pantallas usen bien la API. Corregir lo que salga |
| Sem. C | Notas técnicas de la API para la presentación, incluido el flujo de deudas y pagos simulados |

### Garavito · Base de datos
| Cuándo | Tarea |
|---|---|
| Sem. A | Tablas `presupuestos`, `metas`, `aportes_meta`, `tokens_recuperacion` y columna `usuarios.version_sesion` en `src/schema.sql` (solo `IF NOT EXISTS`). PR a más tardar el **miércoles 4**. Diagrama en `docs/base-de-datos.md` |
| Sem. A | Consultas de presupuestos y metas en `src/finanzas/db.js`, de recuperación en `src/db.js` y acciones nuevas en `src/auditoria.js` |
| Sem. B | **Script de datos de demostración** en `scripts/`: un usuario de demo con 3 meses de movimientos, deudas, presupuestos y una meta. Que se pueda correr de nuevo sin duplicar |
| Sem. B | Métricas de uso para la presentación (usuarios registrados, bancos conectados), sin datos personales |
| Sem. C | Cargar los datos de demo en producción el martes 17 y comprobar que el usuario de demo entra |

### Aleja · Página de inicio y legal
| Cuándo | Tarea |
|---|---|
| Sem. A | **Contenido honesto** en la portada: quitar testimonios inventados, cifras falsas y "100 % seguro" |
| Sem. A | Publicar **términos y condiciones** (`public/terminos.html`), completar la política de privacidad y agregar "¿Olvidaste tu contraseña?" al inicio de sesión |
| Sem. B | Página `public/recuperar.html` conectada con la API real. Revisar la portada en celular y modo oscuro |
| Sem. B | Resultados de la encuesta para la presentación |
| Sem. C | Armar la presentación con lo de cada uno. Grabar el video de respaldo el jueves 19 |

### David · Panel
| Cuándo | Tarea |
|---|---|
| Sem. A | Pestaña **Presupuestos**: crear, editar y borrar límites por categoría; barra de avance con aviso al 80 % y al pasarse (con texto, no solo color) |
| Sem. A | Pestaña **Metas** con datos de ejemplo |
| Sem. B | Conectar las dos pestañas con la API real. Mensajes de error claros |
| Sem. B | Revisar el panel completo en celular, modo oscuro y con teclado |
| Sem. C | Preparar el recorrido de la demo en el panel (qué se muestra y en qué orden) |

### Samu · Infraestructura, seguridad y calidad
| Cuándo | Tarea |
|---|---|
| **Mar 3–mié 4** | **Tarea 0: arreglar el enlace.** En Render, revisar qué repositorio y rama está publicando y si el último despliegue dice *Live*. Confirmar que `public/app.html` está en `main`. Si el servicio es el viejo de Juanes, terminar el traspaso (`samu.md`, Semana 1 · Sesión 2). Poner la URL en el `README.md` |
| Sem. A | Plantilla del correo de recuperación en `src/correo.js` y `apps-script/` |
| Sem. B | Pruebas automáticas de presupuestos, metas y recuperación en `tests/`. Revisión OWASP con dos usuarios |
| Sem. B | Monitoreo y quitar `'unsafe-inline'` (prioridad 3: solo si lo demás está en verde) |
| Sem. C | Publicar `v1.0` el martes 17 y confirmar en Render → **Events** que es ese commit. Plan B de la demo |

### Orden para no bloquearse
```
Garavito: tablas (Sem. A) ──► Juanes: rutas (Sem. A–B) ──► David y Aleja conectan pantallas (Sem. B)
Samu: enlace arreglado (mié 4) ──► todo lo que se fusiona se ve en Render
Garavito: datos de demo (Sem. B) ──► ensayo con datos reales (mié 18)
```
**Regla de oro:** si dependes de alguien que no ha terminado, trabaja con datos de ejemplo siguiendo `docs/api.md` §6 y avisa en el grupo.

---

## 5. Presentación de avance (martes 3 de noviembre)

Presenten **lo que ya funciona**, sin prometer lo que falta.

1. **Problema y propuesta** (Aleja): por qué Auto-Wealth y para quién.
2. **Demo** (David): registro → panel → conectar Banco Ceiba → ver categorías, gastos hormiga y recomendaciones → pestaña **Deudas y plan**: el dinero ocioso va primero a la deuda más cara y se autoriza un pago simulado en el banco de prueba. Si el enlace de Render todavía no muestra el panel, hagan la demo desde `npm run dev` en un computador que ya lo tenga funcionando y díganlo con naturalidad.
3. **Cómo funciona por dentro** (Juanes y Garavito): servidor, API, base de datos y cifrado de los datos.
4. **Seguridad y regulación** (Samu): consentimiento de Open Finance, Ley 1581, cómo se protegen las contraseñas.
5. **Qué sigue hasta el 20** (todos): la tabla de prioridades de §2.

**Antes de empezar:** abrir el enlace de Render 5 minutos antes (el plan gratis se duerme) y tener una sesión ya iniciada en otro navegador.

---

## 6. Rutinas del equipo

| Cuándo | Qué | Duración |
|---|---|---|
| **Martes** | Planeación de la semana: qué hace cada uno y qué necesita de otros | 20–30 min |
| **Cada día que trabajes** | Mensaje en el grupo: *"Hice… / Voy a hacer… / Me bloquea…"* | 1 min |
| **Viernes** | Revisión del hito: demo de 3 minutos por persona y fusionar los PR pendientes | 30–45 min |

Cómo trabajar cada sesión, ramas y Pull Requests: ver [CONTRIBUTING.md](../../CONTRIBUTING.md). Para usar Claude, ver [CLAUDE.md](../../CLAUDE.md). **Nunca le pegues claves reales.**

---

## 7. Lista de entrega final (viernes 20 de noviembre)
- [ ] App publicada en Render, mostrando el panel, con datos de demostración
- [ ] `README.md` con la URL real y `docs/` al día
- [ ] Revisión automática en verde y versión `v1.0` en GitHub (*Releases*)
- [ ] Presentación (≈ 15 min): problema, solución, demo en vivo, arquitectura, seguridad y regulación, aprendizajes. **Cada integrante presenta su parte**
- [ ] Video de respaldo de la demo
- [ ] Resultados de la encuesta (Aleja) y métricas de uso (Garavito)

## 8. Seguimiento

| Hito | Juanes | Garavito | Aleja | David | Samu |
|---|---|---|---|---|---|
| Hito 0 · mié 4 | — | — | — | — | ☐ |
| Hito A · vie 6 | ☐ | ☐ | ☐ | ☐ | ☐ |
| Hito B · vie 13 | ☐ | ☐ | ☐ | ☐ | ☐ |
| Congelamiento · mar 17 | ☐ | ☐ | ☐ | ☐ | ☐ |
