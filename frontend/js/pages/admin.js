// ===== ADMIN PANEL PAGE =====
let _filtroRol    = 'TODOS';
let _filtroEstado = 'TODOS';
let _usuariosAdmin = null; // cache de usuarios cargados desde la API

/* Punto de entrada: carga usuarios desde la API y luego renderiza. */
async function initAdmin() {
  if (!requireAuth(['ADMIN'])) return;
  renderHeader();

  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div style="text-align:center;padding:64px;color:var(--muted-fg);">
      Cargando usuarios…
    </div>`;

  try {
    _usuariosAdmin = await Api.getUsuarios();
  } catch (e) {
    _usuariosAdmin = [];
    root.innerHTML = `
      <div style="text-align:center;padding:64px;color:var(--danger);">
        Error al cargar usuarios: ${e.message || 'Error de red'}
      </div>`;
    return;
  }

  renderAdmin();
}

function renderAdmin() {
  if (!requireAuth(['ADMIN'])) return;
  renderHeader();

  const root          = document.getElementById('app-root');
  const currentUserId = String(AppState.currentUser?.id);
  const usuarios      = _usuariosAdmin || [];

  const filtrados = usuarios.filter(u => {
    const okRol    = _filtroRol    === 'TODOS' || u.rol    === _filtroRol;
    const okEstado = _filtroEstado === 'TODOS' || u.estado === _filtroEstado;
    return okRol && okEstado;
  });

  const rolBadge = (rol) => {
    const cls = rol === 'ADMIN' ? 'badge-gold' : rol === 'VENDEDOR' ? 'badge-blue' : 'badge-gray';
    return `<span class="badge ${cls}">${rol}</span>`;
  };

  const rows = filtrados.map(u => {
    const esYo = String(u.id) === currentUserId;
    const toggleBtn = esYo
      ? `<button class="toggle-switch ${u.estado === 'activo' ? 'on' : 'off'} toggle-disabled"
                title="No puedes modificar tu propia cuenta" disabled>
           <span class="toggle-knob"></span>
         </button>`
      : `<button class="toggle-switch ${u.estado === 'activo' ? 'on' : 'off'}" data-uid="${u.id}">
           <span class="toggle-knob"></span>
         </button>`;

    return `
      <tr>
        <td>${u.nombre}${esYo ? ' <span class="badge badge-gold" style="font-size:10px;">Tú</span>' : ''}</td>
        <td style="color:var(--muted-fg);">${u.correo}</td>
        <td>${rolBadge(u.rol)}</td>
        <td><span class="badge ${u.estado === 'activo' ? 'badge-green' : 'badge-red'}">${u.estado}</span></td>
        <td style="color:var(--muted-fg);font-size:13px;">${formatDateShort(u.fecha_creacion)}</td>
        <td style="text-align:center;">${toggleBtn}</td>
      </tr>`;
  }).join('');

  const activos   = usuarios.filter(u => u.estado === 'activo').length;
  const inactivos = usuarios.filter(u => u.estado === 'inactivo').length;

  root.innerHTML = `
    <div class="admin-layout">
      <div class="admin-header">
        <div class="admin-icon">${Icons.Users(24)}</div>
        <div>
          <h2 style="font-family:var(--font-serif);font-size:28px;">Panel de Administración</h2>
          <p style="color:var(--muted-fg);font-size:13px;">Gestión de usuarios del sistema</p>
        </div>
      </div>

      <div class="filters-card">
        <div class="filters-header">${Icons.Filter(20)}<h3>Filtros</h3></div>
        <div class="filters-grid">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Filtrar por rol</label>
            <select id="filter-rol">
              <option value="TODOS"    ${_filtroRol === 'TODOS'    ? 'selected' : ''}>Todos los roles</option>
              <option value="ADMIN"    ${_filtroRol === 'ADMIN'    ? 'selected' : ''}>Administrador</option>
              <option value="VENDEDOR" ${_filtroRol === 'VENDEDOR' ? 'selected' : ''}>Vendedor</option>
              <option value="CLIENTE"  ${_filtroRol === 'CLIENTE'  ? 'selected' : ''}>Cliente</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Filtrar por estado</label>
            <select id="filter-estado">
              <option value="TODOS"    ${_filtroEstado === 'TODOS'    ? 'selected' : ''}>Todos los estados</option>
              <option value="activo"   ${_filtroEstado === 'activo'   ? 'selected' : ''}>Activo</option>
              <option value="inactivo" ${_filtroEstado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card" style="overflow:hidden;">
        <div style="overflow-x:auto;">
          <table class="users-table">
            <thead><tr>
              <th>Nombre</th><th>Correo</th><th>Rol</th>
              <th>Estado</th><th>Fecha Creación</th>
              <th style="text-align:center;">Acción</th>
            </tr></thead>
            <tbody>
              ${rows || `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--muted-fg);">No se encontraron usuarios con esos criterios</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="admin-footer">
        <p>Mostrando ${filtrados.length} de ${usuarios.length} usuarios</p>
        <div class="admin-stats"><p>Activos: ${activos}</p><p>Inactivos: ${inactivos}</p></div>
      </div>
    </div>
  `;

  document.getElementById('filter-rol')?.addEventListener('change', e => {
    _filtroRol = e.target.value; renderAdmin();
  });
  document.getElementById('filter-estado')?.addEventListener('change', e => {
    _filtroEstado = e.target.value; renderAdmin();
  });

  document.querySelectorAll('.toggle-switch:not(.toggle-disabled)').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uid = btn.dataset.uid;
      btn.disabled = true;

      try {
        const updated = await Api.toggleEstadoUsuario(uid);
        const u = _usuariosAdmin.find(u => u.id === updated.id);
        if (u) u.estado = updated.estado;
        renderAdmin();
      } catch (e) {
        btn.disabled = false;
        showToast(e.message || 'Error al actualizar el estado', 'error');
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', initAdmin);
