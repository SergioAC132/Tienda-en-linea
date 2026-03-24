// ===== DASHBOARD PAGE =====
function renderDashboard() {
  if (!requireAuth(['VENDEDOR','ADMIN'])) return;
  renderHeader();

  const root = document.getElementById('app-root');
  const pedidos = AppState.pedidos;

  const pedidosActivos = pedidos.filter(p => ['pendiente','esperando_pago','pagado'].includes(p.estado));
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const pagosMes = pedidos
    .filter(p => p.pago?.estado_pago === 'confirmado' && new Date(p.fecha_creacion) >= primerDiaMes)
    .reduce((s, p) => s + p.total, 0);

  const pedidosEntregados = pedidos.filter(p =>
    p.estado === 'entregado' && new Date(p.fecha_creacion) >= primerDiaMes
  ).length;

  // Top 5 productos
  const ventasMap = new Map();
  pedidos.forEach(pedido => {
    pedido.items.forEach(item => {
      const key = item.productoId || item.producto?.id || item.nombre;
      const cur = ventasMap.get(key);
      if (cur) { cur.cantidad += item.cantidad; }
      else ventasMap.set(key, { nombre: item.nombre, cantidad: item.cantidad, imagen: item.imagenUrl });
    });
  });
  const topProductos = [...ventasMap.values()].sort((a,b) => b.cantidad - a.cantidad).slice(0,5);

  const pagosPendientes = pedidos.filter(p => p.estado === 'esperando_pago' && p.pago?.estado_pago === 'pendiente');

  const topHtml = topProductos.length === 0
    ? `<p style="color:var(--muted-fg);text-align:center;padding:32px 0;">Sin ventas registradas</p>`
    : topProductos.map((p,i) => `
      <div class="top-product">
        <div class="top-product-left">
          <div class="top-product-rank">${i+1}</div>
          ${p.imagen ? `<img class="top-product-img" src="${p.imagen}" alt="${p.nombre}" />` : `<div class="top-product-img-placeholder"></div>`}
          <span style="font-size:13px;">${p.nombre}</span>
        </div>
        <span style="font-size:13px;color:var(--muted-fg);white-space:nowrap;">${p.cantidad} vendidos</span>
      </div>`).join('');

  const pendingHtml = pagosPendientes.length === 0
    ? `<p style="color:var(--muted-fg);text-align:center;padding:32px 0;">No hay pagos pendientes</p>`
    : pagosPendientes.slice(0,5).map(p => `
      <div class="pending-payment-item">
        <div class="pending-payment-top">
          <span class="pending-payment-id">#${p.id}</span>
          <span class="pending-payment-amount">$${formatCurrency(p.total)}</span>
        </div>
        <p class="pending-payment-meta">${p.pago?.metodo} • ${formatDateDayMonth(p.fecha_creacion)}</p>
      </div>`).join('');

  const tableRows = pedidosActivos.map(p => `
    <tr>
      <td>#${p.id}</td>
      <td>${p.direccion.nombre_completo}</td>
      <td style="color:var(--muted-fg);">${formatDateShort(p.fecha_creacion)}</td>
      <td style="color:var(--primary);">$${formatCurrency(p.total)}</td>
      <td>${getStatusBadge(p.estado)}</td>
      <td style="color:var(--muted-fg);">${p.items.length}</td>
      <td><span style="color:var(--primary);">${Icons.ChevronRight(20)}</span></td>
    </tr>`).join('');

  root.innerHTML = `
    <div class="dashboard-layout">
      <div class="page-header">
        <h2 class="page-title">Dashboard de Ventas</h2>
        <select>
          <option value="semana">Esta semana</option>
          <option value="mes" selected>Este mes</option>
          <option value="personalizado">Personalizado</option>
        </select>
      </div>

      <div class="metrics-grid">
        <div class="metric-card"><div class="metric-card-inner">
          <div class="metric-icon">${Icons.Package(24)}</div>
          <div><p class="metric-label">Pedidos Activos</p><p class="metric-value">${pedidosActivos.length}</p></div>
        </div></div>
        <div class="metric-card"><div class="metric-card-inner">
          <div class="metric-icon">${Icons.DollarSign(24)}</div>
          <div><p class="metric-label">Ingresos del Mes</p><p class="metric-value">$${formatCurrency(pagosMes)}</p></div>
        </div></div>
        <div class="metric-card"><div class="metric-card-inner">
          <div class="metric-icon">${Icons.TrendingUp(24)}</div>
          <div><p class="metric-label">Pedidos Entregados</p><p class="metric-value">${pedidosEntregados}</p></div>
        </div></div>
      </div>

      <div class="dashboard-grid">
        <div class="section-card">
          <h3>Top 5 Productos Más Vendidos</h3>
          ${topHtml}
        </div>
        <div class="section-card">
          <div class="pending-header">
            <h3 style="margin-bottom:0;">Pagos Pendientes</h3>
            <div class="pending-count">${Icons.Clock(20)}<span>${pagosPendientes.length}</span></div>
          </div>
          ${pendingHtml}
        </div>
      </div>

      <div class="full-card">
        <h3 style="font-family:var(--font-serif);font-size:20px;margin-bottom:24px;">Pedidos Activos</h3>
        <div style="overflow-x:auto;">
          <table class="orders-table">
            <thead><tr>
              <th>ID Pedido</th><th>Cliente</th><th>Fecha</th>
              <th>Total</th><th>Estado</th><th>Artículos</th><th></th>
            </tr></thead>
            <tbody>
              ${tableRows || `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--muted-fg);">No hay pedidos activos</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', renderDashboard);
