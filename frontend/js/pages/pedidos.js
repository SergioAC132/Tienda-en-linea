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

  const pedidosHtml = misPedidos.map(pedido => renderTarjetaPedido(pedido)).join('');

  root.innerHTML = `
    <div class="orders-layout">
      <h2 class="page-title">Mis Pedidos</h2>
      <div style="margin-top:32px;">${pedidosHtml}</div>
    </div>`;

  // Asignar eventos a los botones de cancelar
  document.querySelectorAll('.btn-cancelar-pedido').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      cancelarPedido(btn.dataset.id);
    });
  });

  // Asignar eventos a los botones de registrar pago
  // Navega a pago.js pasando el id del pedido como parámetro en la URL
  document.querySelectorAll('.btn-registrar-pago').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      Nav.go(Nav.pago(btn.dataset.id));
    });
  });

  // Abrir detalle al hacer click en la tarjeta (excepto en los botones de acción)
  document.querySelectorAll('.order-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.btn')) return;
      const id = card.dataset.id;
      const pedido = AppState.pedidos.find(p =>
        String(p.id_pedido ?? p.id) === String(id)
      );
      if (pedido) abrirDetallePedidoCliente(pedido);
    });
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
    <div class="order-card" data-id="${idMostrar}">
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

/**
 * Abre un modal con el detalle completo de un pedido del cliente.
 * Muestra fecha, estado, productos, dirección y comentarios.
 * Intenta cargar los productos del pedido desde la API (GET /pedidos/:id).
 * Las acciones disponibles dependen del estado actual del pedido.
 *
 * @param {Object} pedido - Objeto pedido del AppState
 */
