// ===== ADMIN PANEL PAGE =====
let _filtroRol     = 'TODOS';
let _filtroEstado  = 'TODOS';
let _usuariosAdmin = null;
let _adminTab      = 'usuarios';
let _puntosAdmin   = null;

/* Abre modal para crear usuario con rol VENDEDOR o ADMIN. */
function openCrearUsuarioModal() {
  const overlay = document.createElement('div');
  overlay.id = 'modal-crear-usuario';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;
    display:flex;align-items:center;justify-content:center;padding:16px;
  `;

  overlay.innerHTML = `
    <div style="background:var(--card);border-radius:12px;padding:32px;width:100%;max-width:460px;
                box-shadow:0 20px 60px rgba(0,0,0,.4);position:relative;
                max-height:90vh;overflow-y:auto;">
      <h3 style="font-family:var(--font-serif);font-size:22px;margin-bottom:4px;">Agregar usuario</h3>
      <p style="color:var(--muted-fg);font-size:13px;margin-bottom:24px;">Solo roles Vendedor y Administrador.</p>

      <div class="form-group">
        <label class="form-label">Nombre completo</label>
        <input id="cu-nombre" type="text" class="form-input" placeholder="Nombre del usuario" />
      </div>
      <div class="form-group">
        <label class="form-label">Correo electrónico</label>
        <input id="cu-email" type="email" class="form-input" placeholder="correo@ejemplo.com" />
      </div>
      <div class="form-group">
        <label class="form-label">Contraseña</label>
        <input id="cu-password" type="password" class="form-input" placeholder="Mínimo 8 caracteres" />
      </div>
      <div class="form-group">
        <label class="form-label">Rol</label>
        <select id="cu-rol" class="form-input">
          <option value="VENDEDOR">Vendedor</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </div>

      <div id="cu-admin-warning" style="display:none;background:rgba(220,53,69,.08);border:1px solid rgba(220,53,69,.35);
           border-radius:8px;padding:16px;margin-bottom:16px;">
        <p style="color:var(--danger,#dc3545);font-weight:600;margin-bottom:12px;font-size:14px;">
          ⚠️ Advertencia: permisos de administrador
        </p>
        <p style="color:var(--muted-fg);font-size:13px;margin-bottom:14px;">
          Este usuario tendrá acceso completo al panel de administración, incluyendo gestión de usuarios, productos y pedidos.
        </p>
        <label style="display:grid;grid-template-columns:16px 1fr;gap:10px;cursor:pointer;margin-bottom:10px;font-size:13px;">
          <input type="checkbox" id="cu-confirm1" style="margin-top:2px;" />
          <span>Confirmo que deseo crear un usuario con rol de administrador.</span>
        </label>
        <label style="display:grid;grid-template-columns:16px 1fr;gap:10px;cursor:pointer;font-size:13px;">
          <input type="checkbox" id="cu-confirm2" style="margin-top:2px;" />
          <span>Entiendo que tendrá acceso total al sistema y asumo la responsabilidad.</span>
        </label>
      </div>

      <div id="cu-error" style="display:none;color:var(--danger,#dc3545);font-size:13px;margin-bottom:12px;"></div>

      <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:8px;">
        <button id="cu-cancel" class="btn btn-secondary">Cancelar</button>
        <button id="cu-submit" class="btn btn-primary">Crear usuario</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const rolSelect   = overlay.querySelector('#cu-rol');
  const warning     = overlay.querySelector('#cu-admin-warning');
  const confirm1    = overlay.querySelector('#cu-confirm1');
  const confirm2    = overlay.querySelector('#cu-confirm2');
  const submitBtn   = overlay.querySelector('#cu-submit');
  const errorDiv    = overlay.querySelector('#cu-error');

  function updateSubmitState() {
    if (rolSelect.value === 'ADMIN') {
      submitBtn.disabled = !(confirm1.checked && confirm2.checked);
    } else {
      submitBtn.disabled = false;
    }
  }

  rolSelect.addEventListener('change', () => {
    warning.style.display = rolSelect.value === 'ADMIN' ? 'block' : 'none';
    confirm1.checked = false;
    confirm2.checked = false;
    updateSubmitState();
  });
  confirm1.addEventListener('change', updateSubmitState);
  confirm2.addEventListener('change', updateSubmitState);

  overlay.querySelector('#cu-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#cu-submit').addEventListener('click', async () => {
    const nombre   = overlay.querySelector('#cu-nombre').value.trim();
    const email    = overlay.querySelector('#cu-email').value.trim();
    const password = overlay.querySelector('#cu-password').value;
    const rol      = rolSelect.value;

    errorDiv.style.display = 'none';

    if (!nombre || !email || !password) {
      errorDiv.textContent = 'Todos los campos son requeridos.';
      errorDiv.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creando…';

    try {
      const nuevo = await Api.crearUsuario({
        nombre, email, password, rol,
        confirmar_admin: rol === 'ADMIN' ? true : undefined,
      });
      _usuariosAdmin = [nuevo, ...(_usuariosAdmin || [])];
      overlay.remove();
      renderAdmin();
      showToast(`Usuario ${nuevo.nombre} creado como ${rol}.`, 'success');
    } catch (e) {
      errorDiv.textContent = e.message || 'Error al crear el usuario.';
      errorDiv.style.display = 'block';
      submitBtn.disabled = rol === 'ADMIN' ? !(confirm1.checked && confirm2.checked) : false;
      submitBtn.textContent = 'Crear usuario';
    }
  });
}

/* Modal para crear un punto de entrega. */
function openCrearPuntoModal() {
  const overlay = document.createElement('div');
  overlay.id = 'modal-crear-punto';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;
    display:flex;align-items:center;justify-content:center;padding:16px;
  `;
  overlay.innerHTML = `
    <div style="background:var(--card);border-radius:12px;padding:32px;width:100%;max-width:460px;
                box-shadow:0 20px 60px rgba(0,0,0,.4);position:relative;">
      <h3 style="font-family:var(--font-serif);font-size:22px;margin-bottom:4px;">Agregar punto de entrega</h3>
      <p style="color:var(--muted-fg);font-size:13px;margin-bottom:24px;">Los clientes podrán seleccionarlo al hacer su pedido.</p>

      <div class="form-group">
        <label class="form-label">Nombre del punto <span style="color:var(--primary);">*</span></label>
        <input id="cp-nombre" type="text" class="form-input" placeholder="Ej. Centro Comercial Plaza, Sucursal Norte" />
      </div>
      <div class="form-group">
        <label class="form-label">Descripción (opcional)</label>
        <input id="cp-descripcion" type="text" class="form-input" placeholder="Ej. Lunes a Viernes 10am–7pm" />
      </div>

      <div id="cp-error" style="display:none;color:var(--danger,#dc3545);font-size:13px;margin-bottom:12px;"></div>

      <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:8px;">
        <button id="cp-cancel" class="btn btn-secondary">Cancelar</button>
        <button id="cp-submit" class="btn btn-primary">Crear punto</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const errorDiv  = overlay.querySelector('#cp-error');
  const submitBtn = overlay.querySelector('#cp-submit');

  overlay.querySelector('#cp-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  submitBtn.addEventListener('click', async () => {
    const nombre      = overlay.querySelector('#cp-nombre').value.trim();
    const descripcion = overlay.querySelector('#cp-descripcion').value.trim();

    errorDiv.style.display = 'none';
    if (!nombre) {
      errorDiv.textContent = 'El nombre es requerido.';
      errorDiv.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creando…';

    try {
      const nuevo = await Api.crearPuntoEntrega({ nombre, descripcion: descripcion || null });
      _puntosAdmin = [nuevo, ...(_puntosAdmin || [])];
      overlay.remove();
      renderAdminPuntos();
      showToast(`Punto "${nuevo.nombre}" creado.`, 'success');
    } catch (e) {
      errorDiv.textContent = e.message || 'Error al crear el punto.';
      errorDiv.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Crear punto';
    }
  });
}

/* Renderiza la pestaña de puntos de entrega. */
async function renderAdminPuntos() {
  if (!requireAuth(['ADMIN'])) return;
  renderHeader();

  const root = document.getElementById('app-root');

  if (!_puntosAdmin) {
    root.innerHTML = `<div style="text-align:center;padding:64px;color:var(--muted-fg);">Cargando puntos…</div>`;
    try {
      _puntosAdmin = await Api.getPuntosEntrega();
    } catch (e) {
      root.innerHTML = `<div style="text-align:center;padding:64px;color:var(--danger);">Error al cargar puntos: ${e.message || 'Error de red'}</div>`;
      return;
    }
  }

  const puntos  = _puntosAdmin || [];
  const rows    = puntos.length === 0
    ? `<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--muted-fg);">No hay puntos de entrega registrados</td></tr>`
    : puntos.map(p => `
        <tr>
          <td>${p.nombre}</td>
          <td style="color:var(--muted-fg);font-size:13px;">${p.descripcion || '—'}</td>
          <td><span class="badge ${p.activo ? 'badge-green' : 'badge-red'}">${p.activo ? 'Activo' : 'Inactivo'}</span></td>
          <td style="text-align:center;">
            <button class="toggle-switch ${p.activo ? 'on' : 'off'}" data-pid="${p.id_punto_entrega}">
              <span class="toggle-knob"></span>
            </button>
          </td>
        </tr>`).join('');

  root.innerHTML = `
    <div class="admin-layout">
      ${renderAdminTabs()}
      <div class="admin-header">
        <div class="admin-icon">${Icons.MapPin(24)}</div>
        <div>
          <h2 style="font-family:var(--font-serif);font-size:28px;">Puntos de Entrega</h2>
          <p style="color:var(--muted-fg);font-size:13px;">Lugares donde los clientes pueden recoger sus pedidos</p>
        </div>
        <button id="btn-agregar-punto" class="btn btn-primary" style="margin-left:auto;">
          + Agregar punto
        </button>
      </div>

      <div class="card" style="overflow:hidden;">
        <div style="overflow-x:auto;">
          <table class="users-table">
            <thead><tr>
              <th>Nombre</th><th>Descripción</th><th>Estado</th>
              <th style="text-align:center;">Acción</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>

      <div class="admin-footer">
        <p>Total: ${puntos.length} puntos · Activos: ${puntos.filter(p => p.activo).length}</p>
      </div>
    </div>
  `;

  document.getElementById('btn-agregar-punto')?.addEventListener('click', openCrearPuntoModal);

  document.querySelectorAll('.toggle-switch').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pid = btn.dataset.pid;
      btn.disabled = true;
      try {
        const updated = await Api.toggleActivoPunto(pid);
        const p = _puntosAdmin.find(x => String(x.id_punto_entrega) === String(pid));
        if (p) p.activo = updated.activo;
        renderAdminPuntos();
      } catch (e) {
        btn.disabled = false;
        showToast(e.message || 'Error al actualizar el punto', 'error');
      }
    });
  });

  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _adminTab = btn.dataset.tab;
      if (_adminTab === 'usuarios') renderAdmin();
      else renderAdminPuntos();
    });
  });
}

