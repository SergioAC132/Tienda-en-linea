// ===== MIS PEDIDOS PAGE =====

/**
 * Punto de entrada de la página.
 * Verifica autenticación, muestra un loader mientras carga,
 * llama a la API y delega el render a renderPedidosList().
 */
function renderPedidos() {
  if (!requireAuth(['CLIENTE'])) return;
  renderHeader();

  const root = document.getElementById('app-root');

  // Mostrar estado de carga mientras se espera la respuesta de la API
  root.innerHTML = `
    <div class="empty-state orders-layout">
      ${Icons.Package(32)}
      <p>Cargando pedidos...</p>
    </div>`;

  Api.getPedidos()
    .then(data => {
      AppState.setPedidos(data);
      renderPedidosList();
    })
    .catch(() => {
      // Si la API falla, intentar mostrar lo que haya en el estado local
      renderPedidosList();
    });
}


/**
 * Renderiza la lista de pedidos del cliente usando los datos
 * almacenados en AppState. Se llama después de que la API responde.
 */
function renderPedidosList() {
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

  // Asignar eventos a los botones de cancelar
  document.querySelectorAll('.btn-cancelar-pedido').forEach(btn => {
    btn.addEventListener('click', () => cancelarPedido(btn.dataset.id));
  });

  // Asignar eventos a los botones de registrar pago
  // Navega a pago.js pasando el id del pedido como parámetro en la URL
  document.querySelectorAll('.btn-registrar-pago').forEach(btn => {
    btn.addEventListener('click', () => Nav.go(Nav.pago(btn.dataset.id)));
  });
}


/**
 * Construye el HTML de una tarjeta de pedido individual.
 * Solo muestra los campos que pertenecen a la tabla `pedidos`.
 * Los productos del pedido (detalle_pedidos) serán integrados
 * por el módulo correspondiente cuando estén disponibles.
 *
 * @param {Object} pedido - Objeto pedido del estado
 * @returns {string} HTML de la tarjeta
 */
function renderTarjetaPedido(pedido) {
  // Usar id_pedido si viene de la API, o id si viene del estado local
  const idMostrar   = pedido.id_pedido ?? pedido.id;
  const fechaMostrar = pedido.fecha_pedido ?? pedido.fecha_creacion;

  // Comentario del vendedor (solo se muestra si existe)
  const comentVendedorHtml = pedido.comentarios_vendedor ? `
    <div class="order-comments">
      <p class="form-label">Nota del vendedor</p>
      <p class="form-hint">${pedido.comentarios_vendedor}</p>
    </div>` : '';

  // Comentario del cliente (solo se muestra si existe)
  const comentClienteHtml = pedido.comentarios_cliente ? `
    <div class="order-comments">
      <p class="form-label">Tu comentario</p>
      <p class="form-hint">${pedido.comentarios_cliente}</p>
    </div>` : '';

  // Botones de acción: solo disponibles cuando el pedido está en 'pendiente'.
  // "Registrar pago" lleva al cliente a la página de pago (izquierda).
  // "Cancelar pedido" permite anular el pedido (derecha).
  const botonesAccionHtml = pedido.estado === 'pendiente' ? `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;">
      <button class="btn btn-primary btn-sm btn-registrar-pago"
              data-id="${idMostrar}">
        Registrar pago
      </button>
      <button class="btn btn-outline btn-sm btn-cancelar-pedido"
              data-id="${idMostrar}"
              style="color:var(--destructive);border-color:var(--destructive);">
        Cancelar pedido
      </button>
    </div>` : '';

  return `
    <div class="order-card">
      <div class="order-header">
        <div class="order-meta">
          <div class="order-meta-item">
            <p>Pedido</p>
            <p style="font-weight:500;">#${idMostrar}</p>
          </div>
          <div class="order-meta-item">
            <p>Fecha</p>
            <p>${formatDate(fechaMostrar)}</p>
          </div>
          <div class="order-meta-item">
            <p>Total</p>
            <p class="total-amount">$${formatCurrency(pedido.total)} MXN</p>
          </div>
        </div>
        ${getStatusBadge(pedido.estado)}
      </div>

      <div class="order-body">
        ${comentClienteHtml}
        ${comentVendedorHtml}
        ${botonesAccionHtml}
      </div>
    </div>`;
}


/**
 * Cancela un pedido propio del cliente llamando a la API.
 * Solo funciona si el pedido está en estado 'pendiente' —
 * el backend rechaza la petición si ya cambió de estado.
 * Al confirmar y tener éxito, recarga la lista desde la API.
 *
 * @param {number} idPedido - ID del pedido a cancelar
 */
function cancelarPedido(idPedido) {
  const confirmar = confirm('¿Estás seguro de que deseas cancelar este pedido?');
  if (!confirmar) return;

  Api.cancelarPedido(idPedido)
    .then(() => {
      showToast('Pedido cancelado correctamente.', 'success');
      // Recargar la lista desde la API para reflejar el nuevo estado
      return Api.getPedidos();
    })
    .then(data => {
      AppState.setPedidos(data);
      renderPedidosList();
    })
    .catch(err => {
      showToast(err.message || 'No se pudo cancelar el pedido.', 'error');
    });
}

document.addEventListener('DOMContentLoaded', renderPedidos);
