# Plan de Aleja · Página de inicio, contenido y legal

**Tu área:** lo primero que ve la gente: la página de inicio, el registro y el inicio de sesión, las páginas legales, la recuperación de contraseña y la encuesta. Además, **coordinas la presentación**.
**Tus archivos:** `public/index.html`, `public/assets/inicio.css`, `public/assets/inicio.js`, `public/privacidad.html`, páginas nuevas (`terminos.html`, `recuperar.html`) y `docs/encuesta.md`.
**Trabajas de cerca con:** Juanes (rutas de registro, ingreso y recuperación), David (que la página de inicio y el panel se vean como el mismo producto) y Samu (seguridad de las páginas).

> Regla de tu área: **una app de finanzas vive de la confianza.** Nada de cifras, testimonios o promesas inventadas. Si no es verdad o no lo podemos demostrar, no va en la página.

> **Actualizado el 2 de noviembre.** La presentación final es el **viernes 20 de noviembre**. Calendario y prioridades del equipo en [README.md](README.md). Tu prioridad esta semana es que **la portada sea honesta**: es lo primero que verá el jurado.

---

## Antes de seguir · Revisa que esto ya esté hecho (mar 3)

- [ ] La app corre en tu computador con tu rama de Neon.
- [ ] Existen los issues de contenido (etiqueta `contenido`) con lo que no es verdad o no está terminado: la meta descripción con *"Más de 50,000 usuarios"*, los **testimonios inventados** (Mariana G., Carlos R., Laura F., Javier M.), *"100% seguro"*, el *"retorno anual promedio"*, los enlaces `autowealth.example.com` y los enlaces del pie que no llevan a ningún lado.
- [ ] Tienes las capturas de Lighthouse del "antes". Si no, tómalas ya (F12 → **Lighthouse**, móvil y escritorio): sirven para la presentación.

---

## Semana A · Contenido honesto y páginas legales (3–6 nov)

### Sesión 1 · Corregir el contenido
- [ ] Rama `feature/aleja-contenido`.
- [ ] Reemplaza los testimonios inventados. Opciones honestas: (a) quitar la sección; (b) *"Lo que nos dijeron en la encuesta"*, con respuestas reales y anónimas autorizadas para fines de estudio; (c) "casos de ejemplo" claramente marcados como ilustrativos.
- [ ] Cambia las cifras falsas por hechos verificables (*"Datos cifrados con AES-256"*, *"Solo lectura: no movemos tu dinero"*, *"Revoca el acceso cuando quieras"*).
- [ ] Pesos colombianos en todos los ejemplos.
- [ ] Ajusta la sección de funciones a lo que la app **sí** hace.

**Pídele a Claude:** *"Revisa public/index.html y señálame cada afirmación que no podamos demostrar. Propón un texto honesto para cada una, en español colombiano."*

### Sesión 2 · Términos y condiciones
- [ ] Crea `public/terminos.html` con el mismo estilo de `privacidad.html`: qué es el servicio (prototipo académico), uso aceptable, que las recomendaciones son **educación financiera y no asesoría**, limitación de responsabilidad, cómo eliminar la cuenta, ley aplicable (Colombia) y contacto.
- [ ] Para que el servidor la muestre, agrega `'/terminos': 'terminos.html'` a `PAGINAS` en `server.js` (avísale a Juanes en el PR).
- [ ] Enlázala desde el pie de página y desde el formulario de registro.

### Sesión 3 · Política de privacidad y "¿Olvidaste tu contraseña?" (viernes 6)
- [ ] En `public/privacidad.html`, completa los campos `[entre corchetes]` con los datos del proyecto académico y agrega que la información del Google Form se usa con fines de estudio.
- [ ] Rama `feature/aleja-recuperar`: en el formulario de inicio de sesión agrega el enlace **"¿Olvidaste tu contraseña?"**, con un paso donde se escribe el correo y se envía a `POST /api/recuperar`.
- [ ] El mensaje después de enviar es **siempre el mismo**: *"Si ese correo está registrado, te enviamos un enlace para crear una contraseña nueva. Revisa también spam."* (No digas si el correo existe.)

**Listo cuando:** contenido corregido, términos publicados y política completa en `main`. ← **Hito A**

---

## Semana B · Recuperar contraseña y encuesta (9–13 nov)

> Juanes publica `POST /api/recuperar` y `POST /api/recuperar/confirmar` ([api.md §6](../api.md#recuperar-contraseña)) en esta semana. Hasta que estén, prueba con datos de ejemplo.

### Sesión 1 · Página para crear la contraseña nueva
- [ ] Crea `public/recuperar.html` (el enlace del correo lleva a `/recuperar?token=...`) y agrégala a `PAGINAS` en `server.js`.
- [ ] Formulario: contraseña nueva + confirmación (mínimo 8 caracteres, que coincidan). Envía `{ token, password }` a `POST /api/recuperar/confirmar`.
- [ ] Si sale bien: *"Listo, ya puedes iniciar sesión"* y un botón al inicio. Si el token venció: mensaje claro y enlace para pedir otro.
- [ ] El token **no** debe quedar en el historial: después de leerlo, límpialo de la URL con `history.replaceState`.

**Pídele a Claude:** *"Crea public/recuperar.html con el estilo de privacidad.html y un formulario que llame a /api/recuperar/confirmar. Pon el JavaScript en public/assets/recuperar.js (no en línea)."*

### Sesión 2 · Prueba completa con Juanes y Samu
- [ ] De punta a punta: pedir el enlace → correo → página → contraseña nueva → entrar.
- [ ] Casos raros: token usado dos veces, token vencido, contraseñas distintas, correo inexistente.
- [ ] Revisa la portada y la página nueva en celular y en modo oscuro.

### Sesión 3 · Resultados de la encuesta (viernes 13)
- [ ] Descarga las respuestas del Google Form y haz un resumen con 4–5 gráficas o cifras. Con Garavito, compara "lo que la gente cree" (preguntas 5, 6 y 8) con lo que muestra el panel (ver [encuesta.md](../encuesta.md)).
- [ ] Pide a cada integrante sus diapositivas para el **lunes 16**.

**Listo cuando:** recuperar contraseña funciona en Render y los resultados de la encuesta están listos. ← **Hito B**

---

## Semana C · Presentación (17–20 nov)

### Sesión 1 · Armar la presentación (martes 17)
- [ ] Estructura (≈ 15 min) con las diapositivas de todos: problema → solución → demo en vivo → arquitectura → seguridad y regulación → resultados de la encuesta → aprendizajes.
- [ ] Unifica el diseño con los colores de Auto-Wealth. Incluye las capturas de Lighthouse "antes / después" si alcanzaste a mejorar la nota.

### Sesión 2 · Ensayo y video
- [ ] **Miércoles 18 · ensayo general:** diriges el ensayo y controlas los tiempos.
- [ ] **Jueves 19:** graba el **video de respaldo** de la demo (por si falla internet).
- [ ] **Viernes 20 · presentación final.**

---

## Si sobra tiempo (prioridad 3)
- **Accesibilidad:** corregir los 5 problemas de la auditoría de Lighthouse y tomar las capturas del "después".
- **Política de seguridad:** con Samu, mover el script de tema del `<head>` a `public/assets/tema.js` para quitar `'unsafe-inline'`.
