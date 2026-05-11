// ===== VENDOR CATALOG PAGE =====
let _modal         = null;   // null | { mode:'new'|'edit', productoId:string|null }
let _form          = { nombre:'', descripcion:'', precio_base:'', disponible:true };
let _imgs          = [];     // [{ id_imagen?, url, orden, file? }]
let _tallasSelected = [];    // [id_talla, ...]
let _tallasStockMap = {};    // { [id_talla]: stock }
let _confirmDelete = null;
let _originalImgIds = [];    // id_imagen values presentes al abrir edit
let _stockModal    = null;   // null | productoId (modal rápido de stock desde tarjeta)
let _stockModalData = [];    // [{ id_talla, nombre, stock }]

// Datos cargados desde la API
let _productos = [];
let _tallas    = [];         // [{ id_talla, nombre }]

// Estado modal de gestión de tallas
let _tallasModal      = false;
let _editingTallaId   = null;   // id_talla en edición inline, o null
let _newTallaNombre   = '';
let _newTallaEsNinio  = false;
let _newTallaDesc     = '';
let _editTallaNombre  = '';
let _editTallaEsNinio = false;
let _editTallaDesc    = '';

// ─── Carga inicial ────────────────────────────────────────────
async function loadCatalogoVendedor() {
  if (!requireAuth(['VENDEDOR','ADMIN'])) return;
  renderHeader();
  const root = document.getElementById('app-root');
  root.innerHTML = `<div style="text-align:center;padding:48px;color:var(--muted-fg);">Cargando...</div>`;
  try {
    [_productos, _tallas] = await Promise.all([
      Api.getAllProductosAdmin(),
      Api.getTallas()
    ]);
  } catch (e) {
    showToast('Error al cargar datos', 'error');
    _productos = []; _tallas = [];
  }
  renderCatalogoVendedor();
}

// ─── Render principal ─────────────────────────────────────────
function renderCatalogoVendedor() {
  if (!requireAuth(['VENDEDOR','ADMIN'])) return;
  renderHeader();

  const root = document.getElementById('app-root');

  const grid = _productos.length === 0
    ? `<div class="empty-state" style="min-height:40vh;">
        ${Icons.ImagePlus(48)}
        <p style="color:var(--muted-fg);">No hay productos. ¡Agrega el primero!</p>
        <button class="btn btn-ghost" id="add-first">+ Agregar producto</button>
       </div>`
    : `<div class="vendor-grid">${_productos.map(vendorCard).join('')}</div>`;

  root.innerHTML = `
    <div class="vendor-catalog-layout">
      <div class="vendor-header">
        <div>
          <h2 class="page-title">Catálogo de Productos</h2>
          <p class="vendor-header-sub">
            ${_productos.length} producto${_productos.length!==1?'s':''} · ${_productos.filter(p=>p.disponible).length} publicados
          </p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline" id="tallas-btn">${Icons.Pencil(16)} Gestionar tallas</button>
          <button class="btn btn-primary" id="add-btn">${Icons.Plus(16)} Agregar producto</button>
        </div>
      </div>
      ${grid}
    </div>
    ${_modal ? productModal() : ''}
    ${_confirmDelete ? deleteModal() : ''}
    ${_tallasModal ? tallasManagerModal() : ''}
    ${_stockModal ? stockManagerModal() : ''}
  `;

  document.getElementById('add-btn')?.addEventListener('click', openNew);
  document.getElementById('add-first')?.addEventListener('click', openNew);
  document.getElementById('tallas-btn')?.addEventListener('click', () => {
    _tallasModal = true; _editingTallaId = null; _newTallaNombre = ''; _editTallaNombre = '';
    renderCatalogoVendedor();
  });

  root.querySelectorAll('[data-action]').forEach(el => {
    const { action, pid } = el.dataset;
    if (action === 'edit')   el.addEventListener('click', () => openEdit(pid));
    if (action === 'stock')  el.addEventListener('click', () => openStockModal(pid));
    if (action === 'delete') el.addEventListener('click', () => { _confirmDelete = pid; renderCatalogoVendedor(); });
    if (action === 'toggle') el.addEventListener('click', async () => {
      const p = _productos.find(x => x.id === pid);
      if (!p) return;
      el.disabled = true;
      try {
        await Api.updateProducto(pid, { disponible: !p.disponible });
        showToast(p.disponible ? 'Producto ocultado' : 'Producto publicado');
        await loadCatalogoVendedor();
      } catch (err) {
        showToast(err.message || 'Error al actualizar el producto', 'error');
        el.disabled = false;
      }
    });
  });

  if (_modal)         initModalEvents();
  if (_confirmDelete) initDeleteEvents();
  if (_tallasModal)   initTallasManagerEvents();
  if (_stockModal)    initStockModalEvents();
}

