// =====================================================================
//  inicio.js — Lógica de la página de inicio (/): tema claro/oscuro, animaciones,
//  registro e inicio de sesión. Responsable: Aleja.
//  Llama a la API: /api/registro, /api/ingreso, /api/recuperar, /api/yo.
// =====================================================================
(function() {
    'use strict';

    // ===== TEMA =====
    const themeButtons = document.querySelectorAll('[data-theme]');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeButtons.forEach(btn => {
            const isActive = btn.dataset.theme === theme;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive);
        });
    }
    setTheme(savedTheme);
    themeButtons.forEach(btn => btn.addEventListener('click', () => setTheme(btn.dataset.theme)));

    // ===== REVEAL =====
    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
    revealElements.forEach(el => revealObserver.observe(el));

    // ===== OVERLAY =====
    const overlay = document.getElementById('authOverlay');
    const closeOverlay = document.getElementById('closeOverlay');
    const loginOpenBtn = document.getElementById('loginOpenBtn');
    const registerOpenBtn = document.getElementById('registerOpenBtn');
    const heroRegisterBtn = document.getElementById('heroRegisterBtn');
    const ctaRegisterBtn = document.getElementById('ctaRegisterBtn');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const toggleText = document.getElementById('toggleText');
    const loginFields = document.getElementById('loginFields');
    const registerFields = document.getElementById('registerFields');
    const recoveryFields = document.getElementById('recoveryFields');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const authTitle = document.getElementById('authTitle');
    const authSub = document.getElementById('authSub');
    let isLogin = true;
    let isRecovering = false;

    function openOverlay(mode) {
        isRecovering = false;
        isLogin = (mode === 'login');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        recoveryFields.style.display = 'none';
        if (isLogin) {
            authTitle.textContent = 'Bienvenido de vuelta';
            authSub.textContent = 'Inicia sesión en tu cuenta';
            loginFields.style.display = 'block';
            registerFields.style.display = 'none';
            authSubmitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar sesión';
            toggleText.innerHTML = '¿No tienes cuenta? <a id="toggleAuthLink">Regístrate aquí</a>';
            document.getElementById('toggleAuthLink').addEventListener('click', () => openOverlay('register'));
        } else {
            authTitle.textContent = 'Crea tu cuenta';
            authSub.textContent = 'Regístrate para usar el prototipo Auto-Wealth';
            loginFields.style.display = 'none';
            registerFields.style.display = 'block';
            authSubmitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Registrarse';
            toggleText.innerHTML = '¿Ya tienes cuenta? <a id="toggleAuthLink">Inicia sesión</a>';
            document.getElementById('toggleAuthLink').addEventListener('click', () => openOverlay('login'));
        }
    }

    function closeOverlayFn() {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    closeOverlay.addEventListener('click', closeOverlayFn);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlayFn(); });
    loginOpenBtn.addEventListener('click', () => openOverlay('login'));
    registerOpenBtn.addEventListener('click', () => openOverlay('register'));
    heroRegisterBtn.addEventListener('click', () => openOverlay('register'));
    ctaRegisterBtn.addEventListener('click', () => openOverlay('register'));
    // ===== CONEXIÓN CON EL SERVIDOR (Node.js + base de datos) =====
    // La página y el servidor están en la misma dirección, por eso las rutas empiezan con "/api".
    const FORM_LINK = 'https://forms.gle/q7PYdBcBk3SMQzUPA';

    const authMsg = document.getElementById('authMsg');
    function showAuthMsg(text, isError) {
        authMsg.textContent = text;
        authMsg.style.display = text ? 'block' : 'none';
        authMsg.style.color = isError ? '#e74c3c' : 'var(--text-secondary)';
    }
    function setBusy(busy, label) {
        authSubmitBtn.disabled = busy;
        authSubmitBtn.style.opacity = busy ? '0.7' : '';
        if (busy) authSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + label;
    }
    function resetSubmitLabel() {
        authSubmitBtn.innerHTML = isRecovering
            ? '<i class="fas fa-envelope"></i> Enviar enlace'
            : isLogin
            ? '<i class="fas fa-sign-in-alt"></i> Iniciar sesión'
            : '<i class="fas fa-user-plus"></i> Registrarse';
    }
    const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

    // Envía datos al servidor y devuelve su respuesta
    async function api(ruta, datos) {
        let res;
        try {
            res = await fetch(ruta, {
                method: datos ? 'POST' : 'GET',
                headers: datos ? { 'Content-Type': 'application/json' } : {},
                body: datos ? JSON.stringify(datos) : undefined,
                credentials: 'same-origin'
            });
        } catch (e) {
            throw new Error('No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.');
        }
        const r = await res.json().catch(() => ({ ok: false, error: 'Respuesta inesperada del servidor.' }));
        if (!r.ok) throw new Error(r.error || 'Algo salió mal. Intenta de nuevo.');
        return r;
    }

    forgotPasswordLink.addEventListener('click', () => {
        isLogin = true;
        isRecovering = true;
        loginFields.style.display = 'none';
        registerFields.style.display = 'none';
        recoveryFields.style.display = 'block';
        authTitle.textContent = 'Recuperar contraseña';
        authSub.textContent = 'Escribe el correo asociado a tu cuenta y te enviaremos un enlace.';
        document.getElementById('recoveryEmail').value = document.getElementById('authEmail').value.trim();
        authSubmitBtn.innerHTML = '<i class="fas fa-envelope"></i> Enviar enlace';
        toggleText.innerHTML = '<a id="toggleAuthLink">Volver a iniciar sesión</a>';
        document.getElementById('toggleAuthLink').addEventListener('click', () => openOverlay('login'));
        showAuthMsg('');
    });

    // ----- Estado de la sesión en la barra superior -----
    function mostrarSesion(nombre) {
        if (nombre) {
            loginOpenBtn.innerHTML = '<i class="fas fa-chart-pie"></i> Mi panel';
            loginOpenBtn.setAttribute('aria-label', 'Ir a mi panel, ' + nombre);
            loginOpenBtn.dataset.sesion = '1';
            registerOpenBtn.style.display = 'none';
        } else {
            loginOpenBtn.textContent = 'Iniciar sesión';
            loginOpenBtn.setAttribute('aria-label', 'Iniciar sesión');
            delete loginOpenBtn.dataset.sesion;
            registerOpenBtn.style.display = '';
        }
    }
    api('/api/yo').then(r => mostrarSesion(r.sesion ? r.nombre : null)).catch(() => {});

    // Si hay sesión abierta, el botón de la barra lleva al panel
    loginOpenBtn.addEventListener('click', (e) => {
        if (!loginOpenBtn.dataset.sesion) return;
        e.stopImmediatePropagation();
        location.href = '/app';
    }, true);

    // Mensajes según cómo se llegó a la página
    const params = new URLSearchParams(location.search);
    if (params.has('entrar') || params.has('sesion')) {
        openOverlay('login');
        if (params.get('sesion') === 'vencida' || params.has('entrar')) showAuthMsg('Inicia sesión para entrar a tu panel.', false);
        history.replaceState(null, '', '/');
    }
    if (params.get('cuenta') === 'eliminada') {
        alert('Tu cuenta y todos tus datos fueron eliminados.');
        history.replaceState(null, '', '/');
    }

    function openSurveyOverlay(name, correoEnviado) {
        document.getElementById('surveyTitle').textContent = correoEnviado
            ? '¡Revisa tu correo!'
            : '¡Responde la encuesta!';
        document.getElementById('surveySub').textContent = correoEnviado
            ? '¡Bienvenido/a' + (name ? ', ' + name : '') + '! Te enviamos un correo con una breve encuesta sobre tus finanzas.'
            : '¡Bienvenido/a' + (name ? ', ' + name : '') + '! Tu cuenta quedó creada. Responde aquí la breve encuesta sobre tus finanzas.';
        surveyOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    document.getElementById('authForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        showAuthMsg('');
        try {
            if (isRecovering) {
                const email = document.getElementById('recoveryEmail').value.trim().toLowerCase();
                if (!isValidEmail(email)) { showAuthMsg('Escribe un correo válido.', true); return; }
                setBusy(true, 'Enviando...');
                await api('/api/recuperar', { email });
                showAuthMsg('Si ese correo está registrado, te enviamos un enlace para crear una contraseña nueva. Revisa también spam.', false);
            } else if (isLogin) {
                const email = document.getElementById('authEmail').value.trim().toLowerCase();
                const password = document.getElementById('authPassword').value;
                if (!isValidEmail(email) || !password) { showAuthMsg('Escribe tu correo y tu contraseña.', true); return; }
                setBusy(true, 'Ingresando...');
                const r = await api('/api/ingreso', { email: email, password: password });
                document.getElementById('authForm').reset();
                location.href = '/app';
                return;
            } else {
                const nombre = document.getElementById('authName').value.trim();
                const email = document.getElementById('regEmail').value.trim().toLowerCase();
                const telefono = document.getElementById('regPhone').value.trim();
                const cedula = document.getElementById('regCedula').value.replace(/[.\s-]/g, '');
                const password = document.getElementById('regPassword').value;
                const password2 = document.getElementById('regPassword2').value;
                const acepta = document.getElementById('regConsent').checked;
                if (!nombre || !email || !telefono || !cedula || !password) { showAuthMsg('Por favor completa todos los campos.', true); return; }
                if (!isValidEmail(email)) { showAuthMsg('Escribe un correo válido.', true); return; }
                if (!/^\d{5,12}$/.test(cedula)) { showAuthMsg('La cédula debe tener entre 5 y 12 números.', true); return; }
                if (password.length < 8) { showAuthMsg('La contraseña debe tener al menos 8 caracteres.', true); return; }
                if (password !== password2) { showAuthMsg('Las contraseñas no coinciden.', true); return; }
                if (!acepta) { showAuthMsg('Debes autorizar el tratamiento de tus datos para registrarte.', true); return; }
                setBusy(true, 'Registrando...');
                const r = await api('/api/registro', {
                    nombre: nombre, email: email, telefono: telefono, cedula: cedula,
                    password: password, acepta_datos: true
                });
                document.getElementById('authForm').reset();
                closeOverlayFn();
                mostrarSesion(r.nombre);
                openSurveyOverlay(r.nombre, r.correoEnviado);
            }
        } catch (err) {
            showAuthMsg(err.message, true);
        } finally {
            setBusy(false);
            resetSubmitLabel();
        }
    });

    // ===== OVERLAY POST-REGISTRO (encuesta en Google Forms) =====
    const surveyOverlay = document.getElementById('surveyOverlay');
    const closeSurveyOverlay = document.getElementById('closeSurveyOverlay');
    const skipSurveyBtn = document.getElementById('skipSurveyBtn');
    const surveyNowBtn = document.getElementById('surveyNowBtn');
    surveyNowBtn.href = FORM_LINK;

    function closeSurveyOverlayFn() {
        surveyOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    closeSurveyOverlay.addEventListener('click', closeSurveyOverlayFn);
    skipSurveyBtn.addEventListener('click', () => { location.href = '/app'; });
    surveyNowBtn.addEventListener('click', closeSurveyOverlayFn);
    surveyOverlay.addEventListener('click', (e) => { if (e.target === surveyOverlay) closeSurveyOverlayFn(); });

    // ===== RIPPLE =====
    document.querySelectorAll('.ripple').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size/2;
            const y = e.clientY - rect.top - size/2;
            const span = document.createElement('span');
            span.style.cssText = 'position:absolute; width:'+size+'px; height:'+size+'px; background:rgba(255,255,255,0.2); border-radius:50%; left:'+x+'px; top:'+y+'px; pointer-events:none; transform:scale(0); animation:rippleAnim 0.6s linear;';
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(span);
            setTimeout(() => span.remove(), 600);
        });
    });
    if (!document.getElementById('rippleStyle')) {
        const s = document.createElement('style');
        s.id = 'rippleStyle';
        s.textContent = '@keyframes rippleAnim { to { transform:scale(4); opacity:0; } }';
        document.head.appendChild(s);
    }

})();
