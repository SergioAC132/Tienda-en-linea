// ===== ESTADO GLOBAL CON LOCALSTORAGE =====

const DEFAULT_PRODUCTOS = [
  {
    id: '1', nombre: 'Playera Adidas Azul',
    descripcion: 'Playera Adidas deportiva con tecnología transpirable',
    precio_base: 2500,
    imagenes: [{ url: 'https://tse2.mm.bing.net/th/id/OIP.shW4j79SeW9WMR5FdckJdwHaIa?rs=1&pid=ImgDetMain&o=7&rm=3', orden: 1 }],
    tallas: [{ talla:'XS',disponible:true },{ talla:'S',disponible:true },{ talla:'M',disponible:true },{ talla:'L',disponible:false }],
    disponible: true, fecha_publicacion: '2026-03-15T10:00:00Z'
  },
  {
    id: '2', nombre: 'Playera Gucci',
    descripcion: 'Playera Gucci de alta calidad.',
    precio_base: 8900,
    imagenes: [{ url: 'https://tse4.mm.bing.net/th/id/OIP.KSWidrQMM12R3GVhI1iYkgHaFt?rs=1&pid=ImgDetMain&o=7&rm=3', orden: 1 }],
    tallas: [{ talla:'XS',disponible:true },{ talla:'S',disponible:true },{ talla:'M',disponible:true },{ talla:'L',disponible:false }],
    disponible: true, fecha_publicacion: '2026-03-14T10:00:00Z'
  },
  {
    id: '3', nombre: 'Mochila Louis Vuitton',
    descripcion: 'Mochila Louis Vuitton de alta calidad con acabados de lujo',
    precio_base: 3200,
    imagenes: [{ url: 'https://tse1.mm.bing.net/th/id/OIP.Qovaj_kSmBv3iHQwcMBmUQHaJ5?rs=1&pid=ImgDetMain&o=7&rm=3', orden: 1 }],
    tallas: [{ talla:'Única',disponible:true }],
    disponible: true, fecha_publicacion: '2026-03-13T10:00:00Z'
  },
  {
    id: '4', nombre: 'Gafas de Sol Aviador',
    descripcion: 'Gafas con montura de titanio ultraligero y cristales polarizados con protección UV400. Incluye estuche de piel.',
    precio_base: 5400,
    imagenes: [{ url: 'https://images.unsplash.com/photo-1759933253608-ba60cfb8dcf0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXNpZ25lciUyMHN1bmdsYXNzZXMlMjBsdXh1cnklMjBhY2Nlc3Nvcmllc3xlbnwxfHx8fDE3NzM3NDQxNDB8MA&ixlib=rb-4.1.0&q=80&w=1080', orden: 1 }],
    tallas: [{ talla:'Única',disponible:true }],
    disponible: true, fecha_publicacion: '2026-03-12T10:00:00Z'
  },
  {
    id: '5', nombre: 'Pantalones Supreme',
    descripcion: 'Pantalones Supreme, con tecnología de calefacción',
    precio_base: 18500,
    imagenes: [{ url: 'https://images.stockx.com/images/Supreme-Satin-Applique-Sweatpant-Red.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color&updated_at=1666885086', orden: 1 }],
    tallas: [{ talla:'S',disponible:true },{ talla:'M',disponible:true },{ talla:'L',disponible:true }],
    disponible: true, fecha_publicacion: '2026-03-11T10:00:00Z'
  }
];

const DEFAULT_USUARIOS = [
  { id:'1', nombre:'María González',    correo:'maria@cliente.com',   rol:'CLIENTE',  estado:'activo',   fecha_creacion:'2026-01-10T10:00:00Z' },
  { id:'2', nombre:'Carlos Vendedor',   correo:'carlos@vendedor.com', rol:'VENDEDOR', estado:'activo',   fecha_creacion:'2026-01-05T10:00:00Z' },
  { id:'3', nombre:'Ana Administradora',correo:'ana@admin.com',       rol:'ADMIN',    estado:'activo',   fecha_creacion:'2026-01-01T10:00:00Z' },
  { id:'4', nombre:'Pedro Cliente',     correo:'pedro@cliente.com',   rol:'CLIENTE',  estado:'inactivo', fecha_creacion:'2026-02-15T10:00:00Z' }
];

