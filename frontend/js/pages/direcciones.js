// ===== DIRECCIONES PAGE =====
function renderDirecciones() {
  if (!requireAuth(['CLIENTE'])) return;
  renderHeader();

  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="orders-layout">
      <div style="display:flex;flex-direction:column;align-items:center;padding-top:120px;gap:12px;color:var(--muted-fg);">
        ${Icons.MapPin(32)}
        <p>Cargando direcciones...</p>
      </div>
    </div>`;

  Api.getDirecciones()
    .then(data => {
      AppState.setDirecciones(data.map(normalizarDireccion));
      renderDireccionesList();
    })
    .catch(() => renderDireccionesList());
}

function renderDireccionesList() {
  const root = document.getElementById('app-root');
  const dirs = AppState.direcciones;

  const contenido = dirs.length === 0
    ? `<div class="empty-state" style="padding-top:80px;">
        ${Icons.MapPin(64)}
        <h2>Sin direcciones guardadas</h2>
        <p>Agrega una dirección para poder realizar pedidos</p>
       </div>`
    : `<div class="direcciones-grid">${dirs.map(renderTarjetaDireccion).join('')}</div>`;

  root.innerHTML = `
    <div class="orders-layout">
      <div class="page-header">
        <h2 class="page-title">Mis Direcciones</h2>
        <button class="btn btn-primary" id="btn-nueva-dir">
          ${Icons.Plus(16)} Nueva dirección
        </button>
      </div>
      ${contenido}
    </div>`;

  document.getElementById('btn-nueva-dir')?.addEventListener('click', () => {
    abrirModalDireccion(null, (nueva) => {
      AppState.agregarDireccionNormalizada(nueva);
      renderDireccionesList();
      showToast('Dirección agregada', 'success');
    });
  });

  document.querySelectorAll('.dir-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = AppState.direcciones.find(d => String(d.id) === btn.dataset.id);
      if (!dir) return;
      abrirModalDireccion(dir, (actualizada) => {
        AppState.editarDireccion(dir.id, actualizada);
        renderDireccionesList();
        showToast('Dirección actualizada', 'success');
      });
    });
  });

  document.querySelectorAll('.dir-principal-btn').forEach(btn => {
    btn.addEventListener('click', () => marcarPrincipal(btn.dataset.id));
  });
}

function renderTarjetaDireccion(d) {
  const numInt = d.numero_interior ? ` Int. ${d.numero_interior}` : '';
  return `
    <div class="card">
      <div class="card-body">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:8px;color:var(--primary);">
            ${Icons.MapPin(18)}
            <span style="font-family:var(--font-serif);font-size:15px;">${d.calle} ${d.numero_exterior}${numInt}</span>
          </div>
          ${d.es_principal ? `<span class="badge badge-gold">Principal</span>` : ''}
        </div>
        <div class="address-lines" style="margin-bottom:16px;">
          <p>${d.colonia}</p>
          <p>${d.ciudad}, ${d.estado} C.P. ${d.codigo_postal}</p>
          <p>${d.pais}</p>
          ${d.referencias ? `<p style="color:var(--muted-fg);font-size:12px;margin-top:4px;">Ref: ${d.referencias}</p>` : ''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm dir-edit-btn" data-id="${d.id}">
            ${Icons.Pencil(14)} Editar
          </button>
          ${!d.es_principal ? `
          <button class="btn btn-ghost btn-sm dir-principal-btn" data-id="${d.id}">
            Marcar como principal
          </button>` : ''}
        </div>
      </div>
    </div>`;
}

async function marcarPrincipal(id) {
  const dir = AppState.direcciones.find(d => String(d.id) === String(id));
  if (!dir) return;

  const payload = {
    calle: dir.calle, numeroExterior: dir.numero_exterior,
    colonia: dir.colonia, ciudad: dir.ciudad, estado: dir.estado,
    codigoPostal: dir.codigo_postal, pais: dir.pais,
    principal: true,
    ...(dir.numero_interior && { numeroInterior: dir.numero_interior }),
    ...(dir.referencias     && { referencias: dir.referencias })
  };

  try {
    const actualizada = await Api.modificarDireccion(id, payload);
    AppState.editarDireccion(id, normalizarDireccion(actualizada));
    renderDireccionesList();
    showToast('Dirección principal actualizada', 'success');
  } catch (err) {
    showToast(err.message || 'Error al actualizar la dirección.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', renderDirecciones);
