// ===== HASH-BASED SPA ROUTER =====
const Router = {
  currentRoute: '',

  routes: {
    'login': () => renderLogin(),
    'catalogo': () => renderCatalogo(),
    'producto': (id) => renderDetalle(id),
    'carrito': () => renderCarrito(),
    'pago': (id) => renderPago(id),
    'pedidos': () => renderPedidos(),
    'dashboard': () => renderDashboard(),
    'admin': () => initAdmin(),
    'catalogo-vendedor': () => renderCatalogoVendedor(),
  },

  // Protected routes: redirect to login if no user
  protectedRoutes: ['catalogo','producto','carrito','pago','pedidos','dashboard','admin','catalogo-vendedor'],

  navigate(route) {
    window.location.hash = route;
  },

  render() {
    const hash = window.location.hash.replace('#', '') || 'login';
    const parts = hash.split('/');
    const page = parts[0];
    const param = parts[1];

    this.currentRoute = hash;

    // Reset app-root padding (login page removes it)
    const appRoot = document.getElementById('app-root');
    appRoot.style.padding = '';

    // Auth guard
    if (this.protectedRoutes.includes(page) && !AppState.currentUser) {
      window.location.hash = 'login';
      return;
    }

    // Redirect logged-in user away from login
    if (page === 'login' && AppState.currentUser) {
      const dest = AppState.currentUser.rol === 'CLIENTE' ? 'catalogo' : 'dashboard';
      window.location.hash = dest;
      return;
    }

    // Role guards
    const user = AppState.currentUser;
    if (user) {
      if (user.rol === 'CLIENTE' && ['dashboard','admin','catalogo-vendedor'].includes(page)) {
        window.location.hash = 'catalogo';
        return;
      }
      if (user.rol === 'VENDEDOR' && ['admin','carrito','pago','pedidos'].includes(page)) {
        window.location.hash = 'dashboard';
        return;
      }
      if (user.rol === 'ADMIN' && ['carrito','pago','pedidos'].includes(page)) {
        window.location.hash = 'dashboard';
        return;
      }
    }

    // Scroll to top
    window.scrollTo(0, 0);

    // Render header
    renderHeader();

    // Render page
    const handler = this.routes[page];
    if (handler) {
      handler(param);
    } else {
      // 404
      appRoot.innerHTML = `
        <div class="empty-state">
          <h2>Página no encontrada</h2>
          <button class="btn btn-primary" onclick="App.navigate('login')">Ir al inicio</button>
        </div>
      `;
    }
  }
};
