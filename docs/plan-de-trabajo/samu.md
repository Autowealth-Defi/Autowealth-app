# Plan de Samu · Infraestructura, seguridad y calidad

**Tu área:** que el proyecto funcione y sea seguro: GitHub, Render, revisión automática, pruebas, correos, seguridad y la versión final.
**Tus archivos:** `.github/`, `tests/`, `src/seguridad.js`, `src/sesion.js`, `src/http.js`, `src/cifrado.js`, `src/config.js`, `src/correo.js`, `apps-script/` y `docs/instalacion-y-despliegue.md`, `docs/seguridad-y-cumplimiento.md`.
**Trabajas con todos:** eres quien desbloquea a los demás cuando algo de entorno falla.
**Accesos:** eres administrador del repositorio en GitHub y **dueño del servicio de Render** (en tu propia cuenta). Neon sigue en la cuenta de Juanes y lo administra Garavito.

> Regla de tu área: **`main` siempre funciona.** Lo que llega a `main` se publica solo en Render, así que nada entra sin revisión de otra persona ni con la revisión automática en rojo.

> **Actualizado el 2 de noviembre.** La presentación final es el **viernes 20 de noviembre**. Calendario y prioridades del equipo en [README.md](README.md). **Tu tarea más urgente es la "Tarea 0":** hoy el enlace publicado no muestra el panel. Sin eso no hay demo final.

---

## Tarea 0 · Arreglar el enlace publicado (martes 3 – miércoles 4)

Recuerda: el panel (`/app`) solo aparece **después de iniciar sesión**. Primero descarta eso: entra con una cuenta y abre `https://<tu-servicio>.onrender.com/app`. Si te devuelve a la portada pidiendo sesión, el código está bien y solo faltaba entrar. Si sale "Página no encontrada" o la portada no tiene botón de iniciar sesión, Render está publicando una versión vieja. Revisa en este orden:

> **Diagnóstico (2 de noviembre):** el enlace viejo `https://autowealth-app.onrender.com` es el servicio de Juanes. Responde `/api/salud` con la base de datos conectada, pero publica una versión **anterior** a este repositorio: `/app`, `/privacidad` y las rutas de deudas dan 404. El código de `main` está bien (`public/app.html` existe y `server.js` sirve `/app`). **Solución: crear el servicio en tu cuenta** conectado a `juanesaacosta26/Autowealth-app` (pasos abajo).
>
> Ojo con los nombres: el repositorio del equipo es **`Autowealth-app`**. El que se llama `autowealth` (sin "-app") es una copia del 13 de octubre que nunca se actualizó.

- [x] **¿Cuál servicio es?** Es el servicio viejo de Juanes → termina el traspaso: crea el servicio en tu cuenta (pasos abajo).
- [ ] **Render → Settings:** el repositorio es `juanesaacosta26/Autowealth-app` y la rama es `main`.
- [x] **GitHub:** `public/app.html` está en la rama `main`. Si el panel quedó en una rama `feature/...` o en un PR sin fusionar, fusiónalo (con revisión).
- [ ] **Render → Events:** el último despliegue dice *Live*. Si dice *Failed*, en **Logs** busca la línea con ❌: dice qué variable falta.
- [ ] Abre `https://<tu-servicio>.onrender.com/api/salud` → debe responder `{"ok":true,"baseDeDatos":"conectada"}`.
- [ ] Pon la URL real en el `README.md` (PR) y avísale al equipo por el grupo.

