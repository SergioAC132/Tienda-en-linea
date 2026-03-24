// ===== MY ORDERS PAGE =====
function renderPedidos() {
  if (!requireAuth(['CLIENTE'])) return;
  renderHeader();

  const root = document.getElementById('app-root');
  const misPedidos = AppState.getMisPedidos();

  if (misPedidos.length === 0) {
    root.innerHTML = `
      <div class="empty-state orders-layout">
        ${Icons.Package(64)}
        <h2>No tienes pedidos</h2>
        <p>Cuando realices un pedido, aparecerá aquí</p>
      </div>`;
    return;
  }

  const pedidosHtml = misPedidos.map(pedido => {
    const itemsHtml = pedido.items.map(item => `
      <div class="order-item">
        <div class="order-item-img">
          ${item.imagenUrl ? `<img src="${item.imagenUrl}" alt="${item.nombre}" />` : ''}
        </div>
        <div class="order-item-info">
          <p class="order-item-name">${item.nombre}</p>
          <p class="order-item-meta">Talla: ${item.talla} • Cantidad: ${item.cantidad}</p>
        </div>
        <p>$${formatCurrency(item.subtotal)} MXN</p>
      </div>
    `).join('');

    const pagoHtml = pedido.pago ? `
      <div>
        <div class="order-section-title">${Icons.CreditCard(20)}<span>Información de pago</span></div>
        <div class="address-lines">
          <p>Método: ${pedido.pago.metodo}</p>
          <p>Estado: <span style="${getPaymentStatusColor(pedido.pago.estado_pago)}">${pedido.pago.estado_pago}</span></p>
          ${pedido.pago.referencia_bancaria ? `<p>Referencia: ${pedido.pago.referencia_bancaria}</p>` : ''}
        </div>
      </div>` : '';

    const comentHtml = pedido.comentarios_cliente ? `
      <div class="order-comments">
        <h4 style="font-weight:500;margin-bottom:6px;">Comentarios</h4>
        <p style="font-size:13px;color:var(--muted-fg);">${pedido.comentarios_cliente}</p>
      </div>` : '';

    return `
      <div class="order-card">
        <div class="order-header">
          <div class="order-meta">
            <div class="order-meta-item"><p>Pedido</p><p style="font-weight:500;">#${pedido.id}</p></div>
            <div class="order-meta-item"><p>Fecha</p><p>${formatDate(pedido.fecha_creacion)}</p></div>
            <div class="order-meta-item"><p>Total</p><p style="color:var(--primary);">$${formatCurrency(pedido.total)} MXN</p></div>
          </div>
          ${getStatusBadge(pedido.estado)}
        </div>
        <div class="order-body">
          <div class="order-items"><h3>Productos</h3>${itemsHtml}</div>
          <div class="order-details-grid">
            <div>
              <div class="order-section-title">${Icons.MapPin(20)}<span>Dirección de entrega</span></div>
              <div class="address-lines">
                <p>${pedido.direccion.nombre_completo}</p>
                <p>${pedido.direccion.telefono}</p>
                <p>${pedido.direccion.calle}</p>
                <p>${pedido.direccion.ciudad}, ${pedido.direccion.estado} ${pedido.direccion.codigo_postal}</p>
              </div>
            </div>
            ${pagoHtml}
          </div>
          ${comentHtml}
        </div>
      </div>`;
  }).join('');

  root.innerHTML = `
    <div class="orders-layout">
      <h2 class="page-title">Mis Pedidos</h2>
      <div style="margin-top:32px;">${pedidosHtml}</div>
    </div>`;
}

document.addEventListener('DOMContentLoaded', renderPedidos);
