// ─────────────────────────────────────────────────────────────
//  MIDDLEWARE DE PAGOS
//  Valida los datos que llegan en el body antes de que lleguen
//  al controller. Si algo no cumple las reglas, responde con
//  400 y una lista de errores sin ejecutar ninguna consulta SQL.
// ─────────────────────────────────────────────────────────────


/**
 * Valida el body al registrar un pago (POST /api/pagos).
 *
 * Campos esperados en req.body:
 *   - id_pedido      {number} Requerido. ID del pedido a pagar. Entero positivo.
 *   - id_metodo_pago {number} Requerido. ID del método de pago. Entero positivo.
 *
 * Si la validación pasa, normaliza los valores a número y llama a next().
 * Si falla, responde con 400 y un arreglo de errores.
 */
const validarRegistrarPago = (req, res, next) => {
    const { id_pedido, id_metodo_pago } = req.body;
    const errores = [];

    // ── id_pedido ────────────────────────────────────────────
    if (id_pedido === undefined || id_pedido === null || id_pedido === '') {
        errores.push('El campo id_pedido es requerido.');
    } else {
        const val = Number(id_pedido);
        if (!Number.isInteger(val) || val <= 0) {
            errores.push('El id_pedido debe ser un entero positivo.');
        }
    }

    // ── id_metodo_pago ───────────────────────────────────────
    if (id_metodo_pago === undefined || id_metodo_pago === null || id_metodo_pago === '') {
        errores.push('El campo id_metodo_pago es requerido.');
    } else {
        const val = Number(id_metodo_pago);
        if (!Number.isInteger(val) || val <= 0) {
            errores.push('El id_metodo_pago debe ser un entero positivo.');
        }
    }

    if (errores.length > 0) {
        return res.status(400).json({ errores });
    }

    // Normalizar a número antes de pasar al controller
    req.body.id_pedido      = Number(id_pedido);
    req.body.id_metodo_pago = Number(id_metodo_pago);

    next();
};


module.exports = {
    validarRegistrarPago,
};
