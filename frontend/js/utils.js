// ===== UTILIDADES =====

// ─── Formatos ────────────────────────────────────────────────
function formatCurrency(amount) {
  return Number(amount).toLocaleString('es-MX');
}

function formatDate(iso) {
  const d = new Date(iso);
  const m = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${d.getDate()} de ${m[d.getMonth()]}, ${d.getFullYear()}`;
}

function formatDateShort(iso) {
  const d = new Date(iso);
  const m = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d.getDate()} de ${m[d.getMonth()]}, ${d.getFullYear()}`;
}

function formatDateDayMonth(iso) {
  const d = new Date(iso);
  const m = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${d.getDate()} de ${m[d.getMonth()]}`;
}

// ─── Badges ──────────────────────────────────────────────────
function getStatusBadge(estado) {
  const cls = { entregado:'badge-green', pagado:'badge-gold', esperando_pago:'badge-yellow', cancelado:'badge-red', pendiente:'badge-gray', enviado:'badge-blue' };
  const lbl = { esperando_pago:'Esperando pago', pendiente:'Pendiente', pagado:'Pagado', enviado:'Enviado', entregado:'Entregado', cancelado:'Cancelado' };
  return `<span class="badge ${cls[estado]||'badge-gray'}">${lbl[estado]||estado}</span>`;
}

function getPaymentStatusColor(estado) {
  if (estado === 'confirmado') return 'color:var(--green)';
  if (estado === 'rechazado')  return 'color:var(--destructive)';
  return 'color:var(--yellow)';
}

// ─── Navegación entre páginas ─────────────────────────────────
// Detecta si estamos dentro de /views/ para ajustar rutas relativas
const _inViews = window.location.pathname.replace(/\\/g, '/').includes('/views/');

const Nav = {
  login:             _inViews ? '../index.html'              : 'index.html',
  catalogo:          _inViews ? 'catalogo.html'              : 'views/catalogo.html',
  carrito:           _inViews ? 'carrito.html'               : 'views/carrito.html',
  pedidos:           _inViews ? 'pedidos.html'               : 'views/pedidos.html',
  dashboard:         _inViews ? 'dashboard.html'             : 'views/dashboard.html',
  admin:             _inViews ? 'admin.html'                 : 'views/admin.html',
  catalogoVendedor:  _inViews ? 'catalogo-vendedor.html'     : 'views/catalogo-vendedor.html',
  producto:  (id)  => _inViews ? `detalle.html?id=${id}`        : `views/detalle.html?id=${id}`,
  pago:      (id)  => _inViews ? `pago.html?pedidoId=${id}`     : `views/pago.html?pedidoId=${id}`,
  go(url)   { window.location.href = url; }
};

// ─── Parámetros URL ───────────────────────────────────────────
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ─── Toast ───────────────────────────────────────────────────
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─── Guardia de autenticación ─────────────────────────────────
function requireAuth(allowedRoles) {
  const user = AppState.currentUser;
  if (!user) { Nav.go(Nav.login); return false; }
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    Nav.go(user.rol === 'CLIENTE' ? Nav.catalogo : Nav.dashboard);
    return false;
  }
  return true;
}
