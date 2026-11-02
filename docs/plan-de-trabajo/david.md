# Plan de David · Panel financiero

**Tu área:** el panel (`/app`), donde cada persona ve y organiza sus finanzas: resumen, movimientos, cuentas y bancos, privacidad, y las pantallas nuevas de **presupuestos** y **metas de ahorro**. Además, **haces la demo en vivo**.
**Tus archivos:** `public/app.html` (estructura), `public/assets/panel.css` (estilos) y `public/assets/panel.js` (lógica).
**Trabajas de cerca con:** Juanes (todas las rutas que usas), Aleja (mismo estilo visual) y Samu (seguridad y pruebas).

> Reglas de tu área: **todo texto que venga del usuario o de la API pasa por `esc()`** antes de ir al HTML (evita inyección de código). Los colores salen de las variables de `panel.css` (`--accent`, `--bg`…), que tienen versión clara y oscura. La página también tiene que funcionar en celular.

> **Actualizado el 2 de noviembre.** La presentación final es el **viernes 20 de noviembre**. Calendario y prioridades del equipo en [README.md](README.md). Tu prioridad: **presupuestos primero**, metas después. No esperes a la API: trabaja con datos de ejemplo con el formato de `docs/api.md`.

---

## Antes de seguir · Revisa que esto ya esté hecho (mar 3)

- [ ] La app corre en tu computador; conectaste Banco Ceiba e importaste un CSV.
- [ ] Tienes el diseño (papel, Figma o Excalidraw) de la pestaña **"Metas y presupuestos"** y Juanes confirmó que el contrato de [api.md §6](../api.md#6-rutas-planeadas-para-este-mes-propuesta) trae todo lo que necesitas mostrar. Si no, ciérralo con él el **martes 3**.
- [ ] **Martes 3 · presentación de avance:** haces la demo con lo que ya funciona (ver [README.md §5](README.md#5-presentación-de-avance-martes-3-de-noviembre)).

---

## Semana A · Pantallas con datos de ejemplo (3–6 nov)

### Sesión 1 · Pestaña "Metas y presupuestos" (estructura)
- [ ] Rama `feature/david-metas-presupuestos`.
- [ ] En `app.html`, agrega la pestaña nueva (botón en `.pestanas` y su `<section role="tabpanel">`). En `panel.js`, súmala a `PESTANAS` y a `cargarPestana`.
- [ ] Crea una función `datosEjemplo()` que devuelva presupuestos y metas falsos con el formato del contrato.

### Sesión 2 · Presupuestos
- [ ] Dibuja la lista de presupuestos con barra de progreso. El color va según el estado, pero **también** con un ícono y un texto ("Excedido"): el color nunca debe ser la única señal.
- [ ] Formulario para crear un presupuesto (categoría de gasto + límite) y para editar o borrar uno, en un `<dialog>` como los existentes.
- [ ] Usa `leerNumero()` para leer valores como "450.000".

**Pídele a Claude:** *"En panel.js, agrega el dibujo de presupuestos en la pestaña nueva usando el formato de docs/api.md §6. Sigue el estilo de dibujarCategorias y usa esc() para todo texto."*

### Sesión 3 · Metas de ahorro (viernes 6)
- [ ] Tarjetas de metas con progreso, fecha límite y aporte mensual sugerido.
- [ ] Diálogo para crear una meta y otro para aportar o retirar.
- [ ] Estado vacío: *"Aún no tienes metas. Crea la primera: un viaje, un fondo de emergencia…"* con su botón.
- [ ] Revisa en celular y en modo oscuro.

**Listo cuando:** las pantallas funcionan con datos de ejemplo y el PR está abierto (puede quedar como borrador). ← **Hito A**

---

## Semana B · Conectar con la API real (9–13 nov)

### Sesión 1 · Conectar presupuestos y metas
- [ ] Cambia `datosEjemplo()` por llamadas reales con `api('/api/finanzas/presupuestos')`, etc. Borra los datos de ejemplo.
- [ ] Maneja los errores: muestra el mensaje de la API con `aviso('bad', ...)` o dentro del diálogo.
- [ ] Haz *Live Share* con Juanes para resolver diferencias de formato.

### Sesión 2 · Avisos en el Resumen
- [ ] En la pestaña Resumen, si hay presupuestos `cerca` o `excedido`, muestra un bloque arriba de las recomendaciones (o usa la recomendación que agrega Juanes en `/api/finanzas/resumen`).
- [ ] Clic en un presupuesto excedido → pestaña Movimientos filtrada por esa categoría (reutiliza `estado.filtroCategoria`).

### Sesión 3 · Pruebas de la interfaz (viernes 13)
- [ ] Prueba completa con dos usuarios distintos: que ninguno vea lo del otro.
- [ ] Prueba lo raro: límites enormes, nombres largos, emojis, `<script>` en los nombres (debe verse como texto), meta sin fecha, aporte mayor que la meta.
- [ ] Revisa todas las pantallas en celular (390 px), tablet y escritorio, en claro y oscuro, y con el teclado (Tab y Enter). Que nunca haya scroll horizontal.
- [ ] Fusiona el PR con la revisión de Juanes y confirma que se ve en la URL de Render.

**Listo cuando:** presupuestos y metas funcionan en Render. ← **Hito B**

---

## Semana C · Demo en vivo (17–20 nov)

### Sesión 1 · Guion de la demo (martes 17)
- [ ] Escribe el guion paso a paso (4–5 minutos): entrar → resumen → conectar banco → deudas y plan (autorizar un pago simulado) → presupuesto excedido → meta → privacidad.
- [ ] Ensáyalo con los datos de demostración que Garavito carga en producción el martes 17.
- [ ] Toma capturas limpias del panel con el usuario de demo para la presentación.

### Sesión 2 · Ensayo y presentación
- [ ] **Miércoles 18 · ensayo general:** haces la demo en vivo, en la URL de Render, desde el computador que se usará.
- [ ] **Viernes 20 · presentación final:** abre el enlace 5 minutos antes y ten una sesión ya iniciada en otro navegador.

---

## Si sobra tiempo (prioridad 3)
- Las 3 mejoras del panel que priorizaste en tus issues (etiqueta `panel`).
- Lighthouse en el panel con sesión iniciada y corregir lo de accesibilidad.
- Con Samu: mover el script en línea del `<head>` de `app.html` a un archivo de `assets/`, para quitar `'unsafe-inline'`.
