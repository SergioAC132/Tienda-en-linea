// ===== MODAL COMPARTIDO DE DIRECCIÓN =====
const ESTADOS_MEXICO = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
  'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero',
  'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla',
  'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas',
  'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
];

function normalizarDireccion(d) {
  return {
    id:              d.id_direccion,
    usuario_id:      d.id_usuario,
    calle:           d.calle,
    numero_exterior: d.numero_exterior,
    numero_interior: d.numero_interior || '',
    colonia:         d.colonia,
    ciudad:          d.ciudad,
    estado:          d.estado,
    codigo_postal:   d.codigo_postal,
    pais:            d.pais,
    referencias:     d.referencias || '',
    es_principal:    d.es_principal
  };
}

let _dirModalEditing  = null;
let _dirModalCallback = null;

function abrirModalDireccion(dir, onGuardado) {
  _dirModalEditing  = dir;
  _dirModalCallback = onGuardado;

  const esEdicion   = dir !== null;
  const estadosOpts = ESTADOS_MEXICO.map(e =>
    `<option value="${e}" ${dir?.estado === e ? 'selected' : ''}>${e}</option>`
  ).join('');

  const noPrincipalExiste = !AppState.direcciones.some(d => d.es_principal);
  const checkPrincipal    = dir?.es_principal || (!esEdicion && noPrincipalExiste);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'dir-modal';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h3>${esEdicion ? 'Editar dirección' : 'Nueva dirección'}</h3>
        <button class="modal-close" id="dir-modal-close">${Icons.X(20)}</button>
      </div>
      <div class="modal-body">
        <div id="dir-form-error" class="form-error" style="display:none;"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">

          <div class="form-group" style="grid-column:1/-1;margin-bottom:0;">
            <label class="form-label">Calle *</label>
            <input type="text" id="dir-calle" placeholder="Av. Insurgentes Sur" value="${dir?.calle || ''}" />
          </div>

          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Número exterior *</label>
            <input type="text" id="dir-num-ext" placeholder="123" value="${dir?.numero_exterior || ''}" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Número interior</label>
            <input type="text" id="dir-num-int" placeholder="4A (opcional)" value="${dir?.numero_interior || ''}" />
          </div>

          <div class="form-group" style="grid-column:1/-1;margin-bottom:0;">
            <label class="form-label">Colonia *</label>
            <input type="text" id="dir-colonia" placeholder="Col. Nápoles" value="${dir?.colonia || ''}" />
          </div>

          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Ciudad *</label>
            <input type="text" id="dir-ciudad" placeholder="Ciudad de México" value="${dir?.ciudad || ''}" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Estado *</label>
            <select id="dir-estado">
              <option value="">Selecciona un estado</option>
              ${estadosOpts}
            </select>
          </div>

          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Código postal *</label>
            <input type="text" id="dir-cp" placeholder="06600" maxlength="5" value="${dir?.codigo_postal || ''}" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">País</label>
            <div class="input-wrapper">
              <input type="text" id="dir-pais" value="México" readonly />
              <span class="input-tag">MX</span>
            </div>
          </div>

          <div class="form-group" style="grid-column:1/-1;margin-bottom:0;">
            <label class="form-label">Referencias</label>
            <input type="text" id="dir-referencias"
              placeholder="Entre calles, color de la fachada..."
              value="${dir?.referencias || ''}" />
          </div>

          <div class="form-group" style="grid-column:1/-1;margin-bottom:0;display:flex;align-items:center;gap:10px;">
            <input type="checkbox" id="dir-principal" style="width:auto;" ${checkPrincipal ? 'checked' : ''} />
            <label for="dir-principal" style="margin-bottom:0;cursor:pointer;">
              Establecer como dirección principal
            </label>
          </div>

        </div>
        <div class="modal-footer" style="margin-top:24px;">
          <button class="btn btn-outline" id="dir-modal-cancel">Cancelar</button>
          <button class="btn btn-primary" id="dir-modal-save">
            ${esEdicion ? 'Guardar cambios' : 'Agregar dirección'}
          </button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) cerrarModalDireccion(); });
  document.getElementById('dir-modal-close')?.addEventListener('click', cerrarModalDireccion);
  document.getElementById('dir-modal-cancel')?.addEventListener('click', cerrarModalDireccion);
  document.getElementById('dir-modal-save')?.addEventListener('click', _guardarModalDireccion);
}

function cerrarModalDireccion() {
  document.getElementById('dir-modal')?.remove();
  _dirModalEditing  = null;
  _dirModalCallback = null;
}

async function _guardarModalDireccion() {
  const calle       = document.getElementById('dir-calle')?.value.trim();
  const numExt      = document.getElementById('dir-num-ext')?.value.trim();
  const numInt      = document.getElementById('dir-num-int')?.value.trim();
  const colonia     = document.getElementById('dir-colonia')?.value.trim();
  const ciudad      = document.getElementById('dir-ciudad')?.value.trim();
  const estado      = document.getElementById('dir-estado')?.value;
  const cp          = document.getElementById('dir-cp')?.value.trim();
  const referencias = document.getElementById('dir-referencias')?.value.trim();
  const principal   = document.getElementById('dir-principal')?.checked;

  if (!calle || !numExt || !colonia || !ciudad || !estado || !cp) {
    _mostrarErrorModalDireccion('Por favor completa todos los campos obligatorios (*).');
    return;
  }

  const saveBtn = document.getElementById('dir-modal-save');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando...';

  const payload = {
    calle, numeroExterior: numExt, colonia, ciudad, estado,
    codigoPostal: cp, pais: 'México', principal,
    ...(numInt      && { numeroInterior: numInt }),
    ...(referencias && { referencias })
  };

  try {
    let resultado;
    if (_dirModalEditing) {
      resultado = await Api.modificarDireccion(_dirModalEditing.id, payload);
    } else {
      resultado = await Api.crearDireccion(payload);
    }
    const normalizada = normalizarDireccion(resultado);
    const cb = _dirModalCallback;
    cerrarModalDireccion();
    if (cb) cb(normalizada);
  } catch (err) {
    _mostrarErrorModalDireccion(err.message || 'Error al guardar la dirección.');
    saveBtn.disabled = false;
    saveBtn.textContent = _dirModalEditing ? 'Guardar cambios' : 'Agregar dirección';
  }
}

function _mostrarErrorModalDireccion(msg) {
  const el = document.getElementById('dir-form-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
