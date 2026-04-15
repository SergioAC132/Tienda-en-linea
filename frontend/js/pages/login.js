// ===== LOGIN PAGE =====
let _showPassword = false;
let _loading = false;

function renderLogin() {
  const root = document.getElementById('app-root');
  root.style.cssText = 'padding:0;max-width:none;';

  root.innerHTML = `
    <div class="login-layout">
      <div class="login-panel-left">
        <div style="text-align:center;max-width:320px;">
          <div class="login-icon">${Icons.ShoppingBag(32)}</div>
          <h1 class="login-logo">Tintin<br/><span>Luxury</span></h1>
          <p class="login-tagline">
            La moda de lujo al alcance de tus manos. Piezas únicas, diseñadas para quienes aprecian lo extraordinario.
          </p>
        </div>
      </div>

      <div class="login-panel-right">
        <div class="login-form">
          <div class="logo-mobile">Tintin <span>Luxury</span></div>
          <h2 class="login-title">Iniciar sesión</h2>
          <p class="login-subtitle">Ingresa tus credenciales para continuar</p>

          <div id="form-error" class="form-error" style="display:none;"></div>

          <div class="form-group">
            <label class="form-label">Correo electrónico</label>
            <input type="email" id="login-email" placeholder="tu@correo.com" autocomplete="email" />
          </div>

          <div class="form-group">
            <label class="form-label">Contraseña</label>
            <div class="input-wrapper">
              <input type="password" id="login-password"
                placeholder="Tu contraseña" autocomplete="current-password"
                style="padding-right:42px;" />
              <button class="input-icon-right" id="toggle-pwd" type="button">
                ${Icons.Eye(16)}
              </button>
            </div>
          </div>

          <div style="text-align:right;margin-top:4px;margin-bottom:4px;">
            <a href="/olvidar-password" style="font-size:13px;color:var(--accent);text-decoration:none;">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button class="btn btn-primary btn-full btn-lg" id="login-btn" ${_loading ? 'disabled' : ''}>
            ${_loading ? 'Ingresando...' : 'Entrar'}
          </button>

          <p style="text-align:center;margin-top:16px;font-size:14px;color:var(--muted-fg);">
            ¿No tienes cuenta?
            <a href="/registro" style="color:var(--accent);text-decoration:none;font-weight:500;">
              Regístrate aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('toggle-pwd')?.addEventListener('click', function () {
    const show = document.getElementById('login-password').type === 'password';
    document.getElementById('login-password').type  = show ? 'text' : 'password';
    this.innerHTML = show ? Icons.EyeOff(16) : Icons.Eye(16);
  });

  document.getElementById('login-btn')?.addEventListener('click', doLogin);
  document.getElementById('login-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
}

function showFormError(msg) {
  const el = document.getElementById('form-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

async function doLogin() {
  const email    = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-password')?.value;

  if (!email || !password) {
    showFormError('Por favor ingresa tu correo y contraseña.');
    return;
  }

  _loading = true;
  renderLogin();

  try {
    const data = await Api.login(email, password);
    AppState.setCurrentUser(data.usuario, data.token);

    // Restaurar el carrito guardado en BD para clientes
    if (data.usuario.rol === 'CLIENTE') {
      Api.getCarrito()
        .then(c => AppState.setCarritoFromApi(c.items))
        .catch(() => {});
    }

    Nav.go(data.usuario.rol === 'CLIENTE' ? Nav.catalogo : Nav.dashboard);
  } catch (err) {
    _loading = false;
    renderLogin();
    showFormError(err.message || 'Error al iniciar sesión. Intenta de nuevo.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (AppState.currentUser) {
    Nav.go(AppState.currentUser.rol === 'CLIENTE' ? Nav.catalogo : Nav.dashboard);
    return;
  }
  renderLogin();
  const params = new URLSearchParams(window.location.search);
  if (params.get('registered')) {
    showToast('Cuenta creada exitosamente. Inicia sesión.', 'success');
  }
  if (params.get('reset')) {
    showToast('Contraseña restablecida exitosamente. Inicia sesión.', 'success');
  }
});
