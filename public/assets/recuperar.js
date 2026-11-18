// =====================================================================
//  recuperar.js — Página /recuperar?token=... (enlace del correo).
//  Pide la contraseña nueva dos veces y la envía a POST /api/recuperar/confirmar.
//  El token no se guarda en ningún lado: se lee de la URL y se quita de la barra
//  de direcciones para que no quede en el historial del navegador.
// =====================================================================
(function () {
  'use strict';

  // Mismo tema (claro u oscuro) que el resto de la app
  try {
    const tema = localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', tema);
  } catch (e) { /* sin localStorage: queda el tema claro */ }

  const $ = (sel) => document.querySelector(sel);
  const token = new URLSearchParams(location.search).get('token') || '';
  try { history.replaceState(null, '', location.pathname); } catch (e) { /* no pasa nada */ }

  if (!/^[A-Za-z0-9_-]{20,200}$/.test(token)) {
    $('#sinToken').hidden = false;
    return;
  }
  $('#formulario').hidden = false;
  $('#clave').focus();

  $('#mostrar').addEventListener('change', (e) => {
    const tipo = e.target.checked ? 'text' : 'password';
    $('#clave').type = tipo; $('#clave2').type = tipo;
  });

  function mostrarError(texto) {
    const m = $('#mensaje');
    m.textContent = texto; // textContent: nunca se interpreta como HTML
    m.hidden = false;
  }

  $('#formulario').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#mensaje').hidden = true;
    const password = $('#clave').value;
    if (password.length < 8) return mostrarError('La contraseña debe tener al menos 8 caracteres.');
    if (password.length > 128) return mostrarError('La contraseña es demasiado larga.');
    if (password !== $('#clave2').value) return mostrarError('Las contraseñas no coinciden.');

    const boton = $('#guardar');
    boton.disabled = true; boton.textContent = 'Guardando…';
    try {
      const res = await fetch('/api/recuperar/confirmar', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const datos = await res.json().catch(() => ({ ok: false, error: 'Respuesta inesperada del servidor.' }));
      if (!datos.ok) throw new Error(datos.error || 'No se pudo cambiar la contraseña.');
      $('#formulario').hidden = true;
      $('#listo').hidden = false;
      $('#listo a').focus();
    } catch (err) {
      mostrarError(err.message === 'Failed to fetch' ? 'No hay conexión con el servidor. Revisa tu internet.' : err.message);
      boton.disabled = false; boton.textContent = 'Guardar contraseña nueva';
    }
  });
})();
