// ===== DASHBOARD PAGE =====

// Estado del módulo — persiste entre re-renders para no perder datos
// ya cargados cuando se refresca solo una parte del dashboard.
let _filtroEstado      = '';
let _filtroFechaDesde  = '';
let _filtroFechaHasta  = '';
let _topProductos      = [];   // cargado una vez desde la API al iniciar

/**
 * Punto de entrada de la página.
 * Solo accesible para VENDEDOR y ADMIN.
 * Muestra un loader mientras carga los pedidos desde la API
 * y luego delega el render a renderDashboardContent().
 */
function renderDashboard() {
  if (!requireAuth(['VENDEDOR', 'ADMIN'])) return;
  renderHeader();

  const root = document.getElementById('app-root');

  // Mostrar estado de carga mientras se espera la API
  root.innerHTML = `
    <div class="empty-state" style="padding-top:80px;">
      ${Icons.Package(32)}
      <p>Cargando dashboard...</p>
    </div>`;

  Promise.all([
    Api.getPedidos(),
    Api.getTopProductos().catch(err => { console.error('getTopProductos:', err); return []; }),
  ]).then(([pedidos, topProductos]) => {
    AppState.setPedidos(pedidos);
    _topProductos = topProductos;
    renderDashboardContent();
  }).catch(err => {
    console.error('renderDashboard:', err);
    renderDashboardContent();
  });
}


/**
 * Renderiza el contenido completo del dashboard usando los pedidos
 * almacenados en AppState (ya cargados desde la API).
 * Calcula métricas, arma las secciones y dibuja la tabla de pedidos activos.
 */
