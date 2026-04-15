// ===== MIS PEDIDOS PAGE =====

// Filtro activo en la lista de pedidos del cliente.
// Se conserva entre re-renders para no perder la selección.
let _filtroEstadoCliente = '';

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

  root.innerHTML = `
    <div class="orders-layout">
      <div class="page-header">
        <h2 class="page-title">Mis Pedidos</h2>
        <select id="filtro-estado-cliente" style="width:auto;min-width:180px;">
          <option value="">Todos los pedidos</option>
          <option value="pendiente">Pendiente</option>
          <option value="esperando_pago">Esperando pago</option>
          <option value="pagado">Pagado</option>
          <option value="entregado">Entregado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>
      <div id="lista-pedidos"></div>
    </div>`;

  // Restaurar filtro previo si existía
  const selEstado = document.getElementById('filtro-estado-cliente');
  if (selEstado) selEstado.value = _filtroEstadoCliente;

  // Renderizar tarjetas con el filtro actual
  renderCards(misPedidos);

  // Actualizar tarjetas al cambiar el filtro
  selEstado?.addEventListener('change', () => {
    _filtroEstadoCliente = selEstado.value;
    const filtrados = _filtroEstadoCliente
      ? misPedidos.filter(p => p.estado === _filtroEstadoCliente)
      : misPedidos;
    renderCards(filtrados);
  });
}


/**
 * Renderiza las tarjetas de pedidos en el contenedor #lista-pedidos
 * y reasigna los eventos de los botones de acción.
 * Se llama al cargar la página y al cambiar el filtro de estado.
 *
 * @param {Array} pedidos - Lista de pedidos ya filtrada a mostrar
 */
function renderCards(pedidos) {
  const contenedor = document.getElementById('lista-pedidos');
  if (!contenedor) return;

  if (pedidos.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state" style="padding-top:48px;">
        ${Icons.Package(48)}
        <p>No hay pedidos que coincidan con el filtro seleccionado</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = pedidos.map(p => renderTarjetaPedido(p)).join('');

  // Reasignar eventos a los botones de cancelar
  contenedor.querySelectorAll('.btn-cancelar-pedido').forEach(btn => {
    btn.addEventListener('click', () => cancelarPedido(btn.dataset.id));
  });

  // Reasignar eventos a los botones de registrar pago
  contenedor.querySelectorAll('.btn-registrar-pago').forEach(btn => {
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
