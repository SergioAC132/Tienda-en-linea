// ===== PRODUCT DETAIL PAGE =====
let _talla    = '';
let _cantidad = 1;
let _producto = null; // cache del producto actual

async function renderDetalle() {
  if (!requireAuth(['CLIENTE'])) return;
  renderHeader();

  const root = document.getElementById('app-root');
  const productoId = getParam('id');

  if (!productoId) {
    root.innerHTML = `
      <div class="empty-state" style="padding-top:48px;">
        <h2>Producto no encontrado</h2>
        <a href="${Nav.catalogo}" class="btn btn-ghost">Volver al catálogo</a>
      </div>`;
    return;
  }

  // Cargar desde API solo si no está en caché
  if (!_producto || _producto.id !== productoId) {
    root.innerHTML = `<div style="text-align:center;padding:48px;color:var(--muted-fg);">Cargando producto...</div>`;
    try {
      _producto = await Api.getProductoDetalle(productoId);
    } catch (err) {
      root.innerHTML = `
        <div class="empty-state" style="padding-top:48px;">
          <h2>${err.status === 404 ? 'Producto no encontrado' : 'Error al cargar el producto'}</h2>
          <a href="${Nav.catalogo}" class="btn btn-ghost">Volver al catálogo</a>
        </div>`;
      return;
    }
  }

  const producto = _producto;
  document.title = `Tintin Luxury — ${producto.nombre}`;

  const imagenes          = [...producto.imagenes].sort((a, b) => a.orden - b.orden);
  const tallasDisponibles = producto.tallas.filter(t => t.disponible);
  const puedeAgregar      = producto.disponible && tallasDisponibles.length > 0 && _talla;

  const galleryHtml = imagenes.map((img, i) => `
    <div class="detail-gallery-img">
      <img src="${img.url}" alt="${producto.nombre} - Imagen ${i+1}" loading="lazy" />
    </div>
  `).join('');

  const sizesHtml = producto.tallas.map(t => `
    <button class="size-btn ${_talla===t.talla?'selected':''} ${!t.disponible?'disabled':''}"
      data-talla="${t.talla}" ${!t.disponible?'disabled':''}>
      ${t.talla}
    </button>
  `).join('');

  const infoHtml = !producto.disponible
    ? `<div class="unavailable-box">Producto no disponible</div>`
    : `
      <div>
        <label class="size-label">Talla</label>
        ${tallasDisponibles.length === 0
          ? `<p style="color:var(--muted-fg);font-size:13px;">Sin tallas disponibles</p>`
          : `<div class="size-grid">${sizesHtml}</div>`
        }
      </div>
      <div>
        <label class="size-label">Cantidad</label>
        <div class="qty-control">
          <button class="qty-btn" id="qty-minus">−</button>
          <span class="qty-display">${_cantidad}</span>
          <button class="qty-btn" id="qty-plus">+</button>
        </div>
      </div>
      <button id="add-cart"
        class="btn btn-full btn-lg ${puedeAgregar?'btn-primary':''}"
        ${!puedeAgregar?'disabled style="background:var(--secondary);color:var(--muted-fg);cursor:not-allowed;"':''}>
        ${Icons.ShoppingBag(20)} Agregar al carrito
      </button>
    `;

  root.innerHTML = `
    <div>
      <a href="${Nav.catalogo}" class="back-btn">${Icons.ArrowLeft(20)} Volver al catálogo</a>
      <div class="detail-grid">
        <div class="detail-gallery">${galleryHtml}</div>
        <div class="detail-info">
          <div>
            <h1 class="detail-title">${producto.nombre}</h1>
            <p class="detail-price">$${formatCurrency(producto.precio_base)} MXN</p>
          </div>
          <p class="detail-desc">${producto.descripcion}</p>
          ${infoHtml}
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('.size-btn:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', () => { _talla = btn.dataset.talla; renderDetalle(); });
  });

  document.getElementById('qty-minus')?.addEventListener('click', () => {
    if (_cantidad > 1) { _cantidad--; renderDetalle(); }
  });
  document.getElementById('qty-plus')?.addEventListener('click', () => { _cantidad++; renderDetalle(); });

  document.getElementById('add-cart')?.addEventListener('click', () => {
    if (!puedeAgregar) { showToast('Selecciona una talla disponible', 'error'); return; }
    AppState.agregarAlCarrito(productoId, _talla, _cantidad);
    showToast(`${producto.nombre} agregado al carrito`);
    _talla = ''; _cantidad = 1;
    renderHeader();
    renderDetalle();
  });
}

document.addEventListener('DOMContentLoaded', renderDetalle);