// ─── Tarjeta de producto ──────────────────────────────────────
function vendorCard(p) {
  const img = p.imagenes.length > 0 ? [...p.imagenes].sort((a,b)=>a.orden-b.orden)[0] : null;
  return `
    <div class="vendor-product-card">
      <div class="vendor-product-img">
        ${img ? `<img src="${img.url}" alt="${p.nombre}" />` : `<div class="no-image">${Icons.ImagePlus(32)}</div>`}
        ${p.imagenes.length > 1 ? `<span class="img-count-badge">+${p.imagenes.length-1} foto${p.imagenes.length-1!==1?'s':''}</span>` : ''}
        <span class="availability-badge ${p.disponible?'published':'hidden'}">${p.disponible?'Publicado':'Oculto'}</span>
      </div>
      <div class="vendor-product-body">
        <p class="vendor-product-name">${p.nombre}</p>
        <p class="vendor-product-price">$${formatCurrency(p.precio_base)} MXN</p>
        <p class="vendor-product-desc">${p.descripcion}</p>
        <div class="talla-tags">${p.tallas.map(t=>`<span class="talla-tag">${t.talla}</span>`).join('')}</div>
        <div class="product-actions">
          <button class="action-toggle ${p.disponible?'published':''}" data-action="toggle" data-pid="${p.id}">
            ${p.disponible ? `<span style="color:var(--green);">${Icons.ToggleRight(16)}</span>` : Icons.ToggleLeft(16)}
            ${p.disponible?'Ocultar':'Publicar'}
          </button>
          <button class="action-btn" data-action="stock"  data-pid="${p.id}" title="Gestionar stock">${Icons.Package(16)}</button>
          <button class="action-btn" data-action="edit"   data-pid="${p.id}" title="Editar">${Icons.Pencil(16)}</button>
          <button class="action-btn" data-action="delete" data-pid="${p.id}" title="Eliminar">${Icons.Trash2(16)}</button>
        </div>
      </div>
    </div>`;
}

// ─── Abrir modal nuevo ────────────────────────────────────────
function openNew() {
  _modal = { mode:'new', productoId:null };
  _form  = { nombre:'', descripcion:'', precio_base:'', disponible:true };
  _imgs  = []; _tallasSelected = []; _tallasStockMap = {}; _originalImgIds = [];
  renderCatalogoVendedor();
}

// ─── Abrir modal edición ──────────────────────────────────────
async function openEdit(id) {
  const basic = _productos.find(x => x.id === id);
  if (!basic) return;

  _modal = { mode:'edit', productoId:id };
  _form  = { nombre:basic.nombre, descripcion:basic.descripcion, precio_base:String(basic.precio_base), disponible:basic.disponible };
  _imgs  = []; _tallasSelected = []; _tallasStockMap = {}; _originalImgIds = [];

  // Obtener imágenes y tallas desde la API de detalle admin
  try {
    const full = await Api.getProductoAdminById(id);
    _imgs            = [...full.imagenes].sort((a,b)=>a.orden-b.orden).map(i=>({ id_imagen:i.id_imagen, url:i.url, orden:i.orden }));
    _tallasSelected  = full.tallas.map(t => t.id_talla);
    _originalImgIds  = full.imagenes.map(i => i.id_imagen);
    full.tallas.forEach(t => { _tallasStockMap[t.id_talla] = t.stock ?? 0; });
  } catch(e) {
    // continúa con datos vacíos; el vendedor puede agregar imágenes/tallas
  }

  renderCatalogoVendedor();
}

