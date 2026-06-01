/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable('puntos_entrega', {
    id_punto_entrega: { type: 'serial', primaryKey: true },
    nombre:           { type: 'varchar(100)', notNull: true },
    descripcion:      { type: 'text', notNull: false },
    activo:           { type: 'boolean', notNull: true, default: true },
    fecha_creacion:   { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addColumn('pedidos', {
    tipo_entrega: {
      type: 'varchar(20)',
      notNull: true,
      default: 'envio',
    },
    id_punto_entrega: {
      type: 'integer',
      notNull: false,
      references: '"puntos_entrega"(id_punto_entrega)',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropColumn('pedidos', 'id_punto_entrega');
  pgm.dropColumn('pedidos', 'tipo_entrega');
  pgm.dropTable('puntos_entrega');
};
