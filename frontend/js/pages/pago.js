// ===== PAYMENT PAGE =====

// Estado del módulo — se limpia en cada nueva visita por ser full-page reload
let _selectedMetodoId = null;
let _comprobante      = null;
let _pedido           = null;   // datos del pedido cargados desde la API
let _metodos          = [];     // métodos de pago disponibles desde la API
let _pago             = null;   // pago creado en BD (paso 1 de transferencia)

// Metadatos de visualización para cada nombre de método de la BD
const METODO_INFO = {
  efectivo:      { icon: () => Icons.Banknote(24),    titulo: 'Efectivo',               desc: 'Pago contra entrega' },
  transferencia: { icon: () => Icons.CreditCard(24),  titulo: 'Transferencia Bancaria', desc: 'Depósito o transferencia electrónica' },
  link_pago:     { icon: () => Icons.CreditCard(24),  titulo: 'Link de Pago',           desc: 'Paga en línea con tarjeta o monedero' },
};


/**
 * Punto de entrada de la página.
 * Lee el pedidoId de la URL, carga pedido y métodos de pago desde la API
 * y delega el renderizado a renderFormulario().
 */
function renderPago() {
  if (!requireAuth(['CLIENTE'])) return;
  renderHeader();

  const root     = document.getElementById('app-root');
  const pedidoId = getParam('pedidoId');

  if (!pedidoId) {
    mostrarError(root, 'No se especificó ningún pedido.');
    return;
  }

  // Si el pedido ya está en caché (cambio de método sin navegar), solo re-renderiza
  if (_pedido && String(_pedido.id_pedido) === String(pedidoId)) {
    renderFormulario(root);
    return;
  }

  root.innerHTML = `
    <div class="empty-state orders-layout">
      ${Icons.Package(32)}
      <p>Cargando pedido...</p>
    </div>`;

  Promise.all([
    Api.getPedidoById(pedidoId),
    Api.getMetodosPago(),
  ])
    .then(([pedido, metodos]) => {
      if (pedido.estado !== 'pendiente' && pedido.estado !== 'esperando_pago') {
        mostrarError(root, 'Este pedido ya no está disponible para registrar pago.');
        return;
      }

      _pedido  = pedido;
      _metodos = metodos;

      if (pedido.estado === 'esperando_pago') {
        return Api.getPagoByPedido(pedidoId)
          .then(pago => {
            if (pago?.metodo_pago === 'link_pago' && pago?.url_pago) {
              limpiarEstado();
              window.location.href = pago.url_pago;
            } else if (pago?.metodo_pago === 'transferencia') {
              _pago             = pago;
              _selectedMetodoId = Number(pago.id_metodo_pago);
              renderFormulario(root);
            } else {
              renderEstadoPago(root, pago);
            }
          })
          .catch(() => renderEstadoPago(root, null));
      }

      if (!_selectedMetodoId && _metodos.length > 0) {
        const tipoEntrega = pedido.tipo_entrega || 'envio';
        const visibles = _metodos.filter(m => tipoEntrega === 'punto_entrega' || m.nombre !== 'efectivo');
        _selectedMetodoId = Number((visibles[0] || _metodos[0]).id_metodo_pago);
      }

      renderFormulario(root);
    })
    .catch(() => {
      mostrarError(root, 'No se pudo cargar el pedido.');
    });
}


function mostrarError(root, msg) {
  root.innerHTML = `
    <div class="empty-state" style="padding-top:48px;">
      <h2>${msg}</h2>
      <button class="btn btn-ghost" onclick="Nav.go(Nav.pedidos)">Ver mis pedidos</button>
    </div>`;
}


/**
 * Renderiza el formulario de pago usando los datos ya cargados en _pedido y _metodos.
 * Se llama también al cambiar el método de pago o al avanzar de paso (sin re-fetchar datos).
 */
