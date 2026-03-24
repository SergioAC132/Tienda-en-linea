// ===== PAYMENT PAGE =====
let _metodo = 'Transferencia';
let _comprobante = null;

function renderPago() {
  if (!requireAuth(['CLIENTE'])) return;
  renderHeader();

  const root = document.getElementById('app-root');
  const pedidoId = getParam('pedidoId');
  const pedido = AppState.pedidos.find(p => p.id === pedidoId);

  if (!pedido) {
    root.innerHTML = `
      <div class="empty-state" style="padding-top:48px;">
        <h2>Pedido no encontrado</h2>
        <a href="${Nav.pedidos}" class="btn btn-ghost">Ver mis pedidos</a>
      </div>`;
    return;
  }

  const itemsHtml = pedido.items.map(item => `
    <div class="summary-row" style="margin-bottom:10px;font-size:13px;">
      <span>${item.nombre} (Talla: ${item.talla}) x${item.cantidad}</span>
      <span>$${formatCurrency(item.subtotal)}</span>
    </div>
  `).join('');

  const metodoBtns = [
    { id:'Efectivo',     icon: Icons.Banknote(24),  title:'Efectivo',               desc:'Pago contra entrega' },
    { id:'Transferencia',icon: Icons.CreditCard(24), title:'Transferencia Bancaria', desc:'Depósito o transferencia electrónica' },
    { id:'Link de pago', icon: Icons.Link2(24),      title:'Link de Pago',           desc:'Pago en línea seguro' },
  ].map(m => `
    <button class="payment-method-btn ${_metodo===m.id?'active':''}" data-metodo="${m.id}">
      ${m.icon}
      <div>
        <span class="payment-method-title">${m.title}</span>
        <span class="payment-method-desc">${m.desc}</span>
      </div>
    </button>
  `).join('');

  let extra = '';
  if (_metodo === 'Transferencia') {
    const fileSection = _comprobante
      ? `<div class="file-preview">
          ${Icons.FileCheck(20)}
          <div style="flex:1;min-width:0;">
            <p style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_comprobante.name}</p>
            <p style="font-size:11px;color:var(--muted-fg);">${(_comprobante.size/1024).toFixed(0)} KB</p>
          </div>
          <button style="font-size:12px;color:var(--muted-fg);" id="change-file">Cambiar</button>
         </div>`
      : `<button class="upload-area" id="upload-trigger">
          ${Icons.Upload(32)}
          <p style="font-size:13px;">Haz clic para subir tu comprobante</p>
          <p style="font-size:11px;">PNG, JPG o PDF · Máx. 10 MB</p>
         </button>`;
    extra = `
      <div class="bank-info" style="margin-bottom:20px;">
        <h4 style="font-weight:500;margin-bottom:10px;">Datos Bancarios</h4>
        <p><span>Banco:</span> Banco Nacional</p>
        <p><span>Cuenta:</span> 1234567890</p>
        <p><span>CLABE:</span> 012345678901234567</p>
        <p><span>Titular:</span> Tintin Luxury S.A. de C.V.</p>
        <p><span>Concepto:</span> 156987975521335455</p>
        <p><span>Referencia:</span> 1568789</p>
        <div style="margin-top:16px;">
          <label class="form-label" style="font-size:13px;">Comprobante de pago <span style="color:var(--primary);">*</span></label>
          <input type="file" id="file-input" accept="image/*,.pdf" style="display:none;" />
          ${fileSection}
        </div>
      </div>`;
  } else if (_metodo === 'Link de pago') {
    extra = `
      <div style="background:rgba(42,42,42,.5);border-radius:8px;padding:14px;margin-bottom:20px;">
        <p style="font-size:13px;margin-bottom:8px;">Serás redirigido a nuestra pasarela de pago segura</p>
        <span style="color:var(--primary);font-size:13px;">https://pagos.tintinluxury.com/checkout/${pedido.id}</span>
      </div>`;
  }

  root.innerHTML = `
    <div class="payment-layout">
      <div class="payment-inner">
        <div class="payment-header">
          ${Icons.CheckCircle2(32)}
          <div>
            <h2>Pedido Confirmado</h2>
            <p style="color:var(--muted-fg);">#${pedido.id}</p>
          </div>
        </div>

        <!-- Resumen -->
        <div class="card card-body" style="margin-bottom:24px;">
          <h3 style="font-family:var(--font-serif);font-size:20px;margin-bottom:16px;">Resumen del Pedido</h3>
          ${itemsHtml}
          <hr class="divider" style="margin:16px 0;" />
          <div class="summary-total-row">
            <span style="font-family:var(--font-serif);">Total</span>
            <span class="total-amount">$${formatCurrency(pedido.total)} MXN</span>
          </div>
          <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--border);">
            <p style="font-size:12px;color:var(--muted-fg);margin-bottom:6px;">Dirección de entrega:</p>
            <p>${pedido.direccion.nombre_completo}</p>
            <p style="font-size:12px;color:var(--muted-fg);">${pedido.direccion.calle}, ${pedido.direccion.ciudad}, ${pedido.direccion.estado} ${pedido.direccion.codigo_postal}</p>
          </div>
        </div>

        <!-- Pago -->
        <div class="card card-body">
          <h3 style="font-family:var(--font-serif);font-size:20px;margin-bottom:20px;">Registrar Pago</h3>
          <div>${metodoBtns}</div>
          ${extra}
          <button class="btn btn-primary btn-full btn-lg" id="register-payment">Registrar Pago</button>
          <p style="font-size:12px;text-align:center;color:var(--muted-fg);margin-top:14px;">
            Tu pedido será procesado una vez confirmemos el pago
          </p>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('.payment-method-btn').forEach(btn => {
    btn.addEventListener('click', () => { _metodo = btn.dataset.metodo; renderPago(); });
  });

  document.getElementById('upload-trigger')?.addEventListener('click', () => document.getElementById('file-input')?.click());
  document.getElementById('change-file')?.addEventListener('click', () => { _comprobante = null; document.getElementById('file-input')?.click(); renderPago(); });
  document.getElementById('file-input')?.addEventListener('change', e => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10*1024*1024) { showToast('El archivo no debe superar 10 MB', 'error'); return; }
    _comprobante = f; renderPago();
  });

  document.getElementById('register-payment')?.addEventListener('click', () => {
    if (_metodo === 'Transferencia' && !_comprobante) { showToast('Por favor sube el comprobante de pago', 'error'); return; }
    const url = _comprobante ? URL.createObjectURL(_comprobante) : undefined;
    AppState.registrarPago(pedido.id, _metodo, url);
    showToast('Pago registrado exitosamente');
    _metodo = 'Transferencia'; _comprobante = null;
    Nav.go(Nav.pedidos);
  });
}

document.addEventListener('DOMContentLoaded', renderPago);
