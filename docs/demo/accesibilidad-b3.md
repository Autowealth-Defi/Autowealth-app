# B3 · Lighthouse y accesibilidad con datos de ejemplo

> Se hace **antes de A1**, con `?ejemplo=1`, para no esperar a la base de datos.
> Lighthouse revisa solo una parte de la accesibilidad (contraste, etiquetas, ARIA). Por eso la §3 tiene pruebas manuales que son igual de importantes.

---

## 1. Preparar

1. Servidor: `npx http-server public -p 5050 -c-1`
2. Abre Chrome en **una ventana de incógnito** (Ctrl+Shift+N). Las extensiones alteran los resultados de Lighthouse.
3. DevTools (F12) → pestaña **Lighthouse**. Si no aparece: `»` → Lighthouse.
4. En el engranaje ⚙ de Lighthouse:
   - **Desmarca "Clear storage"**. Si no, Lighthouse borra el `localStorage` y el tema elegido (claro u oscuro) se pierde en cada análisis.
5. En **Categories** marca solo **Accessibility** y **Best practices**. *Performance* y *SEO* no sirven en local.

### Dos modos de Lighthouse que vamos a usar
| Modo | Para qué |
|---|---|
| **Navigation** | Carga la URL desde cero. Sirve para cada pestaña (`#resumen`, `#metas`…) |
| **Snapshot** | Analiza **la página tal como está en ese momento**. Es el único que revisa un **diálogo abierto** o la lista ya filtrada |

---

## 2. Matriz de análisis (16 análisis, unos 25 minutos)

Hazlo una vez con **Device: Mobile** y otra con **Desktop**. Para el modo oscuro: pulsa el botón de tema en la página (como "Clear storage" está desmarcado, se conserva), o en DevTools → ⋮ → More tools → **Rendering** → *Emulate CSS prefers-color-scheme: dark*.

| # | URL / estado | Modo | Claro | Oscuro |
|---|---|---|---|---|
| 1 | `app.html?ejemplo=1#resumen` (con los 2 avisos) | Navigation | ☐ | ☐ |
| 2 | `app.html?ejemplo=1#metas` | Navigation | ☐ | ☐ |
| 3 | `app.html?ejemplo=vacio#metas` (estados vacíos) | Navigation | ☐ | ☐ |
| 4 | `app.html?ejemplo=sin-rutas#metas` (aviso de error) | Navigation | ☐ | ☐ |
| 5 | Resumen → **Ver gastos** (Movimientos filtrado) | **Snapshot** | ☐ | ☐ |
| 6 | Metas → **Crear presupuesto** abierto | **Snapshot** | ☐ | ☐ |
| 7 | Metas → **Crear meta** abierto, con un error visible (objetivo `abc` → Crear) | **Snapshot** | ☐ | ☐ |
| 8 | Metas → **Aportar** abierto | **Snapshot** | ☐ | ☐ |

**Meta:** **100** en Accessibility en las pantallas nuevas. Cualquier valor menor de 100 se anota en §4 con el *audit* que falló.

### Hallazgo que ya sé que va a aparecer (lo calculé)
Calculé el contraste de los pares de colores del panel. Todos pasan el mínimo WCAG AA (4,5:1 para texto normal) **excepto uno**:

| Par | Contraste | Dónde aparece |
|---|---|---|
| `--muted` sobre `--card-2` (**modo claro**) | **4,29 : 1** ❌ | `.metas .detalle` (línea "Ahorra $257.143 al mes…" en las tarjetas de metas, **código nuevo**) y `.aviso-legal` en Deudas y plan (**código existente**) |
| En modo oscuro el mismo par | 5,47 : 1 ✅ | — |

Lighthouse lo marcará como **"Background and foreground colors do not have a sufficient contrast ratio"** en el análisis 2. El arreglo (sin colores nuevos) está en §5.

---

## 3. Pruebas manuales (Lighthouse no las cubre)

