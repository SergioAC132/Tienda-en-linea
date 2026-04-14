/**
 * Migración — Password Reset Tokens
 * Tintin Luxury · Sistema de Gestión de Ventas
 *
 * Agrega columnas para el flujo de recuperación de contraseña a la tabla usuarios.
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumns('usuarios', {
    reset_token: {
      type: 'varchar(64)',
      notNull: false,
    },
    reset_token_expiry: {
      type: 'timestamptz',
      notNull: false,
    },
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropColumns('usuarios', ['reset_token', 'reset_token_expiry']);
};
