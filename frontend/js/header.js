// ===== HEADER COMPONENT =====
function renderHeader() {
  const root = document.getElementById('header-root');
  if (!root) return;
  const user = AppState.currentUser;
  if (!user) { root.innerHTML = ''; return; }

  const cartCount = AppState.getCarritoCount();

  let navLinks = '';
  if (user.rol === 'CLIENTE') {
    navLinks = `
      <a href="${Nav.catalogo}">Catálogo</a>
      <a href="${Nav.pedidos}">Mis Pedidos</a>
      <a href="${Nav.carrito}" class="cart-btn">
        ${Icons.ShoppingBag(24)}
        ${cartCount > 0 ? `<span class="cart-badge">${cartCount}</span>` : ''}
      </a>
    `;
  } else if (user.rol === 'VENDEDOR') {
    navLinks = `
      <a href="${Nav.dashboard}" style="display:flex;align-items:center;gap:6px;">${Icons.LayoutDashboard(20)} Dashboard</a>
      <a href="${Nav.catalogoVendedor}">Catálogo</a>
    `;
  } else if (user.rol === 'ADMIN') {
    navLinks = `
      <a href="${Nav.dashboard}" style="display:flex;align-items:center;gap:6px;">${Icons.LayoutDashboard(20)} Dashboard</a>
      <a href="${Nav.catalogoVendedor}">Catálogo</a>
      <a href="${Nav.admin}">Admin Panel</a>
    `;
  }

  root.innerHTML = `
    <header>
      <div class="header-inner">
        <a class="header-logo" href="${user.rol === 'CLIENTE' ? Nav.catalogo : Nav.dashboard}">
          Tintin <span>Luxury</span>
        </a>
        <nav class="header-nav">
          ${navLinks}
          <div class="header-user">
            <div class="user-info">
              ${Icons.User(20)}
              <span>${user.nombre}</span>
            </div>
            <button class="logout-btn" id="logout-btn">${Icons.LogOut(20)}</button>
          </div>
        </nav>
      </div>
    </header>
  `;

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    AppState.logout();
    Nav.go(Nav.login);
  });
}