function renderDashboardContent() {
  const topProductos = _topProductos;
  const root = document.getElementById('app-root');
  const pedidos = AppState.pedidos;

  // ── Métricas ────────────────────────────────────────────────

  // Pedidos activos: todo lo que no está entregado ni cancelado
  const pedidosActivos = pedidos.filter(p =>
    ['pendiente', 'pendiente_programacion', 'esperando_pago', 'esperando_dia_entrega', 'pagado'].includes(p.estado)
  );

  // Primer día del mes actual para filtrar métricas del mes
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  /**
   * Ingresos del mes: suma del total de pedidos con estado 'pagado' o 'entregado'
   * registrados en el mes actual. Se usa fecha_pedido (nombre real en la BD).
   */
  const ingresosMes = pedidos
    .filter(p =>
      ['pagado', 'entregado'].includes(p.estado) &&
      new Date(p.fecha_pedido ?? p.fecha_creacion) >= primerDiaMes
    )
    .reduce((suma, p) => suma + Number(p.total), 0);

  const pedidosEntregados = pedidos.filter(p => p.estado === 'entregado').length;

  // ── Pedidos en espera de pago (antes "Pagos pendientes") ────
  // La información de pagos pertenece a otro módulo.
  // Mostramos los pedidos en estado 'esperando_pago' como indicador.
  const esperandoPago = pedidos.filter(p => p.estado === 'esperando_pago');

  // ── HTML de secciones ────────────────────────────────────────

  /**
   * Sección "Top 5 productos": muestra los productos con mayor cantidad vendida
   * obtenidos desde /api/pedidos/top-productos.
   */
  const topHtml = topProductos.length === 0
    ? `<div style="display:flex;flex-direction:column;align-items:center;
                   justify-content:center;padding:40px 0;gap:10px;color:var(--muted-fg);">
         ${Icons.Package(32)}
         <p style="font-size:13px;">Sin datos de ventas aún</p>
       </div>`
    : topProductos.map((prod, i) => {
        const imgHtml = prod.imagen_url
          ? `<img src="${prod.imagen_url}" alt="${prod.nombre}"
                  style="width:40px;height:40px;object-fit:cover;border-radius:6px;flex-shrink:0;">`
          : `<div style="width:40px;height:40px;border-radius:6px;background:var(--border);
                         display:flex;align-items:center;justify-content:center;flex-shrink:0;">
               ${Icons.Package(18)}
             </div>`;
        return `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;
                      border-bottom:1px solid var(--border);">
            <span style="font-size:13px;font-weight:700;color:var(--muted-fg);
                         min-width:18px;text-align:center;">${i + 1}</span>
            ${imgHtml}
            <span style="flex:1;font-size:14px;overflow:hidden;
                         text-overflow:ellipsis;white-space:nowrap;">${prod.nombre}</span>
            <span style="font-size:13px;font-weight:600;color:var(--accent);white-space:nowrap;">
              ${prod.total_vendido} uds.
            </span>
          </div>`;
      }).join('');

  /**
   * Sección de pedidos esperando confirmación de pago.
   * Muestra id, nombre del cliente, total y fecha.
   */
  const esperandoHtml = esperandoPago.length === 0
    ? `<p style="color:var(--muted-fg);text-align:center;padding:32px 0;">
         No hay pedidos esperando pago
       </p>`
    : esperandoPago.slice(0, 5).map(p => {
        const idMostrar   = p.id_pedido ?? p.id;
        const fechaMostrar = p.fecha_pedido ?? p.fecha_creacion;
        const cliente      = p.nombre_cliente ?? p.direccion?.nombre_completo ?? '—';
        return `
          <div class="pending-payment-item">
            <div class="pending-payment-top">
              <span class="pending-payment-id">#${idMostrar}</span>
              <span class="pending-payment-amount">$${formatCurrency(p.total)}</span>
            </div>
            <p class="pending-payment-meta">${cliente} • ${formatDateDayMonth(fechaMostrar)}</p>
          </div>`;
      }).join('');

  // La tabla de pedidos activos se renderiza por separado en renderFilasPedidos()
  // para poder actualizarla al cambiar filtros sin re-renderizar todo el dashboard.

  // ── Render completo ──────────────────────────────────────────
  root.innerHTML = `
    <div class="dashboard-layout">
      <div class="page-header">
        <h2 class="page-title">Dashboard de Ventas</h2>
      </div>

      <div class="metrics-grid">
        <div class="metric-card"><div class="metric-card-inner">
          <div class="metric-icon">${Icons.Package(24)}</div>
          <div>
            <p class="metric-label">Pedidos Activos</p>
            <p class="metric-value">${pedidosActivos.length}</p>
          </div>
        </div></div>
        <div class="metric-card"><div class="metric-card-inner">
          <div class="metric-icon">${Icons.DollarSign(24)}</div>
          <div>
            <p class="metric-label">Ingresos del Mes</p>
            <p class="metric-value">$${formatCurrency(ingresosMes)}</p>
          </div>
        </div></div>
        <div class="metric-card"><div class="metric-card-inner">
          <div class="metric-icon">${Icons.TrendingUp(24)}</div>
          <div>
            <p class="metric-label">Pedidos Entregados</p>
            <p class="metric-value">${pedidosEntregados}</p>
          </div>
        </div></div>
      </div>

      <div class="dashboard-grid">
        <div class="section-card">
          <h3>Top 5 Productos Más Vendidos</h3>
          ${topHtml}
        </div>
        <div class="section-card">
          <div class="pending-header">
            <h3 style="margin-bottom:0;">Esperando Pago</h3>
            <div class="pending-count">${Icons.Clock(20)}<span>${esperandoPago.length}</span></div>
          </div>
          ${esperandoHtml}
        </div>
      </div>

      <div class="full-card">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
          <h3 style="font-family:var(--font-serif);font-size:20px;margin:0;">Pedidos</h3>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <select id="filtro-estado" style="width:auto;min-width:190px;">
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="pendiente_programacion">Pendiente de programación</option>
              <option value="esperando_pago">Esperando pago</option>
              <option value="esperando_dia_entrega">Esperando día de entrega</option>
              <option value="pagado">Pagado</option>
              <option value="entregado">Entregado</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <div style="display:flex;align-items:center;gap:6px;">
              <input type="date" id="filtro-fecha-desde" style="width:auto;min-width:140px;" title="Desde" />
              <span style="color:var(--muted-fg);font-size:12px;">—</span>
              <input type="date" id="filtro-fecha-hasta" style="width:auto;min-width:140px;" title="Hasta" />
            </div>
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table class="orders-table">
            <thead><tr>
              <th>ID Pedido</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr></thead>
            <tbody id="tabla-pedidos-activos"></tbody>
          </table>
        </div>
      </div>
    </div>`;

  // Renderizar la tabla con los filtros actuales (se conservan entre re-renders)
  renderFilasPedidos(pedidos);

  // Restaurar los valores de los filtros si ya había una selección previa
  const selEstado    = document.getElementById('filtro-estado');
  const selDesde     = document.getElementById('filtro-fecha-desde');
  const selHasta     = document.getElementById('filtro-fecha-hasta');

  // Restaurar valores de los filtros si ya había una selección previa
  if (selEstado) selEstado.value = _filtroEstado;
  if (selDesde)  selDesde.value  = _filtroFechaDesde;
  if (selHasta)  selHasta.value  = _filtroFechaHasta;

  // Actualizar la tabla al cambiar cualquier filtro
  const aplicarFiltros = () => {
    _filtroEstado     = selEstado?.value || '';
    _filtroFechaDesde = selDesde?.value  || '';
    _filtroFechaHasta = selHasta?.value  || '';

    let filtrados = pedidos;

    if (_filtroEstado) {
      filtrados = filtrados.filter(p => p.estado === _filtroEstado);
    }

    if (_filtroFechaDesde || _filtroFechaHasta) {
      filtrados = filtrados.filter(p => {
        // Convertir a fecha local antes de comparar para evitar desfase por zona horaria.
        // TIMESTAMPTZ viene en UTC desde la BD — toLocaleDateString('en-CA') da YYYY-MM-DD local.
        const fecha = new Date(p.fecha_pedido ?? p.fecha_creacion).toLocaleDateString('en-CA');
        if (_filtroFechaDesde && fecha < _filtroFechaDesde) return false;
        if (_filtroFechaHasta && fecha > _filtroFechaHasta) return false;
        return true;
      });
    }

    renderFilasPedidos(filtrados);
  };

  selEstado?.addEventListener('change', aplicarFiltros);
  selDesde?.addEventListener('change',  aplicarFiltros);
  selHasta?.addEventListener('change',  aplicarFiltros);
}


