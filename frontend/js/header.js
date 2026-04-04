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
            <div class="user-menu" id="user-menu">
              <button class="user-menu-trigger" id="user-menu-trigger">
                ${Icons.User(20)}
                <span>${user.nombre}</span>
                ${Icons.ArrowDown(14)}
              </button>
              <div class="user-dropdown" id="user-dropdown">
                ${user.rol === 'CLIENTE' ? `<a href="${Nav.direcciones}">${Icons.MapPin(16)} Mis Direcciones</a>` : ''}
                <button id="logout-btn">${Icons.LogOut(16)} Cerrar sesión</button>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </header>
  `;

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    AppState.logout();
    Nav.go(Nav.login);
  });

  const trigger  = document.getElementById('user-menu-trigger');
  const dropdown = document.getElementById('user-dropdown');

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown?.classList.toggle('open');
  });

  document.addEventListener('click', () => dropdown?.classList.remove('open'), { once: false });
}