function abrirDetallePedidoCliente(pedido) {
  const idMostrar    = pedido.id_pedido ?? pedido.id;
  const fechaMostrar = pedido.fecha_pedido ?? pedido.fecha_creacion;

  // ── Dirección ────────────────────────────────────────────────
  const buildDireccionHtml = dir => {
    if (!dir || !dir.calle) {
      return `<p style="color:var(--muted-fg);font-size:13px;">No disponible</p>`;
    }
    const linea1 = `${dir.calle}${dir.numero_exterior ? ` #${dir.numero_exterior}` : ''}${dir.numero_interior ? ` Int. ${dir.numero_interior}` : ''}`;
    return `
      <div style="background:rgba(42,42,42,.4);border-radius:8px;padding:14px;font-size:13px;line-height:1.7;">
        <p>${linea1}</p>
        ${dir.colonia      ? `<p>${dir.colonia}</p>` : ''}
        <p>${dir.ciudad}, ${dir.estado}${dir.codigo_postal ? ` CP ${dir.codigo_postal}` : ''}</p>
        ${dir.pais         ? `<p style="color:var(--muted-fg);">${dir.pais}</p>` : ''}
        ${dir.referencias  ? `<p style="color:var(--muted-fg);margin-top:4px);">${dir.referencias}</p>` : ''}
      </div>`;
  };

  // ── Productos ────────────────────────────────────────────────
  const buildItemsHtml = items => {
    if (!items || items.length === 0) {
      return `<div style="display:flex;align-items:center;gap:10px;padding:12px 0;color:var(--muted-fg);">
        ${Icons.Package(18)}
        <p style="font-size:13px;">Detalle de productos no disponible</p>
      </div>`;
    }
    return items.map(item => {
      const nombre   = item.nombre   || item.nombre_producto || '';
      const talla    = item.talla    || item.nombre_talla    || '';
      const cantidad = item.cantidad ?? 1;
      const subtotal = item.subtotal ?? item.total ?? (item.precio_unitario ? Number(item.precio_unitario) * cantidad : null);
      const imgUrl   = item.imagenUrl || item.imagen_url || null;
      return `
        <div class="order-item">
          <div class="order-item-img">
            ${imgUrl ? `<img src="${imgUrl}" alt="${nombre}" />` : ''}
          </div>
          <div class="order-item-info">
            <p class="order-item-name">${nombre}</p>
            <p class="order-item-meta">Talla: ${talla} · Cantidad: ${cantidad}</p>
          </div>
          ${subtotal != null
            ? `<p style="color:var(--primary);font-size:13px;white-space:nowrap;flex-shrink:0;">
                 $${formatCurrency(subtotal)} MXN
               </p>`
            : ''}
        </div>`;
    }).join('');
  };

  const itemsIniciales = pedido.items || pedido.detalles || [];
  const esPendiente    = pedido.estado === 'pendiente';

  // ── Modal ────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:640px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <h3 style="margin:0;">Pedido #${idMostrar}</h3>
          ${getStatusBadge(pedido.estado)}
        </div>
        <button class="modal-close" id="btn-x-detalle-cli">${Icons.X(20)}</button>
      </div>

      <div class="modal-body" style="overflow-y:auto;flex:1;">

        <!-- Resumen -->
        <div style="display:flex;gap:32px;flex-wrap:wrap;
                    padding-bottom:20px;margin-bottom:24px;border-bottom:1px solid var(--border);">
          <div>
            <p class="form-label" style="margin-bottom:4px;">Fecha del pedido</p>
            <p style="font-size:14px;">${formatDate(fechaMostrar)}</p>
          </div>
          <div>
            <p class="form-label" style="margin-bottom:4px;">Total</p>
            <p class="total-amount" style="font-size:18px;">$${formatCurrency(pedido.total)} MXN</p>
          </div>
        </div>

        <!-- Productos -->
        <div class="order-items">
          <p class="order-section-title">${Icons.Package(16)} Productos</p>
          <div id="detalle-cli-items">${buildItemsHtml(itemsIniciales)}</div>
        </div>

        <!-- Dirección -->
        <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--border);">
          <p class="order-section-title">${Icons.MapPin(16)} Dirección de entrega</p>
          <div id="detalle-cli-dir">${buildDireccionHtml(pedido.direccion)}</div>
        </div>

        <!-- Comentarios -->
        ${pedido.comentarios_cliente ? `
          <div class="order-comments">
            <p class="form-label">Tu comentario</p>
            <p class="form-hint">${pedido.comentarios_cliente}</p>
          </div>` : ''}
        ${pedido.comentarios_vendedor ? `
          <div class="order-comments">
            <p class="form-label">Nota del vendedor</p>
            <p class="form-hint" style="color:var(--primary);">${pedido.comentarios_vendedor}</p>
          </div>` : ''}
      </div>

      <!-- Acciones -->
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;
                  padding:16px 24px;border-top:1px solid var(--border);">
        ${esPendiente ? `
          <button class="btn btn-primary" id="btn-detalle-cli-pago">
            Registrar pago
          </button>
          <button class="btn btn-outline" id="btn-detalle-cli-cancelar"
                  style="color:var(--destructive);border-color:var(--destructive);">
            Cancelar pedido
          </button>` : ''}
        <button class="btn btn-outline" id="btn-cerrar-detalle-cli" style="margin-left:auto;">
          Cerrar
        </button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const cerrar = () => overlay.remove();
  document.getElementById('btn-x-detalle-cli').addEventListener('click', cerrar);
  document.getElementById('btn-cerrar-detalle-cli').addEventListener('click', cerrar);
  overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(); });

  if (esPendiente) {
    document.getElementById('btn-detalle-cli-pago').addEventListener('click', () => {
      cerrar();
      Nav.go(Nav.pago(idMostrar));
    });
    document.getElementById('btn-detalle-cli-cancelar').addEventListener('click', () => {
      cerrar();
      cancelarPedido(idMostrar);
    });
  }

  // Cargar el detalle completo desde la API: productos y dirección
  if (!isNaN(Number(idMostrar))) {
    Api.getPedidoById(Number(idMostrar))
      .then(data => {
        const items = data.items || data.detalles || data.detalle_pedidos || [];
        if (items.length > 0) {
          const container = document.getElementById('detalle-cli-items');
          if (container) container.innerHTML = buildItemsHtml(items);
        }
        if (data.direccion) {
          const dirContainer = document.getElementById('detalle-cli-dir');
          if (dirContainer) dirContainer.innerHTML = buildDireccionHtml(data.direccion);
        }
      })
      .catch(() => {});
  }
}


document.addEventListener('DOMContentLoaded', renderPedidos);