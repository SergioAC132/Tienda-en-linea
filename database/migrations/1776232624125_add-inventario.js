/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumn('productos_tallas', {
    stock: {
      type: 'integer',
      notNull: false, // false para no romper filas existentes
    }
    });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropColumn('productos_tallas', 'stock');
};