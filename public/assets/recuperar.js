(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';
  // Conserva el token solo en memoria y lo quita de la barra de direcciones e historial.
  window.history.replaceState(null, document.title, window.location.pathname);

  const form = document.getElementById('formRecuperar');
  const password = document.getElementById('password');
  const confirmacion = document.getElementById('confirmacion');
  const button = document.getElementById('enviar');
  const mensaje = document.getElementById('mensaje');

  function mostrar(texto, error) {
    mensaje.textContent = texto;
    mensaje.classList.toggle('error', Boolean(error));
  }

  if (!token) {
    form.hidden = true;
    mostrar('El enlace no es válido o ya no está disponible. Solicita uno nuevo desde el inicio de sesión.', true);
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    mostrar('', false);

    if (password.value.length < 8) {
      mostrar('La contraseña debe tener al menos 8 caracteres.', true);
      password.focus();
      return;
    }
    if (password.value !== confirmacion.value) {
      mostrar('Las contraseñas no coinciden.', true);
      confirmacion.focus();
      return;
    }
    if (!token) return;

    button.disabled = true;
    try {
      const response = await fetch('/api/recuperar/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: password.value }),
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('enlace inválido o vencido');
      mostrar('Listo, ya puedes iniciar sesión.', false);
      form.hidden = true;
    } catch {
      mostrar('No se pudo cambiar la contraseña. El enlace puede haber vencido o ya haberse usado. Solicita uno nuevo desde el inicio de sesión.', true);
    } finally {
      button.disabled = false;
    }
  });
})();
