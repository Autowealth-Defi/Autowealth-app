# Guion de la demo · Metas y presupuestos (borrador B5)

> **Estado:** borrador hecho con los **datos de ejemplo** (`?ejemplo=1`). En B7 se ajustan las cifras con los datos reales de Garavito.
> **Duración objetivo:** 4 min 30 s (máximo 5 min). **Presenta:** David. **Apoyo:** Juanes (preguntas de API).

---

## 1. Preparación (10 minutos antes)

| ✔ | Qué | Detalle |
|---|---|---|
| ☐ | Servidor local | `npx http-server public -p 5050 -c-1` (mientras no haya base de datos) |
| ☐ | **Ventana A** (escritorio, modo claro) | `http://localhost:5050/app.html?ejemplo=1#resumen` |
| ☐ | **Ventana B** (respaldo móvil) | Misma URL, DevTools → modo dispositivo → **390 × 844**, modo oscuro ya activado |
| ☐ | Zoom del navegador | **125 %** en la ventana A (que se lea desde el fondo de la sala) |
| ☐ | Ruido fuera | Notificaciones del sistema en "No molestar", otras pestañas cerradas, barra de marcadores oculta |
| ☐ | Estado limpio | **Recarga la página** justo antes de empezar: el modo de ejemplo vuelve a los datos originales |
| ☐ | Plan B | Si el día de la demo ya se aplicó A1 y falla el servidor: `git stash` → `git checkout demo-ejemplo` (ver §5) |

**Cifras que deben verse al empezar** (si alguna no coincide, recarga):
- Aviso rojo: **Transporte $262.300 de $200.000 (131 %)**. Aviso ámbar: **Restaurantes y domicilios, 93 %**.
- Metas: **Viaje a Cartagena $1.200.000 de $3.000.000 (40 %)**, aporte sugerido **$257.143/mes**.

---

## 2. Guion

### 0:00 – 0:25 · Apertura (el problema)
| Qué digo | Qué hago |
|---|---|
| "Auto-Wealth ya te mostraba **en qué** se te va la plata. Pero saberlo no basta: la gente necesita **un tope** antes de pasarse y **una meta** para la que ahorrar. Eso es lo que hicimos esta semana." | Ventana A en **Resumen**. No toco nada. |

### 0:25 – 1:15 · El aviso en el Resumen
| Qué digo | Qué hago | Qué debe verse |
|---|---|---|
| "Lo primero que ve Ana al entrar es este aviso: **se pasó en Transporte** y va en el **93 % de Restaurantes**." | Señalo los dos avisos (debajo de "Disponible…"). | Dos tarjetas: roja y ámbar. |
| "No dependemos solo del color: cada aviso tiene **ícono y texto**. Alguien que no distingue rojo de verde lo entiende igual." | — | Íconos ❗ y ⚠ y el texto "Te pasaste…". |
| "¿Y en qué se pasó? Un clic." | Clic en **Ver gastos** de Transporte. | Se abre **Movimientos** filtrado: Categoría = Transporte, **3 movimientos, gastos $262.300**. |
| "Las cifras cuadran: los $262.300 del aviso son exactamente estos tres movimientos." | Señalo el total. | — |

### 1:15 – 2:15 · Presupuestos
| Qué digo | Qué hago | Qué debe verse |
|---|---|---|
| "En la pestaña **Metas y presupuestos** está el detalle, ordenado de lo más grave a lo más tranquilo." | Clic en la pestaña **Metas y presupuestos**. | Transporte 131 % → Restaurantes 93 % → Mercado 53 %. |
| "Cada presupuesto tiene su barra, el porcentaje y cuánto queda o cuánto se pasó." | Señalo "Te quedan $281.600" en Mercado. | — |
| "Supongamos que Ana decide que $200.000 de transporte era poco." | Ícono ✎ de Transporte → límite **300.000** → **Guardar cambios**. | Toast "Presupuesto actualizado". Transporte pasa a **87 %, ámbar, "Cerca del límite"**. |
| "El estado se recalcula solo: de *te pasaste* a *cerca del límite*." | — | — |

### 2:15 – 3:20 · Metas de ahorro
| Qué digo | Qué hago | Qué debe verse |
|---|---|---|
| "Abajo están las metas. Algunas con fecha, otras sin fecha, una cumplida y una vencida, cada una con su estado." | Recorro con el cursor las 4 tarjetas. | Chips: "Hasta 15 jun 2027", "Sin fecha límite", "✓ Meta cumplida", "⚠ Venció…". |
| "Para el viaje, la app calcula cuánto ahorrar al mes para llegar a tiempo: $257.143." | Señalo la línea del aporte sugerido. | — |
| "Ana acaba de recibir la prima y aporta $300.000." | **Aportar** en Viaje → valor **300.000** → **Aportar**. | Toast "Aporte registrado. Llevas $1.500.000". **50 %**, sugerido **$214.286**. |
| "Algo importante: esto es un **apartado para organizarse**. No mueve dinero del banco, y así se lo decimos dentro del mismo diálogo." | (Si sobra tiempo, vuelvo a abrir Aportar para mostrar la nota y lo cierro con **Esc**.) | Nota "Esto es un registro para organizarte…". |

