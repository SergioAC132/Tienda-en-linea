// ===== CART PAGE =====
function renderCarrito() {
  if (!requireAuth(['CLIENTE'])) return;
  renderHeader();

  const root = document.getElementById('app-root');
  const carrito = AppState.carrito;
  const direcciones = AppState.direcciones;

  if (carrito.length === 0) {
    root.innerHTML = `
      <div class="empty-state">
        <h2>Tu carrito está vacío</h2>
        <p>Explora nuestra colección y encuentra piezas únicas</p>
        <a href="${Nav.catalogo}" class="btn btn-primary">Ir al catálogo</a>
      </div>`;
    return;
  }

  const total = carrito.reduce((s, i) => s + i.precio_base * i.cantidad, 0);

  const principal = direcciones.find(d => d.es_principal);
  const defaultDirId = principal?.id || direcciones[0]?.id || '';

  const itemsHtml = carrito.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">
        ${item.imagenUrl ? `<img src="${item.imagenUrl}" alt="${item.nombre}" />` : ''}
      </div>
      <div class="cart-item-info">
        <h3 class="cart-item-name">${item.nombre}</h3>
        <p class="cart-item-meta">Talla: ${item.talla}</p>
        <p class="cart-item-meta">Cantidad: ${item.cantidad}</p>
        <p class="cart-item-price">$${formatCurrency(item.precio_base * item.cantidad)} MXN</p>
      </div>
      <button class="cart-remove" data-pid="${item.productoId}" data-talla="${item.talla}">
        ${Icons.Trash2(20)}
      </button>
    </div>
  `).join('');

  const addressSection = direcciones.length === 0
    ? `<div style="background:rgba(42,42,42,.5);border:1px solid var(--border);border-radius:8px;padding:14px;">
        <p style="font-size:13px;color:var(--muted-fg);">No tienes direcciones registradas</p>
        <button class="btn btn-outline btn-sm" id="btn-nueva-dir-empty" style="margin-top:10px;">
          ${Icons.Plus(14)} Agregar dirección
        </button>
       </div>`
    : `<div style="display:flex;gap:8px;align-items:center;">
        <select id="address-select" style="flex:1;">
          ${direcciones.map(d => `<option value="${d.id}">${d.calle} ${d.numero_exterior || ''} - ${d.ciudad}, ${d.estado}</option>`).join('')}
        </select>
        <button class="btn btn-outline btn-sm" id="btn-nueva-dir-inline" title="Nueva dirección" style="padding:10px 12px;flex-shrink:0;">
          ${Icons.Plus(16)}
        </button>
       </div>`;

  const canOrder = direcciones.length > 0;

  root.innerHTML = `
    <div>
      <h2 class="page-title" style="padding-top:48px;">Carrito de Compras</h2>
      <div class="cart-layout" style="margin-top:32px;">
        <div class="cart-items">${itemsHtml}</div>
        <div class="cart-summary">
          <h3 class="summary-title">Resumen del Pedido</h3>
          <div>
            <label class="form-label" style="display:flex;align-items:center;gap:6px;">
              ${Icons.MapPin(16)} Dirección de entrega
            </label>
            ${addressSection}
          </div>
          <div>
            <label class="form-label">Comentarios (opcional)</label>
            <textarea id="cart-comments" rows="3" maxlength="100" placeholder="Instrucciones especiales de entrega..."></textarea>
            <p class="form-hint" style="text-align:right;"><span id="char-count">0</span>/100</p>
          </div>
          <hr class="divider" />
          <div>
            <div class="summary-row" style="margin-bottom:8px;">
              <span style="color:var(--muted-fg);">Subtotal</span>
              <span>$${formatCurrency(total)} MXN</span>
            </div>
            <div class="summary-total-row">
              <span style="font-family:var(--font-serif);">Total</span>
              <span class="total-amount">$${formatCurrency(total)} MXN</span>
            </div>
          </div>
          <button id="confirm-order"
            class="btn btn-full btn-lg ${canOrder?'btn-primary':''}"
            ${!canOrder?'disabled style="background:var(--secondary);color:var(--muted-fg);cursor:not-allowed;"':''}>
            Confirmar pedido
          </button>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('.cart-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      AppState.eliminarDelCarrito(btn.dataset.pid, btn.dataset.talla);
      renderCarrito();
    });
  });

  const abrirNuevaDireccion = () => {
    abrirModalDireccion(null, (nueva) => {
      AppState.agregarDireccionNormalizada(nueva);
      renderCarrito();
      const sel = document.getElementById('address-select');
      if (sel) sel.value = nueva.id;
      showToast('Dirección agregada', 'success');
    });
  };
  document.getElementById('btn-nueva-dir-empty')?.addEventListener('click', abrirNuevaDireccion);
  document.getElementById('btn-nueva-dir-inline')?.addEventListener('click', abrirNuevaDireccion);

  const commentsEl = document.getElementById('cart-comments');
  commentsEl?.addEventListener('input', () => {
    document.getElementById('char-count').textContent = commentsEl.value.length;
  });

  document.getElementById('confirm-order')?.addEventListener('click', () => {
    const dirId = document.getElementById('address-select')?.value || defaultDirId;
    const comentarios = commentsEl?.value || '';
    if (!dirId) return;
    const pedido = AppState.crearPedido(dirId, comentarios);
    Nav.go(Nav.pago(pedido.id));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  Api.getDirecciones()
    .then(data => {
      const normalizadas = data.map(d => ({
        id: d.id_direccion, usuario_id: d.id_usuario,
        calle: d.calle, numero_exterior: d.numero_exterior,
        numero_interior: d.numero_interior || '',
        colonia: d.colonia, ciudad: d.ciudad, estado: d.estado,
        codigo_postal: d.codigo_postal, pais: d.pais,
        referencias: d.referencias || '', es_principal: d.es_principal
      }));
      AppState.setDirecciones(normalizadas);
    })
    .catch(() => {})
    .finally(() => renderCarrito());
});
