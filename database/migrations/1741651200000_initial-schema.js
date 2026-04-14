/**
 * Migración 001 — Schema inicial
 * Tintin Luxury · Sistema de Gestión de Ventas
 *
 * Crea todos los tipos ENUM, tablas e índices del sistema.
 * Siembra los métodos de pago base.
 *
 * node-pg-migrate docs: https://salsita.github.io/node-pg-migrate
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {

  // ── TIPOS ENUM ────────────────────────────────────────────────
  pgm.createType('rol_usuario', ['ADMIN', 'VENDEDOR', 'CLIENTE']);
  pgm.createType('estado_pedido', ['pendiente', 'esperando_pago', 'pagado', 'entregado', 'cancelado']);
  pgm.createType('estado_pago', ['pendiente', 'confirmado', 'rechazado']);


  // ── USUARIOS ──────────────────────────────────────────────────
  pgm.createTable('usuarios', {
    id_usuario:     { type: 'bigint', primaryKey: true, sequenceGenerated: { precedence: 'ALWAYS' } },
    nombre:         { type: 'varchar(100)', notNull: true },
    email:          { type: 'varchar(100)', notNull: true, unique: true },
    password:       { type: 'varchar(255)', notNull: true },
    telefono:       { type: 'varchar(15)',  notNull: true },
    rol:            { type: 'rol_usuario',  notNull: true, default: 'CLIENTE' },
    activo:         { type: 'boolean',      notNull: true, default: true },
    fecha_creacion: { type: 'timestamptz',  notNull: true, default: pgm.func('NOW()') },
  });


  // ── DIRECCIONES ───────────────────────────────────────────────
  pgm.createTable('direcciones', {
    id_direccion:    { type: 'bigint', primaryKey: true, sequenceGenerated: { precedence: 'ALWAYS' } },
    id_usuario:      { type: 'bigint', notNull: true, references: 'usuarios(id_usuario)', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    calle:           { type: 'varchar(150)', notNull: true },
    numero_exterior: { type: 'int',         notNull: true },
    numero_interior: { type: 'varchar(5)',   notNull: false },
    colonia:         { type: 'varchar(50)',  notNull: true },
    ciudad:          { type: 'varchar(50)',  notNull: true },
    estado:          { type: 'varchar(50)',  notNull: true },
    codigo_postal:   { type: 'varchar(10)',  notNull: true },
    pais:            { type: 'varchar(20)',  notNull: true },
    referencias:     { type: 'varchar(100)', notNull: false },
    es_principal:    { type: 'boolean',      notNull: true, default: false },
  });
  pgm.createIndex('direcciones', 'id_usuario', { name: 'idx_direcciones_usuario' });


  // ── TALLAS ────────────────────────────────────────────────────
  pgm.createTable('tallas', {
    id_talla:    { type: 'bigint', primaryKey: true, sequenceGenerated: { precedence: 'ALWAYS' } },
    nombre:      { type: 'varchar(10)', notNull: true, unique: true },
    es_ninio:    { type: 'boolean',     notNull: true, default: false },
    descripcion: { type: 'varchar(50)', notNull: false },
  });


  // ── PRODUCTOS ─────────────────────────────────────────────────
  pgm.createTable('productos', {
    id_producto:       { type: 'bigint', primaryKey: true, sequenceGenerated: { precedence: 'ALWAYS' } },
    nombre:            { type: 'varchar(70)',    notNull: true },
    descripcion:       { type: 'varchar(200)',   notNull: false },
    precio_base:       { type: 'numeric(10,2)',  notNull: true },
    disponible:        { type: 'boolean',        notNull: true, default: true },
    activo:            { type: 'boolean',        notNull: true, default: true },
    fecha_publicacion: { type: 'timestamptz',    notNull: true, default: pgm.func('NOW()') },
  });


  // ── IMAGEN_PRODUCTO ───────────────────────────────────────────
  pgm.createTable('imagen_producto', {
    id_imagen:   { type: 'bigint', primaryKey: true, sequenceGenerated: { precedence: 'ALWAYS' } },
    id_producto: { type: 'bigint',       notNull: true, references: 'productos(id_producto)', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    url_imagen:  { type: 'varchar(255)', notNull: true, unique: true },
    orden:       { type: 'int',          notNull: true, default: 1 },
  });
  pgm.createIndex('imagen_producto', 'id_producto', { name: 'idx_imagen_producto' });


  // ── PRODUCTOS_TALLAS (N:M) ────────────────────────────────────
  pgm.createTable('productos_tallas', {
    id_producto: { type: 'bigint', notNull: true, references: 'productos(id_producto)', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    id_talla:    { type: 'bigint', notNull: true, references: 'tallas(id_talla)',       onDelete: 'CASCADE', onUpdate: 'CASCADE' },
  });
  pgm.addConstraint('productos_tallas', 'pk_productos_tallas', 'PRIMARY KEY (id_producto, id_talla)');


  // ── MÉTODOS DE PAGO ───────────────────────────────────────────
  pgm.createTable('metodos_pago', {
    id_metodo_pago: { type: 'bigint',      primaryKey: true, sequenceGenerated: { precedence: 'ALWAYS' } },
    nombre:         { type: 'varchar(50)', notNull: true, unique: true },
  });
  // Datos semilla: los 3 métodos definidos en los casos de uso
  pgm.sql(`
    INSERT INTO metodos_pago (nombre) VALUES
      ('efectivo'),
      ('transferencia'),
      ('link_pago')
    ON CONFLICT (nombre) DO NOTHING;
  `);


  // ── PEDIDOS ───────────────────────────────────────────────────
  pgm.createTable('pedidos', {
    id_pedido:            { type: 'bigint', primaryKey: true, sequenceGenerated: { precedence: 'ALWAYS' } },
    id_usuario:           { type: 'bigint',        notNull: true, references: 'usuarios(id_usuario)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    fecha_pedido:         { type: 'timestamptz',   notNull: true, default: pgm.func('NOW()') },
    estado:               { type: 'estado_pedido', notNull: true, default: 'pendiente' },
    total:                { type: 'numeric(10,2)', notNull: true, default: 0.00 },
    comentarios_cliente:  { type: 'varchar(100)',  notNull: false },
    comentarios_vendedor: { type: 'varchar(100)',  notNull: false },
  });
  pgm.createIndex('pedidos', 'estado',     { name: 'idx_pedidos_estado' });
  pgm.createIndex('pedidos', 'id_usuario', { name: 'idx_pedidos_usuario' });


  // ── DETALLE_PEDIDOS ───────────────────────────────────────────
  pgm.createTable('detalle_pedidos', {
    id_pedido:   { type: 'bigint',        notNull: true, references: 'pedidos(id_pedido)',    onDelete: 'CASCADE',  onUpdate: 'CASCADE' },
    id_producto: { type: 'bigint',        notNull: true, references: 'productos(id_producto)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    id_talla:    { type: 'bigint',        notNull: true, references: 'tallas(id_talla)',       onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    cantidad:    { type: 'int',           notNull: true },
    total:       { type: 'numeric(10,2)', notNull: true },
  });
  pgm.addConstraint('detalle_pedidos', 'pk_detalle_pedidos', 'PRIMARY KEY (id_pedido, id_producto, id_talla)');


  // ── PAGOS ─────────────────────────────────────────────────────
  pgm.createTable('pagos', {
    id_pago:            { type: 'bigint', primaryKey: true, sequenceGenerated: { precedence: 'ALWAYS' } },
    id_pedido:          { type: 'bigint',       notNull: true, references: 'pedidos(id_pedido)',           onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    id_metodo_pago:     { type: 'bigint',       notNull: true, references: 'metodos_pago(id_metodo_pago)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    estado_pago:        { type: 'estado_pago',  notNull: true, default: 'pendiente' },
    fecha_registro:     { type: 'timestamptz',  notNull: true, default: pgm.func('NOW()') },
    fecha_confirmacion: { type: 'timestamptz',  notNull: false },
    referencia:         { type: 'varchar(50)',  notNull: false },
    comprobante_pago:   { type: 'varchar(255)', notNull: false, unique: true },
    url_pago:           { type: 'varchar(255)', notNull: false },
    monto:              { type: 'numeric(10,2)', notNull: true },
  });
  pgm.createIndex('pagos', 'estado_pago', { name: 'idx_pagos_estado' });

};


/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  // Se eliminan en orden inverso por las FKs
  pgm.dropTable('pagos');
  pgm.dropTable('detalle_pedidos');
  pgm.dropTable('pedidos');
  pgm.dropTable('metodos_pago');
  pgm.dropTable('productos_tallas');
  pgm.dropTable('imagen_producto');
  pgm.dropTable('productos');
  pgm.dropTable('tallas');
  pgm.dropTable('direcciones');
  pgm.dropTable('usuarios');

  pgm.dropType('estado_pago');
  pgm.dropType('estado_pedido');
  pgm.dropType('rol_usuario');
};
