/**
 * Migración — Carrito de compras persistente
 * Tintin Luxury · Sistema de Gestión de Ventas
 *
 * Crea las tablas `carritos` y `carrito_items` para persistir el
 * carrito de cada cliente en la BD, de modo que sobreviva al cierre
 * de sesión.
 *
 * Diseño:
 *  - Un usuario tiene como máximo UN carrito activo (UNIQUE en id_usuario).
 *  - Al confirmarse un pedido el frontend llama DELETE /api/carrito,
 *    que vacía carrito_items pero conserva el registro en `carritos`
 *    listo para la próxima compra.
 *  - carrito_items referencia la combinación (id_producto, id_talla)
 *    de la tabla productos_tallas para poder validar stock en el backend.
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {

  // ── CARRITOS ──────────────────────────────────────────────────
  // Un registro por usuario. Se crea al primer agregar y persiste
  // aunque el carrito quede vacío.
  pgm.createTable('carritos', {
    id_carrito: {
      type: 'bigint',
      primaryKey: true,
      sequenceGenerated: { precedence: 'ALWAYS' },
    },
    id_usuario: {
      type: 'bigint',
      notNull: true,
      unique: true,
      references: 'usuarios(id_usuario)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    fecha_actualizacion: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });
  pgm.createIndex('carritos', 'id_usuario', { name: 'idx_carritos_usuario' });


  // ── CARRITO_ITEMS ─────────────────────────────────────────────
  // Cada fila = un producto+talla en el carrito.
  // La PK compuesta garantiza que la misma combinación no se duplique.
  pgm.createTable('carrito_items', {
    id_carrito: {
      type: 'bigint',
      notNull: true,
      references: 'carritos(id_carrito)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    id_producto: {
      type: 'bigint',
      notNull: true,
      references: 'productos(id_producto)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    id_talla: {
      type: 'bigint',
      notNull: true,
      references: 'tallas(id_talla)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    cantidad: {
      type: 'int',
      notNull: true,
    },
  });

  pgm.addConstraint(
    'carrito_items',
    'pk_carrito_items',
    'PRIMARY KEY (id_carrito, id_producto, id_talla)'
  );

  // La cantidad debe ser al menos 1; si llega a 0 se elimina la fila.
  pgm.addConstraint(
    'carrito_items',
    'ck_carrito_items_cantidad',
    'CHECK (cantidad > 0)'
  );

  pgm.createIndex('carrito_items', 'id_carrito', { name: 'idx_carrito_items_carrito' });
};


/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('carrito_items');
  pgm.dropTable('carritos');
};