function renderFormulario(root) {
  const pedido = _pedido;

  // ── Items (detalle_pedidos) ──────────────────────────────────
  const detalle   = pedido.detalle_pedidos || [];
  const itemsHtml = detalle.length
    ? detalle.map(item => `
        <div class="summary-row" style="margin-bottom:10px;font-size:13px;">
          <span>${item.nombre_producto} — Talla: ${item.nombre_talla} × ${item.cantidad}</span>
          <span>$${formatCurrency(item.total)}</span>
        </div>`).join('')
    : `<p style="font-size:13px;color:var(--muted-fg);">Sin detalle de productos disponible</p>`;

  // ── Entrega: dirección o punto ───────────────────────────────
  const tipoEntrega = pedido.tipo_entrega || 'envio';
  const dir         = pedido.direccion;
  const punto       = pedido.punto_entrega;
  let entregaLabel, entregaHtml;

  if (tipoEntrega === 'punto_entrega' && punto?.nombre) {
    entregaLabel = 'Punto de entrega';
    entregaHtml  = `
      <p style="font-size:13px;font-weight:500;">${punto.nombre}</p>
      ${punto.descripcion ? `<p style="font-size:12px;color:var(--muted-fg);margin-top:2px;">${punto.descripcion}</p>` : ''}`;
  } else if (dir && dir.calle) {
    const numero   = dir.numero_exterior ? ` #${dir.numero_exterior}` : '';
    const interior = dir.numero_interior ? ` Int. ${dir.numero_interior}` : '';
    const linea1   = `${dir.calle}${numero}${interior}`;
    const linea2   = [
      dir.colonia,
      `${dir.ciudad}, ${dir.estado}`,
      dir.codigo_postal ? `CP ${dir.codigo_postal}` : '',
    ].filter(Boolean).join(' · ');
    entregaLabel = 'Dirección de entrega';
    entregaHtml  = `
      <p style="font-size:13px;">${linea1}</p>
      <p style="font-size:12px;color:var(--muted-fg);margin-top:2px;">${linea2}</p>`;
  } else {
    entregaLabel = 'Entrega';
    entregaHtml  = `<p style="font-size:13px;color:var(--muted-fg);">Información no disponible</p>`;
  }

  // ── Botones de selección de método ──────────────────────────
  // efectivo solo disponible para pedidos con tipo_entrega = punto_entrega
  const metodosBloqueados = !!_pago;
  const metodosVisibles   = _metodos.filter(m => tipoEntrega === 'punto_entrega' || m.nombre !== 'efectivo');

  // Si el método seleccionado ya no es visible, resetear al primero visible
  if (metodosVisibles.length > 0 && !metodosVisibles.find(m => Number(m.id_metodo_pago) === _selectedMetodoId)) {
    _selectedMetodoId = Number(metodosVisibles[0].id_metodo_pago);
  }

  const metodoBtns = metodosVisibles.map(m => {
    const info   = METODO_INFO[m.nombre] || { icon: () => Icons.CreditCard(24), titulo: m.nombre, desc: '' };
    const activo = _selectedMetodoId === Number(m.id_metodo_pago);
    return `
      <button class="payment-method-btn ${activo ? 'active' : ''}"
              data-metodo-id="${m.id_metodo_pago}"
              ${metodosBloqueados ? 'disabled style="opacity:.5;cursor:not-allowed;"' : ''}>
        ${info.icon()}
        <div>
          <span class="payment-method-title">${info.titulo}</span>
          <span class="payment-method-desc">${info.desc}</span>
        </div>
      </button>`;
  }).join('');

  // ── Sección extra según método y paso actual ─────────────────
  const metodoSel = metodosVisibles.find(m => Number(m.id_metodo_pago) === _selectedMetodoId);
  let extraHtml   = '';
  let btnLabel    = 'Confirmar pago';

  if (metodoSel?.nombre === 'transferencia') {
    if (!_pago) {
      // Paso 1 — mostrar datos bancarios e invitar a obtener referencia
      btnLabel  = 'Obtener referencia de pago';
      extraHtml = `
        <div class="bank-info" style="margin-bottom:20px;">
          <h4 style="font-weight:500;margin-bottom:10px;">Datos Bancarios</h4>
          <p><span>Banco:</span> Banorte</p>
          <p><span>Cuenta:</span> 828490045</p>
          <p><span>CLABE:</span> 08284900451234567</p>
          <p><span>Titular:</span>Jesús Robles Martínez</p>
          <p style="margin-top:8px;font-size:12px;color:var(--muted-fg);">
            Al continuar se generará tu número de referencia único para la transferencia.
          </p>
        </div>`;
    } else {
      // Paso 2 — referencia visible + subir comprobante
      const fileSection = _comprobante
        ? `<div class="file-preview">
             ${Icons.FileCheck(20)}
             <div style="flex:1;min-width:0;">
               <p style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_comprobante.name}</p>
               <p style="font-size:11px;color:var(--muted-fg);">${(_comprobante.size / 1024).toFixed(0)} KB</p>
             </div>
             <button style="font-size:12px;color:var(--muted-fg);" id="change-file">Cambiar</button>
           </div>`
        : `<button class="upload-area" id="upload-trigger">
             ${Icons.Upload(32)}
             <p style="font-size:13px;">Haz clic para subir tu comprobante</p>
             <p style="font-size:11px;">PNG, JPG o PDF · Máx. 5 MB</p>
           </button>`;

      extraHtml = `
        <div class="bank-info" style="margin-bottom:20px;">
          <h4 style="font-weight:500;margin-bottom:10px;">Datos Bancarios</h4>
          <p><span>Banco:</span> Banorte</p>
          <p><span>Cuenta:</span> 828490045</p>
          <p><span>CLABE:</span> 0828490045123456</p>
          <p><span>Titular:</span> Jesús Robles Martínez</p>
          <div style="margin-top:12px;padding:14px 16px;background:color-mix(in srgb,var(--primary) 8%,transparent);border-radius:8px;border:1px solid var(--border);">
            <p style="font-size:12px;color:var(--muted-fg);margin-bottom:4px;">Tu referencia de transferencia</p>
            <p style="font-size:26px;font-weight:700;color:var(--primary);letter-spacing:4px;margin:0;">${_pago.referencia}</p>
            <p style="font-size:11px;color:var(--muted-fg);margin-top:4px;">
              Usa este número como concepto al realizar tu transferencia.
            </p>
          </div>
          <div style="margin-top:16px;">
            <label class="form-label" style="font-size:13px;">
              Comprobante de pago <span style="color:var(--primary);">*</span>
            </label>
            <input type="file" id="file-input" accept="image/*,.pdf" style="display:none;" />
            ${fileSection}
          </div>
        </div>`;
    }
  }

  // ── HTML completo ────────────────────────────────────────────
  root.innerHTML = `
    <div class="payment-layout">
      <div class="payment-inner">
        <div class="payment-header">
          ${Icons.CheckCircle2(32)}
          <div>
            <h2>Pedido Confirmado</h2>
            <p style="color:var(--muted-fg);">#${pedido.id_pedido}</p>
          </div>
        </div>

        <!-- Resumen del pedido -->
        <div class="card card-body" style="margin-bottom:24px;">
          <h3 style="font-family:var(--font-serif);font-size:20px;margin-bottom:16px;">Resumen del Pedido</h3>
          ${itemsHtml}
          <hr class="divider" style="margin:16px 0;" />
          <div class="summary-total-row">
            <span style="font-family:var(--font-serif);">Total</span>
            <span class="total-amount">$${formatCurrency(pedido.total)} MXN</span>
          </div>
          <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--border);">
            <p style="font-size:12px;color:var(--muted-fg);margin-bottom:6px;">${entregaLabel}</p>
            ${entregaHtml}
          </div>
        </div>

        <!-- Selección de método y confirmación -->
        <div class="card card-body">
          <h3 style="font-family:var(--font-serif);font-size:20px;margin-bottom:20px;">Registrar Pago</h3>
          <div>${metodoBtns}</div>
          ${extraHtml}
          <button class="btn btn-primary btn-full btn-lg" id="register-payment">${btnLabel}</button>
          <p style="font-size:12px;text-align:center;color:var(--muted-fg);margin-top:14px;">
            Tu pedido será procesado una vez confirmemos el pago
          </p>
        </div>
      </div>
    </div>`;

  // ── Event listeners ──────────────────────────────────────────
  document.querySelectorAll('.payment-method-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (_pago) return;
      _selectedMetodoId = Number(btn.dataset.metodoId);
      renderFormulario(root);
    });
  });

  document.getElementById('upload-trigger')?.addEventListener('click', () => {
    document.getElementById('file-input')?.click();
  });
  document.getElementById('change-file')?.addEventListener('click', () => {
    _comprobante = null;
    document.getElementById('file-input')?.click();
    renderFormulario(root);
  });
  document.getElementById('file-input')?.addEventListener('change', e => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { showToast('El archivo no debe superar 5 MB', 'error'); return; }
    _comprobante = f;
    renderFormulario(root);
  });

  document.getElementById('register-payment')?.addEventListener('click', () => {
    manejarRegistroPago(root);
  });
}


