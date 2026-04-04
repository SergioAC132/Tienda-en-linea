const pool = require('../config/db');

const findDireccionesByUser = async (idUser) => {
    const { rows } = await pool.query(
        'SELECT * FROM direcciones WHERE id_usuario = $1',
        [idUser]
    );
    return rows || null;
};

const createDireccion = async({ idUsuario, calle, numeroExterior, numeroInterior, colonia, ciudad,
                                estado, codigoPostal, pais, referencias, principal }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (principal) {
            await client.query(
                'UPDATE direcciones SET es_principal = false WHERE id_usuario = $1 AND es_principal = true',
                [idUsuario]
            );
        }

        const { rows } = await client.query(
            `INSERT INTO direcciones (id_usuario, calle, numero_exterior, numero_interior, colonia, ciudad, estado, codigo_postal, pais, referencias, es_principal)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id_direccion, id_usuario, calle, numero_exterior, numero_interior, colonia, ciudad, estado, codigo_postal, pais, referencias, es_principal`,
            [idUsuario, calle, numeroExterior, numeroInterior, colonia, ciudad, estado, codigoPostal,
             pais, referencias, principal]
        );

        await client.query('COMMIT');
        return rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const updateDireccion = async (idDireccion, idUsuario, { calle, numeroExterior, numeroInterior, colonia, ciudad,
                                                              estado, codigoPostal, pais, referencias, principal }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (principal) {
            await client.query(
                'UPDATE direcciones SET es_principal = false WHERE id_usuario = $1 AND es_principal = true AND id_direccion != $2',
                [idUsuario, idDireccion]
            );
        }

        const { rows } = await client.query(
            `UPDATE direcciones
             SET calle = $1, numero_exterior = $2, numero_interior = $3, colonia = $4, ciudad = $5,
                 estado = $6, codigo_postal = $7, pais = $8, referencias = $9, es_principal = $10
             WHERE id_direccion = $11 AND id_usuario = $12
             RETURNING id_direccion, id_usuario, calle, numero_exterior, numero_interior, colonia, ciudad, estado, codigo_postal, pais, referencias, es_principal`,
            [calle, numeroExterior, numeroInterior, colonia, ciudad, estado, codigoPostal, pais, referencias, principal, idDireccion, idUsuario]
        );

        await client.query('COMMIT');
        return rows[0] || null;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    findDireccionesByUser,
    createDireccion,
    updateDireccion
};