### 3.1 Solo teclado (desconecta el mouse o no lo toques)
| ☐ | Prueba | Esperado |
|---|---|---|
| ☐ | Tab desde el inicio de la página | El foco se ve siempre (borde morado de 3 px, `:focus-visible`) |
| ☐ | En el nav, **← →** | Cambia de pestaña. Metas va entre Movimientos y Deudas y plan. Tab sale del nav al contenido |
| ☐ | Resumen: Tab hasta **Ver gastos** → Enter | Abre Movimientos filtrado |
| ☐ | Metas: abrir cada diálogo con Enter | El foco cae en el **primer campo** (categoría, nombre o valor) |
| ☐ | Dentro del diálogo: Tab y Shift+Tab | El foco **no se sale** del diálogo (`showModal()` vuelve inerte el fondo) |
| ☐ | **Esc** | Cierra el diálogo y el foco **vuelve al botón** que lo abrió |
| ☐ | Guardar un presupuesto o un aporte | ⚠ **Por revisar:** al recargar la lista, el botón que abrió el diálogo se vuelve a crear y el foco puede quedar en `<body>`. Anótalo si pasa (es un candidato para B1) |
| ☐ | Borrar → `#dlgConfirmar` | El foco va a "Borrar…". Esc cancela |

### 3.2 Lector de pantalla (NVDA, gratis: nvaccess.org)
| ☐ | Dónde | Debe decir algo como |
|---|---|---|
| ☐ | Avisos del Resumen | "Avisos de tus presupuestos, lista, 2 elementos… Te pasaste en Transporte: llevas $262.300 de $200.000… botón Ver los gastos de Transporte" |
| ☐ | Lista de presupuestos | "Presupuestos del mes, lista, 3 elementos". En cada fila: nombre, estado en texto y montos. **No** lee la barra (tiene `aria-hidden`) |
| ☐ | Botones de ícono | "Editar el presupuesto de Transporte", "Borrar la meta Viaje a Cartagena" (nunca "botón" sin nombre) |
| ☐ | Error dentro de un diálogo | Lo anuncia **solo**, sin mover el foco (`role="alert"`) |
| ☐ | Toast | "Presupuesto actualizado" (`role="status"`) |

### 3.3 Color, zoom y movimiento
| ☐ | Prueba | Cómo | Esperado |
|---|---|---|---|
| ☐ | Sin depender del color | DevTools → Rendering → *Emulate vision deficiencies* → **Achromatopsia** y luego **Deuteranopia** | Los estados se distinguen igual por el **texto** ("Te pasaste", "Cerca del límite", "Vas bien", "Meta cumplida") |
| ☐ | Zoom 200 % | Ctrl + hasta 200 % con la ventana a 1280 px | Nada se corta ni se superpone. Sin scroll horizontal |
| ☐ | Solo texto más grande | Chrome → Configuración → Apariencia → Tamaño de fuente: **Muy grande** | Las tarjetas crecen, sin texto montado |
| ☐ | Movimiento reducido | Rendering → *prefers-reduced-motion: reduce* | La animación de `.declaracion` no se ejecuta |

---

## 4. Resultados (llenar)

| # | Estado | Mobile claro | Mobile oscuro | Desktop claro | Desktop oscuro | Audits fallidos |
|---|---|---|---|---|---|---|
| 1 | Resumen | | | | | |
| 2 | Metas | | | | | |
| 3 | Metas vacío | | | | | |
| 4 | Sin rutas | | | | | |
| 5 | Movimientos filtrado | | | | | |
| 6 | Diálogo presupuesto | | | | | |
| 7 | Diálogo meta + error | | | | | |
| 8 | Diálogo aporte | | | | | |

**Manuales:** ☐ teclado ☐ NVDA ☐ color ☐ zoom ☐ movimiento. Hallazgos: …

---

## 5. Arreglo previsto: contraste de `.metas .detalle`

En `public/assets/panel.css`, bloque `/* ---------- Metas y presupuestos ---------- */`, reemplaza:
```css
.metas .detalle { display: block; color: var(--muted); font-size: .86rem; margin-top: 2px; }
```
por:
```css
.metas .detalle { display: block; color: var(--text-2); font-size: .86rem; margin-top: 2px; }
```
- `--text-2` sobre `--card-2`: **8,69 : 1** en claro y más alto en oscuro. No es un color nuevo, ya existe en los dos temas.
- La jerarquía visual se mantiene por el **tamaño** (.86rem frente a 1rem de la línea de montos).
- `.aviso-legal` (Deudas y plan) tiene el mismo problema, pero es **código existente**. Lo dejo anotado como candidato para **B1** para no mezclarlo en este PR.