/**
 * Flujo de dos pasos para transferencia:
 *   Paso 1 (_pago === null): crea el registro en BD → guarda referencia → re-renderiza
 *   Paso 2 (_pago !== null): sube el comprobante → redirige a pedidos
 * Para efectivo: un solo paso (registrar y redirigir).
 */
async function manejarRegistroPago(root) {
  const metodoSel = _metodos.find(m => Number(m.id_metodo_pago) === _selectedMetodoId);
  const btn       = document.getElementById('register-payment');

  // ── Paso 2 transferencia: subir comprobante ──────────────────
  if (metodoSel?.nombre === 'transferencia' && _pago) {
    if (!_comprobante) {
      showToast('Por favor sube el comprobante de pago', 'error');
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = 'Subiendo comprobante...'; }
    try {
      await Api.subirComprobante(_pago.id_pago, _comprobante);
      showToast('Comprobante enviado. Tu pedido está en revisión.');
      limpiarEstado();
      setTimeout(() => Nav.go(Nav.pedidos), 800);
    } catch (err) {
      showToast(err.message || 'Error al subir el comprobante. Intenta de nuevo.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar pago'; }
    }
    return;
  }

  // ── Paso 1: crear pago (efectivo o primer paso de transferencia) ──
  if (btn) { btn.disabled = true; btn.textContent = 'Procesando...'; }
  try {
    const pago = await Api.registrarPago(_pedido.id_pedido, _selectedMetodoId);

    if (metodoSel?.nombre === 'link_pago' && pago.url_pago) {
      // Redirigir al cliente al link de pago generado por Clip
      limpiarEstado();
      window.location.href = pago.url_pago;
    } else if (metodoSel?.nombre === 'transferencia') {
      // Guardar el pago creado y re-renderizar para mostrar la referencia
      _pago = pago;
      renderFormulario(root);
    } else if (metodoSel?.nombre === 'efectivo' && _pedido.tipo_entrega === 'punto_entrega') {
      limpiarEstado();
      mostrarConfirmacionPuntoEntrega(root);
    } else {
      showToast('Pago registrado exitosamente');
      limpiarEstado();
      setTimeout(() => Nav.go(Nav.pedidos), 800);
    }
  } catch (err) {
    showToast(err.message || 'Error al registrar el pago. Intenta de nuevo.', 'error');
    if (btn) {
      btn.disabled    = false;
      btn.textContent = metodoSel?.nombre === 'transferencia' ? 'Obtener referencia de pago' : 'Confirmar pago';
    }
  }
}


