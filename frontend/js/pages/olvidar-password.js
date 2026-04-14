// ===== FORGOT PASSWORD PAGE =====
let _loading = false;
let _enviado = false;

function renderOlvidarPassword() {
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

          ${_enviado ? `
            <div style="text-align:center;padding:24px 0;">
              <div style="font-size:48px;margin-bottom:16px;">📧</div>
              <h2 class="login-title">Revisa tu correo</h2>
              <p class="login-subtitle" style="margin-bottom:24px;">
                Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
              </p>
              <a href="/login" style="color:var(--accent);text-decoration:none;font-size:14px;font-weight:500;">
                ← Volver al inicio de sesión
              </a>
            </div>
          ` : `
            <h2 class="login-title">¿Olvidaste tu contraseña?</h2>
            <p class="login-subtitle">Ingresa tu correo y te enviaremos un enlace para restablecerla.</p>

            <div id="form-error" class="form-error" style="display:none;"></div>

            <div class="form-group">
              <label class="form-label">Correo electrónico</label>
              <input type="email" id="forgot-email" placeholder="tu@correo.com" autocomplete="email" />
            </div>

            <button class="btn btn-primary btn-full btn-lg" id="forgot-btn" ${_loading ? 'disabled' : ''}>
              ${_loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>

            <p style="text-align:center;margin-top:16px;font-size:14px;color:var(--muted-fg);">
              <a href="/login" style="color:var(--accent);text-decoration:none;font-weight:500;">
                ← Volver al inicio de sesión
              </a>
            </p>
          `}
        </div>
      </div>
    </div>
  `;

  if (!_enviado) {
    document.getElementById('forgot-btn')?.addEventListener('click', doForgotPassword);
    document.getElementById('forgot-email')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') doForgotPassword();
    });
  }
}

function showFormError(msg) {
  const el = document.getElementById('form-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

async function doForgotPassword() {
  const email = document.getElementById('forgot-email')?.value.trim();

  if (!email) {
    showFormError('Por favor ingresa tu correo electrónico.');
    return;
  }

  _loading = true;
  renderOlvidarPassword();

  try {
    await Api.forgotPassword(email);
    _loading = false;
    _enviado = true;
    renderOlvidarPassword();
  } catch (err) {
    _loading = false;
    renderOlvidarPassword();
    showFormError(err.message || 'Error al enviar el correo. Intenta de nuevo.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof AppState !== 'undefined' && AppState.currentUser) {
    const dest = AppState.currentUser.rol === 'CLIENTE' ? '/catalogo' : '/dashboard';
    window.location.href = dest;
    return;
  }
  renderOlvidarPassword();
});