### Si hay que crear el servicio en tu cuenta
Pasos completos en [instalacion-y-despliegue.md §4](../instalacion-y-despliegue.md#4-publicar-en-render).
- [ ] Juanes copia **todas** las variables de su servicio viejo al gestor de contraseñas del equipo (Bitwarden). **Nunca** por WhatsApp ni por el grupo.
- [ ] En [render.com](https://render.com), con tu cuenta de GitHub: **New → Web Service** → `juanesaacosta26/Autowealth-app`. Nombre `autowealth`, Branch `main`, Region **Ohio (US East)**, Build `npm install`, Start `npm start`, Instance **Free**, Auto-Deploy **After CI Checks Pass**. Si el repositorio no aparece, ver [Si Render no muestra el repositorio](../instalacion-y-despliegue.md#si-render-no-muestra-el-repositorio).
- [ ] En **Environment Variables** pega, **exactamente iguales**, los valores del gestor: `NODE_ENV`, `DATABASE_URL`, `SESSION_SECRET`, `DATA_ENCRYPTION_KEY`, `SURVEY_URL`, `EMAIL_PROVIDER`, `GMAIL_SCRIPT_URL`, `GMAIL_SCRIPT_SECRET`, `OPEN_FINANCE_PROVIDER`, `CONSENT_MONTHS`, `ADMIN_USER`, `ADMIN_PASSWORD`. Cuidado con espacios al inicio o al final.
- [ ] **Deploy Web Service** y en **Settings → Health Check Path** escribe `/api/salud`.
- [ ] **Entra con un usuario que ya existía:** si ve sus movimientos sin "(no se pudo leer)", `DATABASE_URL` y `DATA_ENCRYPTION_KEY` quedaron bien.
- [ ] Avísale a Juanes: él **suspende** su servicio viejo (no lo borra todavía). Si el Apps Script de correos tiene la URL vieja en `URL_APP`, cámbiala y publica una versión nueva.

**Listo cuando:** el enlace de Render muestra el panel al iniciar sesión y la URL está en el `README.md`. ← **Hito 0 (miércoles 4)**

---

## Semana A · Correo de recuperación (3–6 nov)

### Sesión 1 · Plantilla del correo en Apps Script
- [ ] Rama `feature/samu-correo-recuperacion`.
- [ ] En `apps-script/Envio-Gmail.gs`, agrega un segundo tipo de correo: si llega `tipo: 'recuperacion'` con `enlace`, envía "Crea una contraseña nueva" con el botón al enlace y el aviso *"Si no fuiste tú, ignora este correo. El enlace vence en 30 minutos."*
- [ ] **Seguridad:** el script solo acepta enlaces que empiecen por la URL de la app (constante `URL_APP`). Así, aunque alguien robara el `SECRETO`, no podría usar el correo para enviar enlaces a otros sitios.
- [ ] Publica una **versión nueva** del Apps Script (la URL no cambia).

### Sesión 2 · `enviarCorreoRecuperacion` en el servidor (viernes 6)
- [ ] En `src/correo.js` agrega `enviarCorreoRecuperacion(para, nombre, enlace)` para los 3 proveedores (`consola` muestra el enlace en la terminal, `gmail` llama al Apps Script con `tipo: 'recuperacion'`, `brevo` usa una plantilla HTML).
- [ ] Pásale la función a Juanes y explícale cómo llamarla.

**Listo cuando:** la función está en `main` y Juanes puede usarla. ← **Hito A**
**Pídele a Claude:** *"Agrega enviarCorreoRecuperacion a src/correo.js para los proveedores consola, gmail y brevo, siguiendo el estilo de enviarCorreoEncuesta. Para gmail, envía tipo 'recuperacion' al Apps Script."*

---

## Semana B · Pruebas y seguridad (9–13 nov)

### Sesión 1 · Pruebas automáticas
- [ ] Corre `tests/` con la rama `pruebas` de Neon.
- [ ] Ayuda a Juanes con las pruebas de presupuestos, metas y recuperar contraseña.
- [ ] Agrega pruebas de lo que no está cubierto: límite de intentos de ingreso (429 al noveno intento), `/admin` sin contraseña (404), sesión vencida o alterada.

### Sesión 2 · Revisión OWASP
- [ ] Haz la prueba manual de la [lista OWASP](../seguridad-y-cumplimiento.md#lista-owasp-para-la-semana-3-prueba-manual) con dos usuarios.
- [ ] Crea un issue por cada hallazgo (etiqueta `seguridad`) y asígnalo a quien corresponda.
- [ ] Revisa las cabeceras de la URL de Render en [securityheaders.com](https://securityheaders.com) y guarda la captura para la presentación.

### Sesión 3 · Prueba completa en producción (viernes 13)
- [ ] Recorre en la URL de Render **toda** la app: registro, correo, panel, banco de prueba, CSV, presupuestos, metas, recuperar contraseña, privacidad y eliminar cuenta. En celular y computador.
- [ ] Anota los errores en issues y persigue que se corrijan antes del martes 17.

**Listo cuando:** pruebas en verde, hallazgos OWASP resueltos o asignados. ← **Hito B**

---

## Semana C · Versión final y presentación (17–20 nov)

### Sesión 1 · Publicar la versión `v1.0` (martes 17, congelamiento)
- [ ] Tras fusionar lo último, en GitHub: **Releases → Draft a new release** → etiqueta `v1.0` con las notas de la versión (qué incluye, con ayuda de todos).
- [ ] En Render → **Events**, confirma que publicó exactamente el commit de `v1.0`.
- [ ] Con Garavito: carga de los datos de demostración en producción.
- [ ] Revisa que `README.md` y `docs/` estén al día.

### Sesión 2 · Tu parte de la presentación
- [ ] 2–3 diapositivas: arquitectura (servidor, base de datos, correo, Render) y "Cómo protegemos los datos" (cifrado, sesiones, OWASP, captura de las cabeceras, regulación).
- [ ] Plan B de la demo: el video de respaldo de Aleja y una sesión ya iniciada en otro navegador.
- [ ] **Miércoles 18 · ensayo general** y **viernes 20 · presentación final:** despierta el servidor de Render 10 minutos antes y verifica `/api/salud`.

---

## Si sobra tiempo (prioridad 3)
- **Política de seguridad sin `'unsafe-inline'`:** con Aleja y David, mover los scripts en línea (el del tema en el `<head>` de `index.html`, `app.html` y `privacidad.html`) a `public/assets/tema.js`; quitar `'unsafe-inline'` de `script-src` en `src/http.js`; revisar todas las páginas con F12 → Consola. Correr `npm audit`.
  **Pídele a Claude:** *"Revisa todas las páginas de public/ y dime qué scripts o atributos en línea impedirían quitar 'unsafe-inline' de script-src."*
- **Monitoreo:** UptimeRobot sobre `/api/salud` cada 5 minutos, cuidando no pasarse de 750 horas al mes. Documentar en `docs/instalacion-y-despliegue.md` cómo revisar los logs y qué hacer si la app se cae.