/**
 * Renderiza las filas de la tabla de pedidos activos aplicando agrupación por estado.
 * Se llama desde renderDashboardContent() al cargar y desde los listeners de filtros
 * al cambiar la selección, sin necesidad de re-renderizar todo el dashboard.
 *
 * Cuando no hay filtro de estado activo, agrupa los pedidos por estado
 * (pendiente → esperando_pago → pagado) con una fila separadora entre grupos.
 * Cuando hay filtro de estado, muestra la lista plana sin separadores.
 *
 * @param {Array} pedidos - Lista de pedidos ya filtrada a mostrar en la tabla
 */
function renderFilasPedidos(pedidos) {
  const tbody = document.getElementById('tabla-pedidos-activos');
  if (!tbody) return;

  if (pedidos.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6" style="text-align:center;padding:32px;color:var(--muted-fg);">
        No hay pedidos que coincidan con los filtros seleccionados
      </td></tr>`;
    return;
  }

  // Etiquetas de encabezado para cada grupo de estado
  const ETIQUETAS_GRUPO = {
    pendiente:              'Pendiente',
    pendiente_programacion: 'Pendiente de programación',
    esperando_pago:         'Esperando pago',
    esperando_dia_entrega:  'Esperando día de entrega',
    pagado:                 'Pagado',
    entregado:              'Entregado',
    cancelado:              'Cancelado'
  };

  // Si hay filtro de estado activo, mostrar lista plana sin encabezados de grupo
  const conAgrupacion = !_filtroEstado;

  let html = '';

  if (conAgrupacion) {
    // Agrupar en orden de flujo
    ['pendiente', 'pendiente_programacion', 'esperando_pago', 'esperando_dia_entrega', 'pagado', 'entregado', 'cancelado'].forEach(estado => {
      const grupo = pedidos.filter(p => p.estado === estado);
      if (grupo.length === 0) return;

      // Fila separadora con el nombre del grupo
      html += `
        <tr>
          <td colspan="6" style="background:rgba(255,255,255,.04);padding:8px 16px;
                                  font-size:12px;font-weight:600;letter-spacing:.05em;
                                  color:var(--muted-fg);border-bottom:1px solid var(--border);">
            ${ETIQUETAS_GRUPO[estado]} · ${grupo.length} pedido${grupo.length !== 1 ? 's' : ''}
          </td>
        </tr>`;

      html += grupo.map(p => buildFila(p)).join('');
    });
  } else {
    html = pedidos.map(p => buildFila(p)).join('');
  }

  tbody.innerHTML = html;

  // Reasignar eventos al botón de ver detalle
  tbody.querySelectorAll('.btn-ver-detalle').forEach(btn => {
    btn.addEventListener('click', () => {
      const pedido = AppState.pedidos.find(p =>
        String(p.id_pedido ?? p.id) === String(btn.dataset.id)
      );
      if (pedido) abrirDetallePedidoVendedor(pedido);
    });
  });

  // Reasignar eventos a los botones de cambiar estado recién renderizados
  tbody.querySelectorAll('.btn-cambiar-estado').forEach(btn => {
    btn.addEventListener('click', () =>
      abrirCambioEstado(btn.dataset.id, btn.dataset.estado)
    );
  });

  // Reasignar eventos a los botones de agregar/editar nota
  tbody.querySelectorAll('.btn-agregar-nota').forEach(btn => {
    btn.addEventListener('click', () =>
      abrirModalComentario(btn.dataset.id, btn.dataset.comentario)
    );
  });
}


/**
 * Construye el HTML de una fila de la tabla de pedidos activos.
 *
 * @param {Object} p - Objeto pedido del estado
 * @returns {string} HTML de la fila <tr>
 */
function buildFila(p) {
  const idMostrar    = p.id_pedido ?? p.id;
  const fechaMostrar = p.fecha_pedido ?? p.fecha_creacion;
  const cliente      = p.nombre_cliente ?? p.direccion?.nombre_completo ?? '—';

  return `
    <tr>
      <td>#${idMostrar}</td>
      <td>
        <span>${cliente}</span>
        ${p.email_cliente ? `<br><span style="font-size:11px;color:var(--muted-fg);">${p.email_cliente}</span>` : ''}
      </td>
      <td style="color:var(--muted-fg);">${formatDateShort(fechaMostrar)}</td>
      <td style="color:var(--primary);">$${formatCurrency(p.total)}</td>
      <td>${getStatusBadge(p.estado)}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm btn-ver-detalle"
                  data-id="${idMostrar}"
                  title="Ver detalle completo">
            ${Icons.Eye(14)}
          </button>
          <button class="btn btn-outline btn-sm btn-cambiar-estado"
                  data-id="${idMostrar}"
                  data-estado="${p.estado}">
            Cambiar estado
          </button>
          <button class="btn btn-outline btn-sm btn-agregar-nota"
                  data-id="${idMostrar}"
                  data-comentario="${(p.comentarios_vendedor || '').replace(/"/g, '&quot;')}"
                  title="${p.comentarios_vendedor ? 'Editar nota' : 'Agregar nota'}">
            ${Icons.Pencil(14)}
          </button>
        </div>
        ${p.comentarios_cliente ? `
          <p style="font-size:11px;color:var(--muted-fg);margin-top:6px;">
            <span style="font-weight:500;">Cliente:</span> ${p.comentarios_cliente}
          </p>` : ''}
        ${p.comentarios_vendedor ? `
          <p style="font-size:11px;color:var(--muted-fg);margin-top:2px;">
            <span style="font-weight:500;">Nota:</span> ${p.comentarios_vendedor}
          </p>` : ''}
      </td>
    </tr>`;
}


// Transiciones válidas por estado actual — espejo del middleware del backend.
// Nota: pendiente_programacion → esperando_dia_entrega va por el endpoint programar-entrega.
const TRANSICIONES_VALIDAS = {
  pendiente:              ['esperando_pago', 'cancelado'],
  pendiente_programacion: ['cancelado'],
  esperando_pago:         ['pagado', 'cancelado'],
  esperando_dia_entrega:  ['entregado', 'cancelado'],
  pagado:                 ['entregado', 'cancelado'],
  entregado:              [],
  cancelado:              []
};


/**
 * Abre un modal para que el vendedor/admin seleccione el nuevo estado de un pedido.
 * Solo muestra los estados a los que puede transicionar desde el estado actual,
 * evitando que se elija una transición inválida. Al confirmar llama a la API
 * y recarga el dashboard.
 *
 * @param {number} idPedido     - ID del pedido a actualizar
 * @param {string} estadoActual - Estado actual del pedido
 */
function abrirCambioEstado(idPedido, estadoActual) {
  const transiciones = TRANSICIONES_VALIDAS[estadoActual] || [];

  // Etiquetas legibles para cada estado
  const ETIQUETAS = {
    pendiente:      'Pendiente',
    esperando_pago: 'Esperando pago',
    pagado:         'Pagado',
    entregado:      'Entregado',
    cancelado:      'Cancelado'
  };

  // Botones de transición o mensaje de estado final
  const botonesHtml = transiciones.length === 0
    ? `<p style="text-align:center;color:var(--muted-fg);padding:16px 0;font-size:13px;">
         Este pedido está en un estado final y no puede modificarse.
       </p>`
    : transiciones.map(est => `
        <button class="btn btn-outline btn-estado-opcion" data-estado="${est}"
                style="width:100%;margin-bottom:8px;justify-content:flex-start;gap:10px;">
          ${getStatusBadge(est)}
          <span style="font-size:13px;">${ETIQUETAS[est]}</span>
        </button>`).join('');

  // Crear overlay y modal
  const overlay = document.createElement('div');
  overlay.id = 'modal-estado-overlay';
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:420px;">
      <div class="modal-header">
        <h3>Cambiar estado</h3>
      </div>
      <div class="modal-body">
        <p class="form-hint" style="margin-bottom:20px;">Pedido #${idPedido} · Estado actual: ${getStatusBadge(estadoActual)}</p>
        <p style="font-size:13px;font-weight:500;margin-bottom:12px;">Selecciona el nuevo estado:</p>
        <div id="estado-opciones">${botonesHtml}</div>
        ${transiciones.length > 0 ? `
          <div style="margin-top:16px;">
            <label class="form-label">Comentario para el cliente (opcional)</label>
            <textarea id="comentario-vendedor" rows="2" maxlength="100"
                      placeholder="Ej: Tu pago fue recibido y verificado..."
                      style="margin-top:6px;"></textarea>
          </div>` : ''}
      </div>
      <div class="modal-footer" style="padding:0 24px 24px;">
        <button class="btn btn-outline" id="btn-cancelar-estado" style="flex:1;">Cancelar</button>
        ${transiciones.length > 0 ? `
          <button class="btn btn-primary" id="btn-confirmar-estado" style="flex:1;" disabled>
            Confirmar cambio
          </button>` : ''}
      </div>
    </div>`;

  document.body.appendChild(overlay);

  // Estado seleccionado por el vendedor
  let estadoSeleccionado = null;

  // Resaltar el botón seleccionado y habilitar confirmar
  overlay.querySelectorAll('.btn-estado-opcion').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.btn-estado-opcion').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      estadoSeleccionado = btn.dataset.estado;
      document.getElementById('btn-confirmar-estado').disabled = false;
    });
  });

  // Cerrar modal sin hacer nada
  document.getElementById('btn-cancelar-estado').addEventListener('click', () => {
    overlay.remove();
  });

  // Cerrar al hacer click fuera del modal
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });

  // Confirmar cambio de estado
  const btnConfirmar = document.getElementById('btn-confirmar-estado');
  if (btnConfirmar) {
    btnConfirmar.addEventListener('click', () => {
      if (!estadoSeleccionado) return;

      const comentarios = document.getElementById('comentario-vendedor')?.value.trim() || null;
      btnConfirmar.disabled = true;
      btnConfirmar.textContent = 'Guardando...';

      Api.actualizarEstadoPedido(idPedido, {
        estado: estadoSeleccionado,
        estado_actual: estadoActual,
        comentarios_vendedor: comentarios
      })
        .then(() => {
          overlay.remove();
          showToast(`Estado actualizado a "${ETIQUETAS[estadoSeleccionado]}".`, 'success');
          return Api.getPedidos();
        })
        .then(data => {
          AppState.setPedidos(data);
          renderDashboardContent();
        })
        .catch(err => {
          showToast(err.message || 'Error al actualizar el estado.', 'error');
          btnConfirmar.disabled = false;
          btnConfirmar.textContent = 'Confirmar cambio';
        });
    });
  }
}


