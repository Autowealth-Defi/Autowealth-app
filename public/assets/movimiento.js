// =====================================================================
//  movimiento.js — Detalles de movimiento del panel (/app).
//   1. Onda: al presionar un botón sale un círculo de luz desde el punto
//      donde se tocó.
//   2. Luz que sigue al mouse sobre las tarjetas (.bloque y .camino).
//  No lee ni cambia datos, no llama a la API y no usa innerHTML.
//  Los estilos (.mv-onda, --mx, --my) están en movimiento.css y panel.css.
// =====================================================================
(function () {
  'use strict';

  // Si la persona pidió "reducir movimiento" en su sistema, no hacemos nada.
  const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ----- 1. Onda al presionar -----
  // Escuchamos en todo el documento (delegación) para que también funcione con
  // los botones que panel.js dibuja después de cargar los datos.
  document.addEventListener('pointerdown', (evento) => {
    if (reducirMovimiento.matches) return;
    const boton = evento.target.closest('.btn, .camino, .icono-btn');
    if (!boton || boton.disabled) return;

    const caja = boton.getBoundingClientRect();
    const lado = Math.max(caja.width, caja.height);
    const onda = document.createElement('span');
    onda.className = 'mv-onda';
    onda.setAttribute('aria-hidden', 'true');
    // style.setProperty (CSSOM) no depende de 'unsafe-inline' en la CSP.
    onda.style.setProperty('width', lado + 'px');
    onda.style.setProperty('height', lado + 'px');
    onda.style.setProperty('left', (evento.clientX - caja.left - lado / 2) + 'px');
    onda.style.setProperty('top', (evento.clientY - caja.top - lado / 2) + 'px');
    boton.appendChild(onda);
    onda.addEventListener('animationend', () => onda.remove());
  });

  // ----- 2. Luz que sigue al mouse -----
  // Solo con mouse: en el celular no hay "puntero flotando" y sería gasto inútil.
  // requestAnimationFrame agrupa los movimientos para actualizar como máximo una vez por cuadro.
  let pendiente = null;
  document.addEventListener('pointermove', (evento) => {
    if (evento.pointerType !== 'mouse' || reducirMovimiento.matches) return;
    const tarjeta = evento.target.closest('.bloque, .camino');
    if (!tarjeta) return;
    const x = evento.clientX, y = evento.clientY;
    if (pendiente) cancelAnimationFrame(pendiente);
    pendiente = requestAnimationFrame(() => {
      const caja = tarjeta.getBoundingClientRect();
      tarjeta.style.setProperty('--mx', (x - caja.left) + 'px');
      tarjeta.style.setProperty('--my', (y - caja.top) + 'px');
      pendiente = null;
    });
  }, { passive: true });
})();