### 3:20 – 3:55 · Móvil, modo oscuro y teclado
| Qué digo | Qué hago | Qué debe verse |
|---|---|---|
| "Todo esto funciona en un celular de 390 px y en modo oscuro, sin scroll horizontal." | Paso a la **ventana B**. Desplazo la pestaña Metas. | Tarjetas en una columna, botones debajo, colores oscuros legibles. |
| "Y se puede usar solo con teclado: las flechas cambian de pestaña y Esc cierra los diálogos." | En la ventana A: clic en el nav → **←/→** dos veces. | Las pestañas cambian con foco visible. |

### 3:55 – 4:20 · Seguridad y privacidad
| Qué digo | Qué hago |
|---|---|
| "Todo lo que escribe el usuario se muestra como texto. Si alguien llama a su meta con código, la página no lo ejecuta." | *(Opcional, solo si sobra tiempo: crear una meta llamada `<b>hola</b>`; se ve literal, sin negrita.)* |
| "Y cada persona solo ve lo suyo: si alguien intenta tocar el presupuesto de otro, la API responde *no encontrado*." | *(Solo lo menciono. La prueba con dos usuarios es la A4.)* |

### 4:20 – 4:45 · Cierre
| Qué digo |
|---|
| "Resumiendo: **un aviso que te dice a tiempo**, **un clic hasta el detalle**, **presupuestos que se recalculan** y **metas con un aporte sugerido**. Accesible, en móvil y en oscuro. El siguiente paso es conectarlo a la base de datos real con Juanes. ¿Preguntas?" |

---

## 3. Preguntas probables (respuestas cortas)

| Pregunta | Respuesta |
|---|---|
| "¿Las metas mueven dinero?" | No. Son un registro para organizarse. Los pagos reales solo existen en *Deudas y plan* y siempre se confirman en el banco. |
| "¿Desde qué porcentaje avisa?" | Desde el 80 % del límite ("cerca") y por encima del 100 % ("te pasaste"). Así está en `api.md` §6. |
| "¿Qué pasa si borro un presupuesto?" | Desaparecen el tope y los avisos. Los movimientos no se tocan. |
| "¿Los datos son reales?" | Hoy son de ejemplo (por eso el chip "Datos de ejemplo"). Con la base de datos de Garavito los mostramos reales. |
| "¿Por qué el aviso aparece también en Recomendaciones?" | *(Si alguien baja hasta allí antes de que Juanes lo resuelva)* Lo estamos unificando con Juanes para que salga en un solo lugar. |

---

## 4. Qué NO hacer en vivo
- **No bajar a "Recomendaciones"** del Resumen: hoy duplica el aviso de Transporte (pendiente con Juanes).
- **No abrir** Deudas y plan, Cuentas ni Privacidad con el modo de ejemplo: muestran "Esta sección no tiene datos de ejemplo todavía".
- **No cambiar el mes** en el selector del Resumen: el modo de ejemplo siempre vuelve al mes actual.
- **No recargar** a mitad de la demo si ya hiciste cambios que vas a mostrar después: se pierden (aunque es útil para reiniciar si algo sale mal).

## 5. Plan B
- **Antes de aplicar A1**, deja marcado el último commit que tiene el modo de ejemplo:
  `git tag demo-ejemplo`
- Si el día de la demo el servidor o la base de datos fallan: `git stash` → `git checkout demo-ejemplo` → `npx http-server public -p 5050 -c-1` → `?ejemplo=1`. Al terminar: `git checkout feat/metas-presupuestos` → `git stash pop`.
- Si falla el proyector: la **ventana B** (390 px) también sirve para mostrar desde el celular, compartiendo la pantalla.

## 6. Pendiente para B7 (con los datos de Garavito)
- [ ] Reemplazar las cifras de §1 y del guion por las reales (categoría excedida, meta principal, aporte).
- [ ] Elegir **un** presupuesto excedido y **una** meta con fecha que cuenten una historia clara.
- [ ] Quitar las referencias al "modo de ejemplo" y al chip.
- [ ] Cronometrar dos ensayos completos (objetivo: 4:30).
