// ===== VENDOR CATALOG PAGE =====
const TALLAS_PRESET = ['XS','S','M','L','XL','Única','35','36','37','38','39','40'];

let _modal = null;        // null | { mode:'new'|'edit', productoId:string|null }
let _form  = { nombre:'', descripcion:'', precio_base:'', tallas:'', disponible:true };
let _imgs  = [];          // [{ url, file? }]
let _tallasSelected = [];
let _confirmDelete = null;

function renderCatalogoVendedor() {
  if (!requireAuth(['VENDEDOR','ADMIN'])) return;
  renderHeader();

  const root = document.getElementById('app-root');
  const productos = AppState.productos;

  const grid = productos.length === 0
    ? `<div class="empty-state" style="min-height:40vh;">
        ${Icons.ImagePlus(48)}
        <p style="color:var(--muted-fg);">No hay productos. ¡Agrega el primero!</p>
        <button class="btn btn-ghost" id="add-first">+ Agregar producto</button>
       </div>`
    : `<div class="vendor-grid">${productos.map(vendorCard).join('')}</div>`;

  root.innerHTML = `
    <div class="vendor-catalog-layout">
      <div class="vendor-header">
        <div>
          <h2 class="page-title">Catálogo de Productos</h2>
          <p class="vendor-header-sub">
            ${productos.length} producto${productos.length!==1?'s':''} · ${productos.filter(p=>p.disponible).length} publicados
          </p>
        </div>
        <button class="btn btn-primary" id="add-btn">${Icons.Plus(16)} Agregar producto</button>
      </div>
      ${grid}
    </div>
    ${_modal ? productModal() : ''}
    ${_confirmDelete ? deleteModal() : ''}
  `;

  document.getElementById('add-btn')?.addEventListener('click', openNew);
  document.getElementById('add-first')?.addEventListener('click', openNew);

  root.querySelectorAll('[data-action]').forEach(el => {
    const { action, pid } = el.dataset;
    if (action === 'edit')   el.addEventListener('click', () => openEdit(pid));
    if (action === 'delete') el.addEventListener('click', () => { _confirmDelete = pid; renderCatalogoVendedor(); });
    if (action === 'toggle') el.addEventListener('click', () => {
      const p = AppState.getProducto(pid);
      if (!p) return;
      AppState.editarProducto(pid, { disponible: !p.disponible });
      showToast(p.disponible ? 'Producto ocultado' : 'Producto publicado');
      renderCatalogoVendedor();
    });
  });

  if (_modal)         initModalEvents();
  if (_confirmDelete) initDeleteEvents();
}