// ─── Modal de producto ────────────────────────────────────────
function productModal() {
  const isEdit = _modal.mode === 'edit';

  const imgsHtml = _imgs.length > 0
    ? `<div class="image-list">${_imgs.map((img,i) => `
        <div class="image-row">
          <img src="${img.url}" alt="Imagen ${i+1}" />
          <div class="image-row-info">
            <p class="image-row-label">${i===0 ? `<span style="color:var(--primary);">★ Principal</span>` : `Imagen ${i+1}`}</p>
            ${img.file ? `<p class="image-row-filename">${img.file.name}</p>` : ''}
          </div>
          <div class="image-order-btns">
            <button class="image-order-btn" data-move="up"   data-idx="${i}" ${i===0               ?'disabled':''} >${Icons.ArrowUp(14)}</button>
            <button class="image-order-btn" data-move="down" data-idx="${i}" ${i===_imgs.length-1  ?'disabled':''} >${Icons.ArrowDown(14)}</button>
          </div>
          <button class="image-remove-btn" data-ridx="${i}">${Icons.X(16)}</button>
        </div>`).join('')}</div>`
    : '';

  const tallasHtml = _tallas.length > 0
    ? _tallas.map(t => `
        <button type="button" class="size-toggle ${_tallasSelected.some(x => +x === +t.id_talla)?'selected':''}" data-talla-id="${t.id_talla}">${t.nombre}</button>`
      ).join('')
    : `<p style="font-size:12px;color:var(--muted-fg);">No hay tallas registradas.</p>`;

  return `
    <div class="modal-overlay" id="prod-modal">
      <div class="modal-box">
        <div class="modal-header">
          <h3>${isEdit ? 'Editar producto' : 'Nuevo producto'}</h3>
          <button class="modal-close" id="close-modal">${Icons.X(20)}</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Nombre <span style="color:var(--primary);">*</span></label>
            <input type="text" id="f-nombre" value="${_form.nombre}" placeholder="Ej. Vestido de Noche Elegante" />
          </div>
          <div class="form-group">
            <label class="form-label">Descripción</label>
            <textarea id="f-desc" rows="3" placeholder="Describe el producto...">${_form.descripcion}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Precio (MXN) <span style="color:var(--primary);">*</span></label>
            <input type="number" id="f-precio" value="${_form.precio_base}" placeholder="0.00" min="0" />
          </div>
          <div class="form-group">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <label class="form-label" style="margin:0;">Imágenes</label>
              <span style="font-size:11px;color:var(--muted-fg);">La primera es la principal</span>
            </div>
            ${imgsHtml}
            <input type="file" id="file-imgs" accept="image/*" multiple style="display:none;" />
            <button class="upload-area" id="add-imgs-btn">
              ${Icons.ImagePlus(20)}
              <span style="font-size:13px;">${_imgs.length===0?'Subir imágenes':'Agregar más imágenes'}</span>
            </button>
            <p class="form-hint">PNG, JPG, WEBP · Puedes subir varias · Usa las flechas para ordenarlas</p>
          </div>
          <div class="form-group">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <label class="form-label" style="margin:0;">Tallas disponibles <span style="color:var(--primary);">*</span></label>
              <button class="btn btn-outline btn-xs" id="open-tallas-from-modal" title="Dar de alta nueva talla" style="display:flex;align-items:center;gap:4px;">${Icons.Plus(14)} Nueva talla</button>
            </div>
            <div class="size-selector" id="tallas-sel">${tallasHtml}</div>
          </div>
          <div class="form-group" id="stock-section" ${_tallasSelected.length === 0 ? 'style="display:none;"' : ''}>
            <label class="form-label">Stock por talla</label>
            <div id="stock-list">
              ${_tallasSelected.map(id => {
                const t = _tallas.find(x => +x.id_talla === +id);
                return `<div class="stock-row">
                  <span class="stock-talla-name">${t?.nombre ?? id}</span>
                  <input type="number" class="stock-input" data-talla-id="${id}" value="${_tallasStockMap[id] ?? ''}" min="0" placeholder="0" />
                  <span class="stock-unit">uds.</span>
                </div>`;
              }).join('')}
            </div>
          </div>
          <div class="form-group">
            <div class="publish-row">
              <div>
                <p>Publicar en catálogo</p>
                <p>Los clientes podrán ver y comprar este producto</p>
              </div>
              <button id="toggle-disp">
                ${_form.disponible
                  ? `<span style="color:var(--green);">${Icons.ToggleRight(32)}</span>`
                  : Icons.ToggleLeft(32)}
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" style="flex:1;" id="cancel-modal">Cancelar</button>
            <button class="btn btn-primary" style="flex:1;" id="save-prod">
              ${isEdit ? 'Guardar cambios' : 'Agregar producto'}
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

// ─── Modal de confirmación de eliminación ─────────────────────
function deleteModal() {
  return `
    <div class="modal-overlay" id="del-modal">
      <div class="modal-box modal-small">
        <div class="modal-body">
          <h3 style="font-family:var(--font-serif);font-size:20px;margin-bottom:8px;">¿Eliminar producto?</h3>
          <p style="font-size:13px;color:var(--muted-fg);margin-bottom:24px;">Esta acción no se puede deshacer.</p>
          <div class="modal-footer">
            <button class="btn btn-outline" style="flex:1;" id="cancel-del">Cancelar</button>
            <button class="btn btn-danger"  style="flex:1;" id="confirm-del">Eliminar</button>
          </div>
        </div>
      </div>
    </div>`;
}

// ─── Sincroniza los inputs del DOM hacia _form (evita reseteo en re-renders) ─
function _syncFormFromDOM() {
  const nombre = document.getElementById('f-nombre')?.value;
  const desc   = document.getElementById('f-desc')?.value;
  const precio = document.getElementById('f-precio')?.value;
  if (nombre !== undefined) _form.nombre      = nombre;
  if (desc   !== undefined) _form.descripcion = desc;
  if (precio !== undefined) _form.precio_base = precio;
  document.querySelectorAll('.stock-input').forEach(input => {
    _tallasStockMap[+input.dataset.tallaId] = parseInt(input.value, 10) || 0;
  });
}

// ─── Restricción Unitalla: excluyente con otras tallas ───────
function _applyTallaConstraints() {
  const unitallaId = _tallas.find(t => t.nombre === 'Unitalla')?.id_talla;
  const hasUnitalla = unitallaId != null && _tallasSelected.some(id => +id === +unitallaId);
  const hasOthers   = _tallasSelected.some(id => +id !== +unitallaId);

  document.querySelectorAll('#tallas-sel .size-toggle').forEach(btn => {
    const btnId = +btn.dataset.tallaId;
    const isUnitalla = unitallaId != null && btnId === +unitallaId;
    const shouldDisable = (hasUnitalla && !isUnitalla) || (hasOthers && isUnitalla);
    btn.disabled      = shouldDisable;
    btn.style.opacity = shouldDisable ? '0.35' : '';
    btn.style.cursor  = shouldDisable ? 'not-allowed' : '';
  });
}

// ─── Eventos del modal de producto ───────────────────────────
function initModalEvents() {
  _applyTallaConstraints();

  const closeModal = () => {
    _imgs.forEach(i => { if (i.file) URL.revokeObjectURL(i.url); });
    _modal = null; renderCatalogoVendedor();
  };

  document.getElementById('close-modal')?.addEventListener('click',  closeModal);
  document.getElementById('cancel-modal')?.addEventListener('click', closeModal);
  document.getElementById('prod-modal')?.addEventListener('click',   e => { if (e.target.id==='prod-modal') closeModal(); });

  document.getElementById('add-imgs-btn')?.addEventListener('click', () => document.getElementById('file-imgs')?.click());
  document.getElementById('file-imgs')?.addEventListener('change', e => {
    Array.from(e.target.files||[]).forEach(f => _imgs.push({ url: URL.createObjectURL(f), file: f }));
    e.target.value = '';
    _syncFormFromDOM();
    renderCatalogoVendedor();
  });

  document.querySelectorAll('[data-move]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.idx, dir = btn.dataset.move;
      const t = dir==='up' ? i-1 : i+1;
      if (t<0 || t>=_imgs.length) return;
      [_imgs[i],_imgs[t]] = [_imgs[t],_imgs[i]];
      _syncFormFromDOM();
      renderCatalogoVendedor();
    });
  });

  document.querySelectorAll('[data-ridx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.ridx;
      if (_imgs[i].file) URL.revokeObjectURL(_imgs[i].url);
      _imgs.splice(i, 1);
      _syncFormFromDOM();
      renderCatalogoVendedor();
    });
  });

  // Toggle de talla: actualiza clase y sección de stock sin re-renderizar
  document.getElementById('tallas-sel')?.addEventListener('click', e => {
    const btn = e.target.closest('.size-toggle');
    if (!btn) return;
    const id = +btn.dataset.tallaId;
    const stockSection = document.getElementById('stock-section');
    const stockList    = document.getElementById('stock-list');
    const nombre = btn.textContent.trim();
    if (_tallasSelected.some(x => +x === id)) {
      _tallasSelected = _tallasSelected.filter(x => +x !== id);
      btn.classList.remove('selected');
      document.querySelector(`.stock-input[data-talla-id="${id}"]`)?.closest('.stock-row')?.remove();
    } else {
      _tallasSelected = [..._tallasSelected, id];
      btn.classList.add('selected');
      if (stockList) {
        const row = document.createElement('div');
        row.className = 'stock-row';
        row.innerHTML = `
          <span class="stock-talla-name">${nombre}</span>
          <input type="number" class="stock-input" data-talla-id="${id}" value="${_tallasStockMap[id] ?? ''}" min="0" placeholder="0" />
          <span class="stock-unit">uds.</span>`;
        stockList.appendChild(row);
      }
    }
    if (stockSection) stockSection.style.display = _tallasSelected.length > 0 ? '' : 'none';
    _applyTallaConstraints();
  });

  // Sincronizar stock al escribir en los inputs
  document.getElementById('stock-list')?.addEventListener('input', e => {
    const input = e.target.closest('.stock-input');
    if (!input) return;
    _tallasStockMap[+input.dataset.tallaId] = parseInt(input.value, 10) || 0;
  });

  document.getElementById('open-tallas-from-modal')?.addEventListener('click', () => {
    _syncFormFromDOM();
    _tallasModal = true; _editingTallaId = null; _newTallaNombre = ''; _newTallaEsNinio = false; _newTallaDesc = '';
    renderCatalogoVendedor();
  });

  // Toggle disponible: actualiza ícono directamente, sin re-renderizar
  document.getElementById('toggle-disp')?.addEventListener('click', () => {
    _form.disponible = !_form.disponible;
    const btn = document.getElementById('toggle-disp');
    if (btn) btn.innerHTML = _form.disponible
      ? `<span style="color:var(--green);">${Icons.ToggleRight(32)}</span>`
      : Icons.ToggleLeft(32);
  });

  document.getElementById('save-prod')?.addEventListener('click', async () => {
    const nombre      = document.getElementById('f-nombre')?.value.trim() || '';
    const descripcion = document.getElementById('f-desc')?.value.trim() || '';
    const precioStr   = document.getElementById('f-precio')?.value || '';

    if (!nombre)                                          { showToast('El nombre es requerido','error'); return; }
    if (!precioStr || isNaN(+precioStr) || +precioStr<=0) { showToast('Ingresa un precio válido','error'); return; }
    if (_tallasSelected.length === 0)                     { showToast('Selecciona al menos una talla','error'); return; }

    const saveBtn = document.getElementById('save-prod');
    if (saveBtn) saveBtn.disabled = true;

    try {
      // Capturar stock desde DOM antes de construir payload
      document.querySelectorAll('.stock-input').forEach(input => {
        _tallasStockMap[+input.dataset.tallaId] = parseInt(input.value, 10) || 0;
      });

      const payload = {
        nombre, descripcion,
        precio_base:  +precioStr,
        disponible:   _form.disponible,
        tallas_stock: _tallasSelected.map(id => ({ id_talla: id, stock: _tallasStockMap[id] ?? 0 }))
      };

      let productoId;
      if (_modal.mode === 'new') {
        const res = await Api.createProducto(payload);
        productoId = String(res.producto.id_producto);
      } else {
        await Api.updateProducto(_modal.productoId, payload);
        productoId = _modal.productoId;
      }

      // Sincronizar imágenes
      if (_modal.mode === 'edit') {
        // Eliminar todas las imágenes originales y volver a subirlas en el orden actual
        for (const imgId of _originalImgIds) {
          try { await Api.deleteImagenProducto(productoId, imgId); } catch(e) {}
        }
      }
      for (let i = 0; i < _imgs.length; i++) {
        const img = _imgs[i];
        try {
          await Api.addImagenProducto(productoId, img.file || img.url, i + 1);
        } catch(e) {}
      }

      showToast(_modal.mode === 'new' ? 'Producto agregado al catálogo' : 'Producto actualizado');
      _modal = null;
      await loadCatalogoVendedor();
    } catch (err) {
      showToast(err.message || 'Error al guardar el producto', 'error');
      if (saveBtn) saveBtn.disabled = false;
    }
  });
}

// ─── Eventos del modal de eliminación ────────────────────────
function initDeleteEvents() {
  const cancel = () => { _confirmDelete = null; renderCatalogoVendedor(); };
  document.getElementById('cancel-del')?.addEventListener('click', cancel);
  document.getElementById('del-modal')?.addEventListener('click', e => { if (e.target.id==='del-modal') cancel(); });
  document.getElementById('confirm-del')?.addEventListener('click', async () => {
    const delBtn = document.getElementById('confirm-del');
    if (delBtn) delBtn.disabled = true;
    try {
      await Api.desactivarProducto(_confirmDelete);
      showToast('Producto eliminado');
      _confirmDelete = null; _modal = null;
      await loadCatalogoVendedor();
    } catch (err) {
      showToast(err.message || 'Error al eliminar el producto', 'error');
      _confirmDelete = null;
      renderCatalogoVendedor();
    }
  });
}

// ─── Modal gestión de tallas ─────────────────────────────────
function tallasManagerModal() {
  const rows = _tallas.map((t, i) => {
    if (_editingTallaId === t.id_talla) {
      return `
        <li class="talla-row talla-row-editing" data-tid="${t.id_talla}">
          <div class="talla-edit-form">
            <div style="display:flex;gap:8px;align-items:center;">
              <input class="talla-edit-input" id="talla-edit-nombre" type="text" value="${_editTallaNombre}" maxlength="20" placeholder="Nombre" />
              <label class="talla-check-label">
                <input type="checkbox" id="talla-edit-ninio" ${_editTallaEsNinio ? 'checked' : ''} />
                Niño/a
              </label>
            </div>
            <input class="talla-edit-input" id="talla-edit-desc" type="text" value="${_editTallaDesc}" maxlength="120" placeholder="Descripción (opcional)" style="margin-top:6px;" />
            <div style="display:flex;gap:6px;margin-top:8px;">
              <button class="btn btn-primary btn-xs" id="save-talla-edit">Guardar</button>
              <button class="btn btn-outline btn-xs" id="cancel-talla-edit">Cancelar</button>
            </div>
          </div>
        </li>`;
    }
    return `
      <li class="talla-row" data-tid="${t.id_talla}">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="talla-row-name">${t.nombre}</span>
            ${t.es_ninio ? `<span class="talla-badge-ninio">Niño/a</span>` : ''}
          </div>
          ${t.descripcion ? `<p class="talla-row-desc">${t.descripcion}</p>` : ''}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0;align-items:center;">
          <button class="action-btn talla-up-btn"   data-tid="${t.id_talla}" data-idx="${i}" title="Subir"  ${i === 0               ? 'disabled' : ''}>${Icons.ArrowUp(14)}</button>
          <button class="action-btn talla-down-btn" data-tid="${t.id_talla}" data-idx="${i}" title="Bajar"  ${i === _tallas.length-1 ? 'disabled' : ''}>${Icons.ArrowDown(14)}</button>
          <button class="action-btn talla-edit-btn"
            data-tid="${t.id_talla}"
            data-nombre="${t.nombre}"
            data-ninio="${t.es_ninio ? '1' : '0'}"
            data-desc="${(t.descripcion || '').replace(/"/g, '&quot;')}"
            title="Editar">${Icons.Pencil(14)}</button>
          <button class="action-btn talla-del-btn" data-tid="${t.id_talla}" title="Eliminar">${Icons.Trash2(14)}</button>
        </div>
      </li>`;
  }).join('');

  // z-index más alto para aparecer sobre el modal de producto si está abierto
  const zStyle = _modal ? 'z-index:1100;' : '';

  return `
    <div class="modal-overlay" id="tallas-modal" style="${zStyle}">
      <div class="modal-box" style="max-width:440px;">
        <div class="modal-header">
          <h3>Gestionar tallas</h3>
          <button class="modal-close" id="close-tallas-modal">${Icons.X(20)}</button>
        </div>
        <div class="modal-body">
          <p class="form-hint" style="margin-bottom:12px;">Nueva talla</p>
          <div class="talla-new-form">
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="text" id="new-talla-input" value="${_newTallaNombre}" placeholder="Ej. 42, XXL, Única..." maxlength="20" style="flex:1;" />
              <label class="talla-check-label">
                <input type="checkbox" id="new-talla-ninio" ${_newTallaEsNinio ? 'checked' : ''} />
                Niño/a
              </label>
            </div>
            <input type="text" id="new-talla-desc" value="${_newTallaDesc}" placeholder="Descripción (opcional)" maxlength="120" style="margin-top:8px;width:100%;box-sizing:border-box;" />
            <button class="btn btn-primary" id="add-talla-btn" style="margin-top:8px;width:100%;">${Icons.Plus(16)} Agregar talla</button>
          </div>
          <hr style="border:none;border-top:1px solid var(--border);margin:16px 0;" />
          ${_tallas.length === 0
            ? `<p style="text-align:center;color:var(--muted-fg);font-size:13px;padding:8px 0;">No hay tallas registradas aún.</p>`
            : `<ul class="talla-list">${rows}</ul>`
          }
        </div>
      </div>
    </div>`;
}

// ─── Eventos del modal de tallas ─────────────────────────────
function initTallasManagerEvents() {
  const closeTallas = () => {
    _tallasModal = false; _editingTallaId = null;
    _newTallaNombre = ''; _newTallaEsNinio = false; _newTallaDesc = '';
    _editTallaNombre = ''; _editTallaEsNinio = false; _editTallaDesc = '';
    renderCatalogoVendedor();
  };

  document.getElementById('close-tallas-modal')?.addEventListener('click', closeTallas);
  document.getElementById('tallas-modal')?.addEventListener('click', e => { if (e.target.id === 'tallas-modal') closeTallas(); });

  // Sincronizar estado del formulario de nueva talla al escribir
  document.getElementById('new-talla-input')?.addEventListener('input',  e => { _newTallaNombre  = e.target.value; });
  document.getElementById('new-talla-desc')?.addEventListener('input',   e => { _newTallaDesc    = e.target.value; });
  document.getElementById('new-talla-ninio')?.addEventListener('change', e => { _newTallaEsNinio = e.target.checked; });

  // Crear talla
  const doCreate = async () => {
    const nombre = document.getElementById('new-talla-input')?.value.trim() || '';
    if (!nombre) { showToast('Escribe un nombre para la talla', 'error'); return; }
    const btn = document.getElementById('add-talla-btn');
    if (btn) btn.disabled = true;
    try {
      const esNinio   = document.getElementById('new-talla-ninio')?.checked ?? false;
      const descripcion = document.getElementById('new-talla-desc')?.value.trim() || null;
      await Api.createTalla(nombre, esNinio, descripcion || null);
      _newTallaNombre = ''; _newTallaEsNinio = false; _newTallaDesc = '';
      _tallas = await Api.getTallas();
      showToast(`Talla "${nombre}" creada`);
      renderCatalogoVendedor();
    } catch (err) {
      showToast(err.message || 'Error al crear la talla', 'error');
      if (btn) btn.disabled = false;
    }
  };
  document.getElementById('add-talla-btn')?.addEventListener('click', doCreate);
  document.getElementById('new-talla-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') doCreate(); });

  // Botones reordenar por talla
  document.querySelectorAll('.talla-up-btn, .talla-down-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = +btn.dataset.idx;
      const id1 = +btn.dataset.tid;
      const isUp = btn.classList.contains('talla-up-btn');
      const swapIdx = isUp ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= _tallas.length) return;
      const id2 = _tallas[swapIdx].id_talla;
      btn.disabled = true;
      try {
        await Api.swapTallaOrden(id1, id2);
        _tallas = await Api.getTallas();
        renderCatalogoVendedor();
      } catch (err) {
        showToast(err.message || 'Error al reordenar', 'error');
        btn.disabled = false;
      }
    });
  });

  // Botones editar por talla
  document.querySelectorAll('.talla-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _editingTallaId  = +btn.dataset.tid;
      _editTallaNombre = btn.dataset.nombre;
      _editTallaEsNinio = btn.dataset.ninio === '1';
      _editTallaDesc   = btn.dataset.desc || '';
      renderCatalogoVendedor();
    });
  });

  // Botones eliminar por talla
  document.querySelectorAll('.talla-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const id = +btn.dataset.tid;
      try {
        const res = await Api.deleteTalla(id);
        showToast(`Talla "${res.talla?.nombre || ''}" eliminada`);
        _tallas = await Api.getTallas();
        renderCatalogoVendedor();
      } catch (err) {
        showToast(err.message || 'Error al eliminar la talla', 'error');
        btn.disabled = false;
      }
    });
  });

  // Sincronizar estado del formulario de edición inline
  document.getElementById('talla-edit-nombre')?.addEventListener('input',  e => { _editTallaNombre  = e.target.value; });
  document.getElementById('talla-edit-desc')?.addEventListener('input',    e => { _editTallaDesc    = e.target.value; });
  document.getElementById('talla-edit-ninio')?.addEventListener('change',  e => { _editTallaEsNinio = e.target.checked; });
  document.getElementById('talla-edit-nombre')?.addEventListener('keydown', e => {
    if (e.key === 'Enter')  document.getElementById('save-talla-edit')?.click();
    if (e.key === 'Escape') document.getElementById('cancel-talla-edit')?.click();
  });

  // Guardar edición
  document.getElementById('save-talla-edit')?.addEventListener('click', async () => {
    const nombre = document.getElementById('talla-edit-nombre')?.value.trim() || '';
    if (!nombre) { showToast('El nombre no puede estar vacío', 'error'); return; }
    const btn = document.getElementById('save-talla-edit');
    if (btn) btn.disabled = true;
    try {
      const esNinio    = document.getElementById('talla-edit-ninio')?.checked ?? false;
      const descripcion = document.getElementById('talla-edit-desc')?.value.trim() || null;
      await Api.updateTalla(_editingTallaId, nombre, esNinio, descripcion || null);
      showToast(`Talla actualizada`);
      _tallas = await Api.getTallas();
      _editingTallaId = null; _editTallaNombre = ''; _editTallaEsNinio = false; _editTallaDesc = '';
      renderCatalogoVendedor();
    } catch (err) {
      showToast(err.message || 'Error al actualizar la talla', 'error');
      if (btn) btn.disabled = false;
    }
  });

  // Cancelar edición
  document.getElementById('cancel-talla-edit')?.addEventListener('click', () => {
    _editingTallaId = null; _editTallaNombre = ''; _editTallaEsNinio = false; _editTallaDesc = '';
    renderCatalogoVendedor();
  });
}

// ─── Modal gestión de stock rápido (desde tarjeta) ───────────
async function openStockModal(id) {
  _stockModal = id;
  _stockModalData = [];
  renderCatalogoVendedor();
  try {
    const full = await Api.getProductoAdminById(id);
    _stockModalData = full.tallas.map(t => ({ id_talla: t.id_talla, nombre: t.talla, stock: t.stock ?? 0 }));
    renderCatalogoVendedor();
  } catch (e) {
    showToast('Error al cargar el stock', 'error');
    _stockModal = null;
    renderCatalogoVendedor();
  }
}

function stockManagerModal() {
  const p = _productos.find(x => x.id === _stockModal);
  const nombre = p?.nombre || '';

  const body = _stockModalData.length === 0
    ? `<p style="text-align:center;color:var(--muted-fg);font-size:13px;padding:16px 0;">Cargando…</p>`
    : `<div id="stock-edit-list">
        ${_stockModalData.map(t => `
          <div class="stock-row">
            <span class="stock-talla-name">${t.nombre}</span>
            <input type="number" class="stock-input-modal" data-talla-id="${t.id_talla}" value="${t.stock}" min="0" />
            <span class="stock-unit">uds.</span>
          </div>`).join('')}
       </div>`;

  return `
    <div class="modal-overlay" id="stock-modal">
      <div class="modal-box modal-small">
        <div class="modal-header">
          <h3>${Icons.Package(18)} Stock por talla</h3>
          <button class="modal-close" id="close-stock-modal">${Icons.X(20)}</button>
        </div>
        <div class="modal-body">
          <p style="color:var(--muted-fg);font-size:13px;margin-bottom:16px;">${nombre}</p>
          ${body}
          <div class="modal-footer" style="margin-top:16px;">
            <button class="btn btn-outline" style="flex:1;" id="cancel-stock-modal">Cancelar</button>
            <button class="btn btn-primary" style="flex:1;" id="save-stock-modal" ${_stockModalData.length === 0 ? 'disabled' : ''}>Guardar</button>
          </div>
        </div>
      </div>
    </div>`;
}

function initStockModalEvents() {
  const close = () => { _stockModal = null; _stockModalData = []; renderCatalogoVendedor(); };
  document.getElementById('close-stock-modal')?.addEventListener('click', close);
  document.getElementById('cancel-stock-modal')?.addEventListener('click', close);
  document.getElementById('stock-modal')?.addEventListener('click', e => { if (e.target.id === 'stock-modal') close(); });

  document.getElementById('save-stock-modal')?.addEventListener('click', async () => {
    const btn = document.getElementById('save-stock-modal');
    if (btn) btn.disabled = true;
    try {
      const inputs = document.querySelectorAll('.stock-input-modal');
      for (const input of inputs) {
        const id_talla = +input.dataset.tallaId;
        const stock    = Math.max(0, parseInt(input.value, 10) || 0);
        await Api.updateStockTalla(_stockModal, id_talla, stock);
      }
      showToast('Stock actualizado');
      _stockModal = null; _stockModalData = [];
      await loadCatalogoVendedor();
    } catch (err) {
      showToast(err.message || 'Error al actualizar el stock', 'error');
      if (btn) btn.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', loadCatalogoVendedor);
