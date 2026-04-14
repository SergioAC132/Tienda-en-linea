// ===== RESET PASSWORD PAGE =====
let _loading = false;
let _showPassword = false;
let _showConfirm = false;

function renderResetPassword(tokenValido) {
  const root = document.getElementById('app-root');
  root.style.cssText = 'padding:0;max-width:none;';

  if (!tokenValido) {
    root.innerHTML = `
      <div class="login-layout">
        <div class="login-panel-left">
          <div style="text-align:center;max-width:320px;">
            <div class="login-icon">${Icons.ShoppingBag(32)}</div>
            <h1 class="login-logo">Tintin<br/><span>Luxury</span></h1>
          </div>
        </div>
        <div class="login-panel-right">
          <div class="login-form" style="text-align:center;">
            <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
            <h2 class="login-title">Enlace inválido</h2>
            <p class="login-subtitle" style="margin-bottom:24px;">
              Este enlace es inválido o ya expiró. Solicita uno nuevo.
            </p>
            <a href="/olvidar-password" class="btn btn-primary">
              Solicitar nuevo enlace
            </a>
          </div>
        </div>
      </div>
    `;
    return;
  }

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
          <h2 class="login-title">Nueva contraseña</h2>
          <p class="login-subtitle">Elige una contraseña segura de al menos 8 caracteres.</p>

          <div id="form-error" class="form-error" style="display:none;"></div>

          <div class="form-group">
            <label class="form-label">Nueva contraseña</label>
            <div class="input-wrapper">
              <input type="${_showPassword ? 'text' : 'password'}" id="reset-password"
                placeholder="Mínimo 8 caracteres"
                style="padding-right:42px;" />
              <button class="input-icon-right" id="toggle-pwd" type="button">
                ${_showPassword ? Icons.EyeOff(16) : Icons.Eye(16)}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Confirmar contraseña</label>
            <div class="input-wrapper">
              <input type="${_showConfirm ? 'text' : 'password'}" id="reset-confirm"
                placeholder="Repite tu contraseña"
                style="padding-right:42px;" />
              <button class="input-icon-right" id="toggle-confirm" type="button">
                ${_showConfirm ? Icons.EyeOff(16) : Icons.Eye(16)}
              </button>
            </div>
          </div>

          <button class="btn btn-primary btn-full btn-lg" id="reset-btn" ${_loading ? 'disabled' : ''}>
            ${_loading ? 'Guardando...' : 'Guardar nueva contraseña'}
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('toggle-pwd')?.addEventListener('click', function () {
    const show = document.getElementById('reset-password').type === 'password';
    document.getElementById('reset-password').type  = show ? 'text' : 'password';
    this.innerHTML = show ? Icons.EyeOff(16) : Icons.Eye(16);
  });

  document.getElementById('toggle-confirm')?.addEventListener('click', function () {
    const show = document.getElementById('reset-confirm').type === 'password';
    document.getElementById('reset-confirm').type  = show ? 'text' : 'password';
    this.innerHTML = show ? Icons.EyeOff(16) : Icons.Eye(16);
  });

  document.getElementById('reset-btn')?.addEventListener('click', doResetPassword);
  document.getElementById('reset-confirm')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doResetPassword();
  });
}

function showFormError(msg) {
  const el = document.getElementById('form-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

async function doResetPassword() {
  const token           = new URLSearchParams(window.location.search).get('token');
  const password        = document.getElementById('reset-password')?.value;
  const confirmPassword = document.getElementById('reset-confirm')?.value;

  if (!password || !confirmPassword) {
    showFormError('Por favor completa todos los campos.');
    return;
  }

  if (password.length < 8) {
    showFormError('La contraseña debe tener al menos 8 caracteres.');
    return;
  }

  if (password !== confirmPassword) {
    showFormError('Las contraseñas no coinciden.');
    return;
  }

  _loading = true;
  renderResetPassword(true);

  try {
    await Api.resetPassword(token, password, confirmPassword);
    window.location.href = '/login?reset=1';
  } catch (err) {
    _loading = false;
    renderResetPassword(true);
    showFormError(err.message || 'Error al restablecer contraseña. Intenta de nuevo.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const token = new URLSearchParams(window.location.search).get('token');
  if (!token) {
    renderResetPassword(false);
    return;
  }
  renderResetPassword(true);
});