/* Genera el HTML de las pestañas del panel admin. */
function renderAdminTabs() {
  return `
    <div style="display:flex;gap:4px;margin-bottom:24px;border-bottom:1px solid var(--border);padding-bottom:0;">
      <button class="admin-tab-btn ${_adminTab === 'usuarios' ? 'active' : ''}" data-tab="usuarios"
        style="padding:10px 20px;background:none;border:none;border-bottom:2px solid ${_adminTab === 'usuarios' ? 'var(--primary)' : 'transparent'};
               color:${_adminTab === 'usuarios' ? 'var(--primary)' : 'var(--muted-fg)'};cursor:pointer;font-size:14px;font-weight:500;">
        ${Icons.Users(16)} Usuarios
      </button>
      <button class="admin-tab-btn ${_adminTab === 'puntos' ? 'active' : ''}" data-tab="puntos"
        style="padding:10px 20px;background:none;border:none;border-bottom:2px solid ${_adminTab === 'puntos' ? 'var(--primary)' : 'transparent'};
               color:${_adminTab === 'puntos' ? 'var(--primary)' : 'var(--muted-fg)'};cursor:pointer;font-size:14px;font-weight:500;">
        ${Icons.MapPin(16)} Puntos de Entrega
      </button>
    </div>`;
}

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
      ${renderAdminTabs()}
      <div class="admin-header">
        <div class="admin-icon">${Icons.Users(24)}</div>
        <div>
          <h2 style="font-family:var(--font-serif);font-size:28px;">Panel de Administración</h2>
          <p style="color:var(--muted-fg);font-size:13px;">Gestión de usuarios del sistema</p>
        </div>
        <button id="btn-agregar-usuario" class="btn btn-primary" style="margin-left:auto;">
          + Agregar usuario
        </button>
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

  document.getElementById('btn-agregar-usuario')?.addEventListener('click', openCrearUsuarioModal);

  document.getElementById('filter-rol')?.addEventListener('change', e => {
    _filtroRol = e.target.value; renderAdmin();
  });
  document.getElementById('filter-estado')?.addEventListener('change', e => {
    _filtroEstado = e.target.value; renderAdmin();
  });

  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _adminTab = btn.dataset.tab;
      if (_adminTab === 'puntos') renderAdminPuntos();
      else renderAdmin();
    });
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
