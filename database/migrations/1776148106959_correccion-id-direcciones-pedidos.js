/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumn('pedidos', {
    id_direccion: {
      type: 'bigint',
      notNull: false, // false para no romper filas existentes
      references: 'direcciones(id_direccion)',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    }
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropColumn('pedidos', 'id_direccion');
};