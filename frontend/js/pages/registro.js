// ===== REGISTRO PAGE =====

function renderRegistro() {
  const root = document.getElementById('app-root');
  root.style.cssText = 'padding:0;max-width:none;';

  root.innerHTML = `
    <div class="login-layout">
      <div class="login-panel-left">
        <div style="text-align:center;max-width:320px;">
          <div class="login-icon">${Icons.ShoppingBag(32)}</div>
          <h1 class="login-logo">Tintin<br/><span>Luxury</span></h1>
          <p class="login-tagline">
            Únete a nuestra comunidad y descubre piezas únicas de lujo diseñadas para ti.
          </p>
        </div>
      </div>

      <div class="login-panel-right">
        <div class="login-form">
          <div class="logo-mobile">Tintin <span>Luxury</span></div>
          <h2 class="login-title">Crear cuenta</h2>
          <p class="login-subtitle">Completa los datos para registrarte</p>

          <div id="form-error" class="form-error" style="display:none;"></div>

          <div class="form-group">
            <label class="form-label">Nombre completo</label>
            <input type="text" id="reg-nombre" placeholder="Tu nombre completo" autocomplete="name" />
          </div>

          <div class="form-group">
            <label class="form-label">Correo electrónico</label>
            <input type="email" id="reg-email" placeholder="tu@correo.com" autocomplete="email" />
          </div>

          <div class="form-group">
            <label class="form-label">Teléfono (10 dígitos)</label>
            <input type="tel" id="reg-telefono" placeholder="5512345678" maxlength="10" autocomplete="tel" />
          </div>

          <div class="form-group">
            <label class="form-label">Contraseña</label>
            <div class="input-wrapper">
              <input type="password" id="reg-password"
                placeholder="Mínimo 8 caracteres" autocomplete="new-password"
                style="padding-right:42px;" />
              <button class="input-icon-right" id="toggle-pwd" type="button">
                ${Icons.Eye(16)}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Confirmar contraseña</label>
            <div class="input-wrapper">
              <input type="password" id="conf-password"
                placeholder="Mínimo 8 caracteres" autocomplete="new-password"
                style="padding-right:42px;" />
              <button class="input-icon-right" id="toggle-conf" type="button">
                ${Icons.Eye(16)}
              </button>
            </div>
          </div>

          <button class="btn btn-primary btn-full btn-lg" id="register-btn">
            Crear cuenta
          </button>

          <p style="text-align:center;margin-top:16px;font-size:14px;color:var(--muted-fg);">
            ¿Ya tienes cuenta?
            <a href="/login" style="color:var(--accent);text-decoration:none;font-weight:500;">
              Inicia sesión
            </a>
          </p>
        </div>
      </div>
    </div>
  `;

  //Un toggle para cada campo de contraseñas
  document.getElementById('toggle-pwd')?.addEventListener('click', function () {
    const show = document.getElementById('reg-password').type === 'password';
    document.getElementById('reg-password').type  = show ? 'text' : 'password';
    this.innerHTML = show ? Icons.EyeOff(16) : Icons.Eye(16);
  });

  document.getElementById('toggle-conf')?.addEventListener('click', function () {
    const show = document.getElementById('conf-password').type === 'password';
    document.getElementById('conf-password').type = show ? 'text' : 'password';
    this.innerHTML = show ? Icons.EyeOff(16) : Icons.Eye(16);
  });

  document.getElementById('register-btn')?.addEventListener('click', doRegister);
  document.getElementById('conf-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doRegister();
  });
}

function showFormError(msg) {
  const el = document.getElementById('form-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function setFieldError(fieldId, hasError) {
  const input = document.getElementById(fieldId);
  if (!input) return;
  input.style.borderColor = hasError ? 'var(--destructive)' : '';
}

function clearFieldErrors() {
  ['reg-nombre', 'reg-email', 'reg-telefono', 'reg-password', 'conf-password'].forEach(id => {
    setFieldError(id, false);
  });
  const el = document.getElementById('form-error');
  if (el) el.style.display = 'none';
}

async function doRegister() {
  clearFieldErrors();

  const nombre          = document.getElementById('reg-nombre')?.value.trim();
  const email           = document.getElementById('reg-email')?.value.trim();
  const telefono        = document.getElementById('reg-telefono')?.value.trim();
  const password        = document.getElementById('reg-password')?.value;
  const confirmPassword = document.getElementById('conf-password')?.value;

  let hasEmpty = false;
  if (!nombre)          { setFieldError('reg-nombre', true);    hasEmpty = true; }
  if (!email)           { setFieldError('reg-email', true);     hasEmpty = true; }
  if (!telefono)        { setFieldError('reg-telefono', true);  hasEmpty = true; }
  if (!password)        { setFieldError('reg-password', true);  hasEmpty = true; }
  if (!confirmPassword) { setFieldError('conf-password', true); hasEmpty = true; }

  if (hasEmpty) {
    showFormError('Por favor completa todos los campos.');
    return;
  }

  if (password !== confirmPassword) {
    setFieldError('reg-password', true);
    setFieldError('conf-password', true);
    showFormError('Las contraseñas no coinciden.');
    return;
  }

  const btn = document.getElementById('register-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Registrando...'; }

  try {
    await Api.register(nombre, email, password, confirmPassword, telefono);
    Nav.go('/login?registered=1');
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Crear cuenta'; }

    const msg = err.message || 'Error al registrarse. Intenta de nuevo.';

    if (msg.includes('correo electrónico válido') || msg.includes('cuenta con ese correo')) {
      setFieldError('reg-email', true);
    } else if (msg.includes('teléfono')) {
      setFieldError('reg-telefono', true);
    } else if (msg.includes('contraseña') && msg.includes('8')) {
      setFieldError('reg-password', true);
    } else if (msg.includes('contraseñas no coinciden')) {
      setFieldError('reg-password', true);
      setFieldError('conf-password', true);
    }

    showFormError(msg);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (AppState.currentUser) {
    Nav.go(AppState.currentUser.rol === 'CLIENTE' ? Nav.catalogo : Nav.dashboard);
    return;
  }
  renderRegistro();
});