const DEFAULT_DIRECCIONES = [{
  id:'1', usuario_id:'1', nombre_completo:'María González',
  telefono:'+52 55 1234 5678', calle:'Av. Paseo de la Reforma 505',
  ciudad:'Ciudad de México', estado:'CDMX', codigo_postal:'06500', es_principal:true
}];

const DEFAULT_PEDIDOS = [{
  id:'PED-001', usuario_id:'1',
  direccion:{ id:'1',usuario_id:'1',nombre_completo:'María González',telefono:'+52 55 1234 5678',calle:'Av. Paseo de la Reforma 505',ciudad:'Ciudad de México',estado:'CDMX',codigo_postal:'06500',es_principal:true },
  items:[{ productoId:'1', nombre:'Playera Adidas Azul', imagenUrl:'https://tse2.mm.bing.net/th/id/OIP.shW4j79SeW9WMR5FdckJdwHaIa?rs=1&pid=ImgDetMain&o=7&rm=3', talla:'M', cantidad:1, subtotal:12500 }],
  total:12500, estado:'pagado', comentarios_cliente:'', fecha_creacion:'2026-03-10T14:30:00Z',
  pago:{ id:'PAG-001',pedido_id:'PED-001',metodo:'Transferencia',estado_pago:'confirmado',referencia_bancaria:'TRF123456789',fecha_registro:'2026-03-10T15:00:00Z' }
}];

