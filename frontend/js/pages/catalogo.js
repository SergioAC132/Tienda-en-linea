// ===== CATALOG PAGE =====
let _catalogOrder = 'fecha';

function renderCatalogo() {
  if (!requireAuth(['CLIENTE'])) return;
  renderHeader();

  const root = document.getElementById('app-root');
  let productos = [...AppState.productos];

  if (_catalogOrder === 'precio_asc') productos.sort((a, b) => a.precio_base - b.precio_base);
  else if (_catalogOrder === 'precio_desc') productos.sort((a, b) => b.precio_base - a.precio_base);
  else productos.sort((a, b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion));

  if (productos.length === 0) {
    root.innerHTML = `
      <div class="empty-state">
        <h2>El catálogo está vacío</h2>
        <p>No hay productos disponibles en este momento</p>
      </div>`;
    return;
  }

  const cards = productos.map(p => `
    <article class="product-card" data-id="${p.id}">
      <div class="product-img-wrap">
        ${p.imagenes.length > 0
          ? `<img src="${p.imagenes[0].url}" alt="${p.nombre}" loading="lazy" />`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--muted-fg);font-size:12px;">Sin imagen</div>`
        }
        ${!p.disponible ? `<div class="product-unavailable-overlay"><span class="product-unavailable-label">No disponible</span></div>` : ''}
      </div>
      <h3 class="product-name">${p.nombre}</h3>
      <p class="product-price">$${formatCurrency(p.precio_base)} MXN</p>
    </article>
  `).join('');

  root.innerHTML = `
    <div>
      <div class="page-header">
        <h2 class="page-title">Nuestros Productos</h2>
        <div class="sort-control">
          ${Icons.ArrowUpDown(20)}
          <select id="sort-select">
            <option value="fecha"       ${_catalogOrder==='fecha'      ?'selected':''}>Más recientes</option>
            <option value="precio_asc"  ${_catalogOrder==='precio_asc' ?'selected':''}>Precio: menor a mayor</option>
            <option value="precio_desc" ${_catalogOrder==='precio_desc'?'selected':''}>Precio: mayor a menor</option>
          </select>
        </div>
      </div>
      <div class="product-grid">${cards}</div>
    </div>
  `;

  document.getElementById('sort-select')?.addEventListener('change', e => {
    _catalogOrder = e.target.value; renderCatalogo();
  });

  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => Nav.go(Nav.producto(card.dataset.id)));
  });
}

document.addEventListener('DOMContentLoaded', renderCatalogo);
