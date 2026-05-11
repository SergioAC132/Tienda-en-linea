/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.alterColumn('usuarios', 'telefono', {
    notNull: false,
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.alterColumn('usuarios', 'telefono', {
    notNull: true,
  });
};