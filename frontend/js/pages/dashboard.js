// ===== DASHBOARD PAGE =====

// Estado de los filtros activos en la tabla de pedidos activos.
// Se conservan mientras el dashboard esté montado para no perder
// la selección al reasignar eventos después de cambiar un estado.
let _filtroEstado      = '';
let _filtroFechaDesde  = '';
let _filtroFechaHasta  = '';

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

  Api.getPedidos()
    .then(data => {
      AppState.setPedidos(data);
      renderDashboardContent();
    })
    .catch(() => {
      // Si la API falla mostrar lo que haya en el estado local
      renderDashboardContent();
    });
}


/**
 * Renderiza el contenido completo del dashboard usando los pedidos
 * almacenados en AppState (ya cargados desde la API).
 * Calcula métricas, arma las secciones y dibuja la tabla de pedidos activos.
 */
function renderDashboardContent() {
  const root = document.getElementById('app-root');
  const pedidos = AppState.pedidos;

  // ── Métricas ────────────────────────────────────────────────

  // Pedidos activos: todo lo que no está entregado ni cancelado
  const pedidosActivos = pedidos.filter(p =>
    ['pendiente', 'esperando_pago', 'pagado'].includes(p.estado)
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

  /**
   * Pedidos entregados este mes.
   */
  const pedidosEntregados = pedidos.filter(p =>
    p.estado === 'entregado' &&
    new Date(p.fecha_pedido ?? p.fecha_creacion) >= primerDiaMes
  ).length;

  // ── Pedidos en espera de pago (antes "Pagos pendientes") ────
  // La información de pagos pertenece a otro módulo.
  // Mostramos los pedidos en estado 'esperando_pago' como indicador.
  const esperandoPago = pedidos.filter(p => p.estado === 'esperando_pago');

  // ── HTML de secciones ────────────────────────────────────────

  /**
   * Sección "Top 5 productos": depende de detalle_pedidos que pertenece
   * a otro módulo. Se muestra un placeholder hasta que esté disponible.
   */
  const topHtml = `
    <div style="display:flex;flex-direction:column;align-items:center;
                justify-content:center;padding:40px 0;gap:10px;color:var(--muted-fg);">
      ${Icons.Package(32)}
      <p style="font-size:13px;">Disponible cuando el módulo de productos esté integrado</p>
    </div>`;

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
          <h3 style="font-family:var(--font-serif);font-size:20px;margin:0;">Pedidos Activos</h3>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <select id="filtro-estado" style="width:auto;min-width:160px;">
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="esperando_pago">Esperando pago</option>
              <option value="pagado">Pagado</option>
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
  renderFilasPedidos(pedidosActivos);

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

    let filtrados = pedidosActivos;

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
    pendiente:      'Pendiente',
    esperando_pago: 'Esperando pago',
    pagado:         'Pagado'
  };

  // Si hay filtro de estado activo, mostrar lista plana sin encabezados de grupo
  const conAgrupacion = !_filtroEstado;

  let html = '';

  if (conAgrupacion) {
    // Agrupar en orden: pendiente → esperando_pago → pagado
    ['pendiente', 'esperando_pago', 'pagado'].forEach(estado => {
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
// Si necesitas habilitar una transición adicional, agrégala aquí y en el middleware.
const TRANSICIONES_VALIDAS = {
  pendiente:      ['esperando_pago', 'cancelado'],
  esperando_pago: ['pagado', 'cancelado'],
  pagado:         ['entregado', 'cancelado'],
  entregado:      [],
  cancelado:      []
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


document.addEventListener('DOMContentLoaded', renderDashboard);
