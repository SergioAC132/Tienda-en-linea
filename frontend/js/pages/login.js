// ===== LOGIN PAGE =====
const DEMO_CREDENTIALS = {
  CLIENTE:  { email: 'maria@cliente.com',   label: 'Cliente' },
  VENDEDOR: { email: 'carlos@vendedor.com', label: 'Vendedor' },
  ADMIN:    { email: 'ana@admin.com',       label: 'Administrador' },
};

let _selectedRole = 'CLIENTE';
let _showPassword = false;

function renderLogin() {
  const root = document.getElementById('app-root');
  root.style.cssText = 'padding:0;max-width:none;';

  const rolesHtml = Object.entries(DEMO_CREDENTIALS).map(([rol, info]) => `
    <button class="role-btn ${_selectedRole === rol ? 'active' : ''}" data-role="${rol}">
      ${info.label}
    </button>
  `).join('');

  root.innerHTML = `
    <div class="login-layout">
      <!-- Panel izquierdo decorativo -->
      <div class="login-panel-left">
        <div style="text-align:center;max-width:320px;">
          <div class="login-icon">${Icons.ShoppingBag(32)}</div>
          <h1 class="login-logo">Tintin<br/><span>Luxury</span></h1>
          <p class="login-tagline">
            La moda de lujo al alcance de tus manos. Piezas únicas, diseñadas para quienes aprecian lo extraordinario.
          </p>
          <div class="login-roles">${rolesHtml}</div>
          <p style="font-size:12px;color:var(--muted-fg);margin-top:12px;">Selecciona un rol de prueba</p>
        </div>
      </div>

      <!-- Panel derecho -->
      <div class="login-panel-right">
        <div class="login-form">
          <div class="logo-mobile">Tintin <span>Luxury</span></div>
          <h2 class="login-title">Iniciar sesión</h2>
          <p class="login-subtitle">Ingresa tus credenciales para continuar</p>

          <!-- Selector de rol (mobile) -->
          <div class="roles-mobile">${rolesHtml}</div>

          <!-- Email -->
          <div class="form-group">
            <label class="form-label">Correo electrónico</label>
            <div class="input-wrapper">
              <input type="email" id="login-email" value="${DEMO_CREDENTIALS[_selectedRole].email}" readonly />
              <span class="input-tag">Demo</span>
            </div>
          </div>

          <!-- Contraseña -->
          <div class="form-group">
            <label class="form-label">Contraseña</label>
            <div class="input-wrapper">
              <input type="${_showPassword ? 'text' : 'password'}" id="login-password" value="demo1234" readonly style="padding-right:42px;" />
              <button class="input-icon-right" id="toggle-pwd">
                ${_showPassword ? Icons.EyeOff(16) : Icons.Eye(16)}
              </button>
            </div>
          </div>

          <button class="btn btn-primary btn-full btn-lg" id="login-btn">Entrar</button>
          <p class="login-demo-note">Modo demostración · Los datos son simulados</p>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => { _selectedRole = btn.dataset.role; renderLogin(); });
  });

  document.getElementById('toggle-pwd')?.addEventListener('click', () => {
    _showPassword = !_showPassword; renderLogin();
  });

  document.getElementById('login-btn')?.addEventListener('click', doLogin);
  document.getElementById('login-password')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
}

function doLogin() {
  if (AppState.login(_selectedRole)) {
    Nav.go(_selectedRole === 'CLIENTE' ? Nav.catalogo : Nav.dashboard);
  } else {
    showToast('No se encontró un usuario activo para este rol', 'error');
  }
}

// Si ya hay sesión activa, redirigir
document.addEventListener('DOMContentLoaded', () => {
  if (AppState.currentUser) {
    Nav.go(AppState.currentUser.rol === 'CLIENTE' ? Nav.catalogo : Nav.dashboard);
    return;
  }
  renderLogin();
});
