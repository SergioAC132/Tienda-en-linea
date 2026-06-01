/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumn('tallas', {
    orden: { type: 'integer', notNull: false }
  });

  // Asignar orden inicial basado en orden alfabético actual
  pgm.sql(`
    UPDATE tallas SET orden = sub.rn
    FROM (
      SELECT id_talla, ROW_NUMBER() OVER (ORDER BY nombre ASC) AS rn
      FROM tallas
    ) sub
    WHERE tallas.id_talla = sub.id_talla
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropColumn('tallas', 'orden');
};
