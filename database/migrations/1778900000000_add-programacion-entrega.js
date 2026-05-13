/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addTypeValue('estado_pedido', 'pendiente_programacion', { before: 'esperando_pago' });
  pgm.addTypeValue('estado_pedido', 'esperando_dia_entrega', { before: 'pagado' });

  pgm.addColumn('pedidos', {
    fecha_hora_entrega: { type: 'timestamptz', notNull: false },
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropColumn('pedidos', 'fecha_hora_entrega');
  // Los valores de ENUM no se pueden eliminar en PostgreSQL sin recrear el tipo.
};