/**
 * Abre un modal para que el vendedor/admin agregue o edite el comentario
 * interno de un pedido (comentarios_vendedor). No modifica el estado.
 * Muestra el comentario actual si ya existe, y alerta al intentar cerrar
 * sin guardar si se escribió algo nuevo.
 *
 * @param {number} idPedido         - ID del pedido a comentar
 * @param {string} comentarioActual - Comentario existente (puede estar vacío)
 */
function abrirModalComentario(idPedido, comentarioActual) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:420px;">
      <div class="modal-header">
        <h3>Nota interna</h3>
      </div>
      <div class="modal-body">
        <p class="form-hint" style="margin-bottom:20px;">Pedido #${idPedido} · Visible para el cliente en sus pedidos</p>
        <label class="form-label">Comentario del vendedor</label>
        <textarea id="input-comentario-vendedor" rows="3" maxlength="100"
                  placeholder="Ej: Pago confirmado, enviamos el martes..."
                  style="margin-top:6px;">${comentarioActual || ''}</textarea>
        <p class="form-hint" style="text-align:right;margin-top:4px;">
          <span id="contador-comentario">${(comentarioActual || '').length}</span>/100
        </p>
      </div>
      <div class="modal-footer" style="padding:0 24px 24px;">
        <button class="btn btn-outline" id="btn-cancelar-comentario" style="flex:1;">Cancelar</button>
        <button class="btn btn-primary" id="btn-guardar-comentario" style="flex:1;">Guardar nota</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const textarea  = document.getElementById('input-comentario-vendedor');
  const contador  = document.getElementById('contador-comentario');

  // Actualizar contador de caracteres en tiempo real
  textarea.addEventListener('input', () => {
    contador.textContent = textarea.value.length;
  });

  // Función para verificar si hay cambios sin guardar al intentar cerrar
  const hayCambiosSinGuardar = () => textarea.value.trim() !== (comentarioActual || '').trim();

  const cerrarModal = () => {
    if (hayCambiosSinGuardar()) {
      const confirmar = confirm('Tienes cambios sin guardar. ¿Deseas salir de todas formas?');
      if (!confirmar) return;
    }
    overlay.remove();
  };

  document.getElementById('btn-cancelar-comentario').addEventListener('click', cerrarModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) cerrarModal(); });

  // Guardar la nota llamando a la API
  document.getElementById('btn-guardar-comentario').addEventListener('click', () => {
    const comentario = textarea.value.trim();
    if (!comentario) {
      showToast('El comentario no puede estar vacío.', 'error');
      return;
    }

    const btnGuardar = document.getElementById('btn-guardar-comentario');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    Api.actualizarComentarioPedido(idPedido, comentario)
      .then(() => {
        overlay.remove();
        showToast('Nota guardada correctamente.', 'success');
        return Api.getPedidos();
      })
      .then(data => {
        AppState.setPedidos(data);
        renderDashboardContent();
      })
      .catch(err => {
        showToast(err.message || 'Error al guardar la nota.', 'error');
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar nota';
      });
  });
}