// ===== AppState con localStorage =====
const AppState = (function () {
  const KEY = 'tintin_state';

  function getDefault() {
    return {
      currentUser: null,
      productos: JSON.parse(JSON.stringify(DEFAULT_PRODUCTOS)),
      usuarios: JSON.parse(JSON.stringify(DEFAULT_USUARIOS)),
      direcciones: JSON.parse(JSON.stringify(DEFAULT_DIRECCIONES)),
      carrito: [],
      pedidos: JSON.parse(JSON.stringify(DEFAULT_PEDIDOS))
    };
  }

  function load() {
    try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; }
    catch(e) { return null; }
  }

  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); }
    catch(e) {}
  }

  let s = load() || getDefault();

  return {
    // ─── Getters ────────────────────────────────────────────
    get currentUser()  { return s.currentUser; },
    get productos()    { return s.productos; },
    get usuarios()     { return s.usuarios; },
    get direcciones()  { return s.direcciones; },
    get carrito()      { return s.carrito; },
    get pedidos()      { return s.pedidos; },

    // ─── Auth ────────────────────────────────────────────────
    setCurrentUser(usuario, token) {
      s.currentUser = {
        id:     usuario.id_usuario,
        nombre: usuario.nombre,
        email:  usuario.email,
        rol:    usuario.rol,
        estado: usuario.activo ? 'activo' : 'inactivo'
      };
      if (token) localStorage.setItem('tintin_token', token);
      save(s);
    },
    getToken() {
      return localStorage.getItem('tintin_token');
    },
    logout() {
      s.currentUser = null;
      s.carrito = [];
      localStorage.removeItem('tintin_token');
      save(s);
    },

    // ─── Productos ───────────────────────────────────────────
    getProducto(id) { return s.productos.find(p => p.id === id) || null; },

    agregarProducto(data) {
      const nuevo = { ...data, id: `PROD-${Date.now()}`, fecha_publicacion: new Date().toISOString() };
      s.productos.unshift(nuevo); save(s); return nuevo;
    },
    editarProducto(id, cambios) {
      const i = s.productos.findIndex(p => p.id === id);
      if (i !== -1) { s.productos[i] = { ...s.productos[i], ...cambios }; save(s); }
    },
    eliminarProducto(id) {
      s.productos = s.productos.filter(p => p.id !== id); save(s);
    },

    // ─── Carrito ─────────────────────────────────────────────
    getCarritoCount() { return s.carrito.reduce((n, i) => n + i.cantidad, 0); },
    getCarritoTotal() { return s.carrito.reduce((n, i) => n + i.precio_base * i.cantidad, 0); },

    /**
     * Reemplaza el carrito local con los items que devuelve la API.
     * Normaliza los campos de la BD al shape que usa el frontend.
     * Se llama al iniciar sesión y al cargar la página del carrito.
     *
     * @param {Array} apiItems - items devueltos por GET /api/carrito
     */
    setCarritoFromApi(apiItems) {
      s.carrito = (apiItems || []).map(item => ({
        productoId:      String(item.id_producto),
        id_talla:        item.id_talla,
        talla:           item.talla,
        cantidad:        item.cantidad,
        nombre:          item.nombre,
        precio_base:     Number(item.precio_base),
        imagenUrl:       item.imagen_url || null,
        stockDisponible: item.stock_disponible,
      }));
      save(s);
    },

    agregarAlCarrito(productoId, talla, cantidad, productoData) {
      const p = productoData || this.getProducto(productoId);
      if (!p) return;
      const tallaInfo = p.tallas?.find(t => t.talla === talla);
      const stockDisponible = tallaInfo ? (tallaInfo.stock ?? 0) : 0;
      const ex = s.carrito.find(i => i.productoId === productoId && i.talla === talla);
      if (ex) {
        ex.cantidad = Math.min(ex.cantidad + cantidad, stockDisponible);
        ex.stockDisponible = stockDisponible;
      } else {
        s.carrito.push({
          productoId,
          id_talla:        tallaInfo?.id_talla,
          talla,
          cantidad:        Math.min(cantidad, stockDisponible),
          nombre:          p.nombre,
          precio_base:     p.precio_base,
          imagenUrl:       p.imagenes[0]?.url,
          stockDisponible,
        });
      }
      save(s);
    },
    modificarCantidadCarrito(productoId, talla, nuevaCantidad) {
      const item = s.carrito.find(i => i.productoId === productoId && i.talla === talla);
      if (!item) return;
      if (nuevaCantidad < 1) { this.eliminarDelCarrito(productoId, talla); return; }
      item.cantidad = Math.min(nuevaCantidad, item.stockDisponible ?? nuevaCantidad);
      save(s);
    },
    eliminarDelCarrito(productoId, talla) {
      s.carrito = s.carrito.filter(i => !(i.productoId === productoId && i.talla === talla)); save(s);
    },
    limpiarCarrito() { s.carrito = []; save(s); },

    // ─── Direcciones ─────────────────────────────────────────
    agregarDireccion(data) {
      const nueva = { ...data, id: `DIR-${Date.now()}` };
      s.direcciones.push(nueva); save(s); return nueva;
    },
    setDirecciones(arr) {
      s.direcciones = arr; save(s);
    },
    editarDireccion(id, cambios) {
      if (cambios.es_principal) {
        s.direcciones.forEach(d => { d.es_principal = false; });
      }
      const i = s.direcciones.findIndex(d => String(d.id) === String(id));
      if (i !== -1) { s.direcciones[i] = { ...s.direcciones[i], ...cambios }; save(s); }
    },
    agregarDireccionNormalizada(data) {
      if (data.es_principal) {
        s.direcciones.forEach(d => { d.es_principal = false; });
      }
      s.direcciones.push(data); save(s);
    },

    // ─── Pedidos ─────────────────────────────────────────────

    /**
     * Reemplaza la lista de pedidos en el estado con los datos que
     * devuelve la API. Se llama desde la página de pedidos después
     * de un GET /api/pedidos exitoso.
     * Normaliza el campo id_usuario (nombre de la BD) al campo
     * usuario_id que usa el resto del estado local, para mantener
     * compatibilidad con el flujo del carrito y pago.
     *
     * @param {Array} arr - Lista de pedidos devuelta por la API
     */
    setPedidos(arr) {
      s.pedidos = arr.map(p => ({
        ...p,
        // La BD usa id_pedido, el estado local usa id
        id: p.id_pedido ?? p.id,
        // La BD usa id_usuario, el estado local usa usuario_id
        usuario_id: p.id_usuario ?? p.usuario_id,
      }));
      save(s);
    },

    /**
     * Crea un pedido en el estado local después de que la API lo guardó en la BD.
     * Guarda el id_pedido de la BD junto al ID local para que pago.js pueda
     * llamar al endpoint PATCH /api/pedidos/:id/pagar y actualizar el estado real.
     * También conserva items y dirección para que pago.js los pueda mostrar.
     *
     * @param {string} direccionId  - ID local de la dirección seleccionada
     * @param {string} comentarios  - Comentarios del cliente (puede ser vacío)
     * @param {number} idPedidoDB   - id_pedido devuelto por la API al crear el pedido
     * @returns {Object} El pedido local recién creado
     */
    crearPedido(direccionId, comentarios, idPedidoDB) {
      if (!s.currentUser) throw new Error('Error al crear pedido');
      const dir = direccionId != null
        ? s.direcciones.find(d => String(d.id) === String(direccionId))
        : null;
      const items = s.carrito.map(i => ({ productoId: i.productoId, nombre: i.nombre, imagenUrl: i.imagenUrl, talla: i.talla, cantidad: i.cantidad, subtotal: i.precio_base * i.cantidad }));
      const total = items.reduce((n, i) => n + i.subtotal, 0);
      const id = `PED-${String(s.pedidos.length + 1).padStart(3, '0')}`;
      // id_pedido es el ID real en la BD — se usa en pago.js para llamar a la API
      const pedido = { id, id_pedido: idPedidoDB || null, usuario_id: s.currentUser.id, direccion: dir, items, total, estado: 'pendiente', comentarios_cliente: comentarios || '', fecha_creacion: new Date().toISOString() };
      s.pedidos.push(pedido);
      this.limpiarCarrito();
      save(s);
      return pedido;
    },

    registrarPago(pedidoId, metodo, comprobante_url) {
      const pago = {
        id: `PAG-${String(s.pedidos.length + 1).padStart(3,'0')}`,
        pedido_id: pedidoId, metodo, estado_pago: 'pendiente',
        referencia_bancaria: metodo === 'Transferencia' ? `REF-${Date.now().toString(36).toUpperCase()}` : undefined,
        comprobante_url, fecha_registro: new Date().toISOString()
      };
      const p = s.pedidos.find(p => p.id === pedidoId);
      if (p) { p.estado = 'esperando_pago'; p.pago = pago; }
      save(s);
    },

    /**
     * Devuelve los pedidos del cliente autenticado.
     * Cuando los pedidos vienen de la API ya vienen filtrados por
     * el backend, por lo que setPedidos los habrá normalizado.
     * Cuando vienen del estado local (flujo carrito/pago) usan
     * usuario_id directamente.
     */
    getMisPedidos() {
      if (!s.currentUser) return [];
      const id = String(s.currentUser.id);
      return s.pedidos.filter(p =>
        String(p.usuario_id) === id || String(p.id_usuario) === id
      );
    },

    // ─── Usuarios ────────────────────────────────────────────
    toggleUsuarioEstado(userId) {
      const u = s.usuarios.find(u => u.id === userId);
      if (u) { u.estado = u.estado === 'activo' ? 'inactivo' : 'activo'; save(s); }
    },

    // ─── Reset (para desarrollo) ──────────────────────────────
    reset() { s = getDefault(); save(s); }
  };
})();