/**
 * Muestra el estado del pago existente para un pedido en 'esperando_pago'.
 * Si el pago fue rechazado, indica que puede contactar al vendedor.
 */
function renderEstadoPago(root, pago) {
  const pedido       = _pedido;
  const nombreMetodo = METODO_INFO[pago?.metodo_pago]?.titulo || pago?.metodo_pago || '—';
  const referencia   = pago?.referencia;
  const rechazado    = pago?.estado_pago === 'rechazado';

  const mensajeHtml = rechazado
    ? `<div style="padding:14px 16px;background:color-mix(in srgb,var(--destructive) 8%,transparent);
                   border-radius:8px;border:1px solid color-mix(in srgb,var(--destructive) 30%,transparent);
                   margin-bottom:20px;">
         <p style="font-size:14px;font-weight:500;color:var(--destructive);margin-bottom:4px;">Pago rechazado</p>
         <p style="font-size:13px;color:var(--muted-fg);">
           Tu pago fue rechazado. Contacta al vendedor para más información o para reintentar.
         </p>
       </div>`
    : `<div style="padding:14px 16px;background:color-mix(in srgb,var(--primary) 8%,transparent);
                   border-radius:8px;border:1px solid var(--border);margin-bottom:20px;">
         <p style="font-size:14px;font-weight:500;margin-bottom:4px;">Pago en revisión</p>
         <p style="font-size:13px;color:var(--muted-fg);">
           Tu pago está siendo revisado. Te notificaremos cuando sea confirmado.
         </p>
       </div>`;

  root.innerHTML = `
    <div class="payment-layout">
      <div class="payment-inner">
        <div class="payment-header">
          ${Icons.CheckCircle2(32)}
          <div>
            <h2>Pedido Confirmado</h2>
            <p style="color:var(--muted-fg);">#${pedido.id_pedido}</p>
          </div>
        </div>
        <div class="card card-body">
          <h3 style="font-family:var(--font-serif);font-size:20px;margin-bottom:20px;">Estado del Pago</h3>
          ${mensajeHtml}
          <div style="display:flex;flex-direction:column;gap:8px;font-size:13px;">
            <div class="summary-row">
              <span style="color:var(--muted-fg);">Método</span>
              <span>${nombreMetodo}</span>
            </div>
            <div class="summary-row">
              <span style="color:var(--muted-fg);">Total</span>
              <span class="total-amount">$${formatCurrency(pedido.total)} MXN</span>
            </div>
            ${referencia ? `
            <div class="summary-row">
              <span style="color:var(--muted-fg);">Referencia</span>
              <span style="font-weight:600;letter-spacing:2px;">${referencia}</span>
            </div>` : ''}
          </div>
          <button class="btn btn-ghost" style="margin-top:24px;" onclick="Nav.go(Nav.pedidos)">
            Ver mis pedidos
          </button>
        </div>
      </div>
    </div>`;
}


function mostrarConfirmacionPuntoEntrega(root) {
  root.innerHTML = `
    <div class="payment-layout">
      <div class="payment-inner">
        <div class="payment-header">
          ${Icons.CheckCircle2(32)}
          <div>
            <h2>¡Pedido Confirmado!</h2>
          </div>
        </div>
        <div class="card card-body" style="text-align:center;padding:32px 24px;">
          <p style="font-size:15px;line-height:1.6;margin-bottom:8px;">
            Pronto nos pondremos en contacto contigo para confirmar la fecha y hora de entrega del pedido.
          </p>
          <button class="btn btn-ghost" style="margin-top:24px;" onclick="Nav.go(Nav.pedidos)">
            Ver mis pedidos
          </button>
        </div>
      </div>
    </div>`;
}


function limpiarEstado() {
  _pedido           = null;
  _metodos          = [];
  _selectedMetodoId = null;
  _comprobante      = null;
  _pago             = null;
}


document.addEventListener('DOMContentLoaded', renderPago);