/**
 * Abre un modal con el detalle completo de un pedido para el vendedor/admin.
 * Muestra cliente, fecha, estado, productos, dirección y comentarios.
 * Permite cambiar el estado, confirmar el pago directamente (si está
 * en esperando_pago) y editar la nota interna del vendedor.
 *
 * @param {Object} pedido - Objeto pedido del AppState
 */
function abrirDetallePedidoVendedor(pedido) {
  const idMostrar    = pedido.id_pedido ?? pedido.id;
  const fechaMostrar = pedido.fecha_pedido ?? pedido.fecha_creacion;
  const cliente      = pedido.nombre_cliente ?? pedido.direccion?.nombre_completo ?? '—';

  // id_pago se rellena una vez que carga el pago asíncronamente
  let pagoId = null;

  // ── Información de pago ──────────────────────────────────────
  const buildPagoHtml = pago => {
    const metodoLabel = { efectivo: 'Efectivo', transferencia: 'Transferencia Bancaria', link_pago: 'Link de Pago' };
    const estadoLabel = { pendiente: 'Pendiente de revisión', confirmado: 'Confirmado', rechazado: 'Rechazado' };
    const estadoClass = { pendiente: 'badge-yellow', confirmado: 'badge-green', rechazado: 'badge-red' };

    return `
      <div style="background:rgba(42,42,42,.4);border-radius:8px;padding:14px;font-size:13px;line-height:2;">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="color:var(--muted-fg);">Método:</span>
          <span style="font-weight:500;">${metodoLabel[pago.metodo_pago] || pago.metodo_pago}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="color:var(--muted-fg);">Estado pago:</span>
          <span class="badge ${estadoClass[pago.estado_pago] || ''}">${estadoLabel[pago.estado_pago] || pago.estado_pago}</span>
        </div>
        ${pago.referencia ? `
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="color:var(--muted-fg);">Referencia:</span>
          <span style="font-weight:700;letter-spacing:2px;color:var(--primary);">${pago.referencia}</span>
        </div>` : ''}
        ${pago.comprobante_pago ? `
        <div style="margin-top:6px;">
          <a href="${pago.comprobante_pago}" target="_blank" rel="noopener"
             style="display:inline-flex;align-items:center;gap:6px;color:var(--primary);text-decoration:none;">
            ${Icons.FileCheck(16)} Ver comprobante
          </a>
        </div>` : `<p style="color:var(--muted-fg);font-size:12px;">Sin comprobante adjunto</p>`}
      </div>`;
  };

  // ── Dirección ────────────────────────────────────────────────
  const buildDireccionHtml = dir => {
    if (!dir || !dir.calle) {
      return `<p style="color:var(--muted-fg);font-size:13px;">No disponible</p>`;
    }
    const linea1 = `${dir.calle}${dir.numero_exterior ? ` #${dir.numero_exterior}` : ''}${dir.numero_interior ? ` Int. ${dir.numero_interior}` : ''}`;
    return `
      <div style="background:rgba(42,42,42,.4);border-radius:8px;padding:14px;font-size:13px;line-height:1.7;">
        <p>${linea1}</p>
        ${dir.colonia     ? `<p>${dir.colonia}</p>` : ''}
        <p>${dir.ciudad}, ${dir.estado}${dir.codigo_postal ? ` CP ${dir.codigo_postal}` : ''}</p>
        ${dir.pais        ? `<p style="color:var(--muted-fg);">${dir.pais}</p>` : ''}
        ${dir.referencias ? `<p style="color:var(--muted-fg);margin-top:4px;">${dir.referencias}</p>` : ''}
      </div>`;
  };

  // ── Contacto del cliente ─────────────────────────────────────
  const buildContactoHtml = (telefono, email) => {
    if (!telefono && !email) return '';
    return `
      <div style="margin-top:12px;background:rgba(42,42,42,.4);border-radius:8px;padding:14px;">
        <p style="font-size:11px;font-weight:600;letter-spacing:.05em;color:var(--muted-fg);margin-bottom:10px;text-transform:uppercase;">Contacto del cliente</p>
        ${telefono ? `<p style="font-size:13px;margin-bottom:4px;">Tel: ${telefono}</p>` : ''}
        ${email    ? `<p style="font-size:13px;">${email}</p>` : ''}
      </div>`;
  };

  // ── Punto de entrega ─────────────────────────────────────────
  const buildPuntoEntregaHtml = (puntoEntrega, telefono, email) => {
    const infoHtml = puntoEntrega
      ? `<div style="background:rgba(42,42,42,.4);border-radius:8px;padding:14px;font-size:13px;line-height:1.7;">
           <p style="font-weight:500;">${puntoEntrega.nombre}</p>
           ${puntoEntrega.descripcion ? `<p style="color:var(--muted-fg);margin-top:2px;">${puntoEntrega.descripcion}</p>` : ''}
         </div>`
      : `<p style="color:var(--muted-fg);font-size:13px;">Sin información del punto de entrega</p>`;

    return infoHtml + buildContactoHtml(telefono, email);
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

  const itemsIniciales         = pedido.items || pedido.detalles || [];
  const esEstadoFinal          = pedido.estado === 'entregado' || pedido.estado === 'cancelado';
  const puedeConfirmarPago     = pedido.estado === 'esperando_pago';
  const puedeProgamarEntrega   = pedido.estado === 'pendiente_programacion';

  // ── Modal ────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:680px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <h3 style="margin:0;">Pedido #${idMostrar}</h3>
          ${getStatusBadge(pedido.estado)}
        </div>
        <button class="modal-close" id="btn-x-detalle-vend">${Icons.X(20)}</button>
      </div>

      <div class="modal-body" style="overflow-y:auto;flex:1;">

        <!-- Resumen -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:20px;
                    padding-bottom:20px;margin-bottom:24px;border-bottom:1px solid var(--border);">
          <div>
            <p class="form-label" style="margin-bottom:4px;">Fecha del pedido</p>
            <p style="font-size:14px;">${formatDate(fechaMostrar)}</p>
          </div>
          <div>
            <p class="form-label" style="margin-bottom:4px;">Total</p>
            <p class="total-amount" style="font-size:18px;">$${formatCurrency(pedido.total)} MXN</p>
          </div>
          <div>
            <p class="form-label" style="margin-bottom:4px;">Cliente</p>
            <p style="font-size:14px;font-weight:500;">${cliente}</p>
            ${pedido.email_cliente
              ? `<p style="font-size:12px;color:var(--muted-fg);">${pedido.email_cliente}</p>`
              : ''}
          </div>
          <div id="detalle-vend-fecha-entrega-wrap" style="display:none;">
            <p class="form-label" style="margin-bottom:4px;">Fecha de entrega</p>
            <p id="detalle-vend-fecha-entrega" style="font-size:14px;color:var(--primary);font-weight:500;"></p>
          </div>
        </div>

        <!-- Productos -->
        <div class="order-items">
          <p class="order-section-title">${Icons.Package(16)} Productos</p>
          <div id="detalle-vend-items">${buildItemsHtml(itemsIniciales)}</div>
        </div>

        <!-- Entrega -->
        <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--border);">
          <p class="order-section-title" id="detalle-vend-entrega-title">${Icons.MapPin(16)} Dirección de entrega</p>
          <div id="detalle-vend-dir"><p style="font-size:13px;color:var(--muted-fg);">Cargando...</p></div>
        </div>

        <!-- Información de pago -->
        <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--border);">
          <p class="order-section-title">${Icons.CreditCard(16)} Información de Pago</p>
          <div id="detalle-vend-pago">
            <p style="font-size:13px;color:var(--muted-fg);">Cargando...</p>
          </div>
        </div>

        <!-- Comentarios -->
        ${pedido.comentarios_cliente ? `
          <div class="order-comments">
            <p class="form-label">Comentario del cliente</p>
            <p class="form-hint">${pedido.comentarios_cliente}</p>
          </div>` : ''}
        ${pedido.comentarios_vendedor ? `
          <div class="order-comments">
            <p class="form-label">Nota interna</p>
            <p class="form-hint" style="color:var(--primary);">${pedido.comentarios_vendedor}</p>
          </div>` : ''}
      </div>

      <!-- Acciones vendedor -->
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;
                  padding:16px 24px;border-top:1px solid var(--border);">
        ${!esEstadoFinal ? `
          <button class="btn btn-primary" id="btn-detalle-vend-estado">
            Cambiar estado
          </button>` : ''}
        ${puedeConfirmarPago ? `
          <button class="btn btn-outline" id="btn-detalle-vend-pago"
                  style="border-color:var(--green);color:var(--green);">
            ${Icons.FileCheck(14)} Confirmar pago
          </button>` : ''}
        ${puedeProgamarEntrega ? `
          <button class="btn btn-outline" id="btn-detalle-vend-programar"
                  style="border-color:var(--primary);color:var(--primary);">
            ${Icons.Clock(14)} Programar entrega
          </button>` : ''}
        <button class="btn btn-outline" id="btn-detalle-vend-nota">
          ${Icons.Pencil(14)} ${pedido.comentarios_vendedor ? 'Editar nota' : 'Agregar nota'}
        </button>
        <button class="btn btn-outline" id="btn-cerrar-detalle-vend" style="margin-left:auto;">
          Cerrar
        </button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const cerrar = () => overlay.remove();
  document.getElementById('btn-x-detalle-vend').addEventListener('click', cerrar);
  document.getElementById('btn-cerrar-detalle-vend').addEventListener('click', cerrar);
  overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(); });

  // Cambiar estado → cierra detalle y abre el modal de transición
  document.getElementById('btn-detalle-vend-estado')?.addEventListener('click', () => {
    cerrar();
    abrirCambioEstado(idMostrar, pedido.estado);
  });

  // Confirmar pago: usa el id_pago cargado asíncronamente
  document.getElementById('btn-detalle-vend-pago')?.addEventListener('click', () => {
    if (!pagoId) {
      showToast('Espera, cargando información del pago...', 'error');
      return;
    }
    const btn = document.getElementById('btn-detalle-vend-pago');
    btn.disabled = true;
    btn.textContent = 'Confirmando...';

    Api.confirmarPago(pagoId)
      .then(() => {
        cerrar();
        showToast('Pago confirmado. Pedido marcado como "Pagado".', 'success');
        return Api.getPedidos();
      })
      .then(data => {
        AppState.setPedidos(data);
        renderDashboardContent();
      })
      .catch(err => {
        showToast(err.message || 'Error al confirmar el pago.', 'error');
        btn.disabled = false;
        btn.innerHTML = `${Icons.FileCheck(14)} Confirmar pago`;
      });
  });

  // Agregar / editar nota → cierra detalle y abre el modal de comentario
  document.getElementById('btn-detalle-vend-nota').addEventListener('click', () => {
    cerrar();
    abrirModalComentario(idMostrar, pedido.comentarios_vendedor || '');
  });

  // Programar entrega → abre modal para ingresar fecha y hora
  document.getElementById('btn-detalle-vend-programar')?.addEventListener('click', () => {
    cerrar();
    abrirModalProgramarEntrega(idMostrar);
  });

  // Cargar el detalle completo: productos, dirección e información de pago
  if (!isNaN(Number(idMostrar))) {
    Api.getPedidoById(Number(idMostrar))
      .then(data => {
        const items = data.items || data.detalles || data.detalle_pedidos || [];
        if (items.length > 0) {
          const container = document.getElementById('detalle-vend-items');
          if (container) container.innerHTML = buildItemsHtml(items);
        }
        const dirContainer = document.getElementById('detalle-vend-dir');
        const titleEl = document.getElementById('detalle-vend-entrega-title');
        if (data.tipo_entrega === 'punto_entrega') {
          if (titleEl) titleEl.innerHTML = `${Icons.MapPin(16)} Punto de entrega`;
          if (dirContainer) dirContainer.innerHTML = buildPuntoEntregaHtml(
            data.punto_entrega,
            data.telefono_cliente,
            data.email_cliente
          );
        } else if (data.direccion) {
          if (dirContainer) dirContainer.innerHTML =
            buildDireccionHtml(data.direccion) +
            buildContactoHtml(data.telefono_cliente, data.email_cliente);
        }

        if (data.fecha_hora_entrega) {
          const wrap = document.getElementById('detalle-vend-fecha-entrega-wrap');
          const fechaEl = document.getElementById('detalle-vend-fecha-entrega');
          if (wrap) wrap.style.display = '';
          if (fechaEl) {
            const d = new Date(data.fecha_hora_entrega);
            fechaEl.textContent = d.toLocaleString('es-MX', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            });
          }
        }
      })
      .catch(() => {});

    Api.getPagoByPedido(Number(idMostrar))
      .then(pago => {
        pagoId = Number(pago.id_pago);
        const container = document.getElementById('detalle-vend-pago');
        if (container) container.innerHTML = buildPagoHtml(pago);
      })
      .catch(() => {
        const container = document.getElementById('detalle-vend-pago');
        if (container) container.innerHTML =
          '<p style="font-size:13px;color:var(--muted-fg);">Sin registro de pago.</p>';
      });
  }
}