function vendorCard(p) {
  const img = [...p.imagenes].sort((a,b)=>a.orden-b.orden)[0];
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
          <button class="action-btn" data-action="edit" data-pid="${p.id}" title="Editar">${Icons.Pencil(16)}</button>
          <button class="action-btn" data-action="delete" data-pid="${p.id}" title="Eliminar">${Icons.Trash2(16)}</button>
        </div>
      </div>
    </div>`;
}

function openNew() {
  _modal = { mode:'new', productoId:null };
  _form = { nombre:'', descripcion:'', precio_base:'', tallas:'', disponible:true };
  _imgs = []; _tallasSelected = [];
  renderCatalogoVendedor();
}

function openEdit(id) {
  const p = AppState.getProducto(id);
  if (!p) return;
  _modal = { mode:'edit', productoId:id };
  _form = { nombre:p.nombre, descripcion:p.descripcion, precio_base:String(p.precio_base), tallas:'', disponible:p.disponible };
  _imgs = [...p.imagenes].sort((a,b)=>a.orden-b.orden).map(i=>({ url:i.url }));
  _tallasSelected = p.tallas.filter(t=>t.disponible).map(t=>t.talla);
  renderCatalogoVendedor();
}

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
            <button class="image-order-btn" data-move="up"   data-idx="${i}" ${i===0                ?'disabled':''} >${Icons.ArrowUp(14)}</button>
            <button class="image-order-btn" data-move="down" data-idx="${i}" ${i===_imgs.length-1  ?'disabled':''} >${Icons.ArrowDown(14)}</button>
          </div>
          <button class="image-remove-btn" data-ridx="${i}">${Icons.X(16)}</button>
        </div>`).join('')}</div>`
    : '';

  const tallasHtml = TALLAS_PRESET.map(t => `
    <button class="size-toggle ${_tallasSelected.includes(t)?'selected':''}" data-talla="${t}">${t}</button>`).join('');

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
            <label class="form-label">Tallas disponibles <span style="color:var(--primary);">*</span></label>
            <div class="size-selector" id="tallas-sel">${tallasHtml}</div>
            <input type="text" id="f-tallas-extra" value="${_form.tallas}" placeholder="Otras tallas separadas por coma: 41, 42..." />
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

function initModalEvents() {
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
    renderCatalogoVendedor();
  });

  document.querySelectorAll('[data-move]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.idx, dir = btn.dataset.move;
      const t = dir==='up' ? i-1 : i+1;
      if (t<0 || t>=_imgs.length) return;
      [_imgs[i],_imgs[t]] = [_imgs[t],_imgs[i]];
      renderCatalogoVendedor();
    });
  });

  document.querySelectorAll('[data-ridx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.ridx;
      if (_imgs[i].file) URL.revokeObjectURL(_imgs[i].url);
      _imgs.splice(i, 1);
      renderCatalogoVendedor();
    });
  });

  document.querySelectorAll('#tallas-sel .size-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.talla;
      _tallasSelected = _tallasSelected.includes(t) ? _tallasSelected.filter(x=>x!==t) : [..._tallasSelected, t];
      renderCatalogoVendedor();
    });
  });

  document.getElementById('toggle-disp')?.addEventListener('click', () => {
    _form.disponible = !_form.disponible; renderCatalogoVendedor();
  });

  document.getElementById('save-prod')?.addEventListener('click', () => {
    const nombre     = document.getElementById('f-nombre')?.value.trim() || '';
    const descripcion= document.getElementById('f-desc')?.value.trim() || '';
    const precioStr  = document.getElementById('f-precio')?.value || '';
    const extra      = document.getElementById('f-tallas-extra')?.value || '';

    if (!nombre) { showToast('El nombre es requerido','error'); return; }
    if (!precioStr || isNaN(+precioStr) || +precioStr<=0) { showToast('Ingresa un precio válido','error'); return; }
    if (_tallasSelected.length===0) { showToast('Selecciona al menos una talla','error'); return; }

    const tallas = [
      ...TALLAS_PRESET.filter(t=>_tallasSelected.includes(t)).map(t=>({ talla:t,disponible:true })),
      ...extra.split(',').map(s=>s.trim()).filter(s=>s&&!TALLAS_PRESET.includes(s)).map(t=>({ talla:t,disponible:true }))
    ];

    const data = {
      nombre, descripcion,
      precio_base: +precioStr,
      imagenes: _imgs.map((img,i)=>({ url:img.url, orden:i+1 })),
      tallas,
      disponible: _form.disponible
    };

    if (_modal.mode==='edit') { AppState.editarProducto(_modal.productoId, data); showToast('Producto actualizado'); }
    else                      { AppState.agregarProducto(data); showToast('Producto agregado al catálogo'); }

    _modal = null; renderCatalogoVendedor();
  });
}

function initDeleteEvents() {
  const cancel = () => { _confirmDelete = null; renderCatalogoVendedor(); };
  document.getElementById('cancel-del')?.addEventListener('click', cancel);
  document.getElementById('del-modal')?.addEventListener('click', e => { if (e.target.id==='del-modal') cancel(); });
  document.getElementById('confirm-del')?.addEventListener('click', () => {
    AppState.eliminarProducto(_confirmDelete);
    showToast('Producto eliminado');
    _confirmDelete = null; _modal = null;
    renderCatalogoVendedor();
  });
}

document.addEventListener('DOMContentLoaded', renderCatalogoVendedor);