/**
 * Abre un modal para que el vendedor/admin asigne fecha y hora de entrega
 * a un pedido en estado 'pendiente_programacion'.
 * Al confirmar llama a la API y avanza el estado a 'esperando_dia_entrega'.
 *
 * @param {number} idPedido - ID del pedido a programar
 */
function abrirModalProgramarEntrega(idPedido) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  // Mínimo: ahora mismo (para no permitir fechas pasadas)
  const ahora = new Date();
  const minLocal = new Date(ahora - ahora.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:420px;">
      <div class="modal-header">
        <h3>Programar entrega</h3>
      </div>
      <div class="modal-body">
        <p class="form-hint" style="margin-bottom:20px;">
          Pedido #${idPedido} · Al confirmar, el pedido cambiará a "Esperando día de entrega"
        </p>
        <label class="form-label">Fecha y hora de entrega</label>
        <input type="datetime-local" id="input-fecha-entrega"
               min="${minLocal}"
               style="margin-top:6px;width:100%;" />
      </div>
      <div class="modal-footer" style="padding:0 24px 24px;">
        <button class="btn btn-outline" id="btn-cancelar-programar" style="flex:1;">Cancelar</button>
        <button class="btn btn-primary" id="btn-confirmar-programar" style="flex:1;">Confirmar</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  document.getElementById('btn-cancelar-programar').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  document.getElementById('btn-confirmar-programar').addEventListener('click', () => {
    const valor = document.getElementById('input-fecha-entrega').value;
    if (!valor) {
      showToast('Selecciona una fecha y hora de entrega.', 'error');
      return;
    }

    const btnConfirmar = document.getElementById('btn-confirmar-programar');
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Guardando...';

    Api.programarEntrega(idPedido, new Date(valor).toISOString())
      .then(() => {
        overlay.remove();
        showToast('Entrega programada correctamente.', 'success');
        return Api.getPedidos();
      })
      .then(data => {
        AppState.setPedidos(data);
        renderDashboardContent();
      })
      .catch(err => {
        showToast(err.message || 'Error al programar la entrega.', 'error');
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = 'Confirmar';
      });
  });
}


document.addEventListener('DOMContentLoaded', renderDashboard);