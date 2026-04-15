// ─────────────────────────────────────────────────────────────
//  MIDDLEWARE DE PEDIDOS
//  Valida los datos que llegan en el body antes de que lleguen
//  al controller. Si algo no cumple las reglas, responde con
//  400 y una lista de errores sin ejecutar ninguna consulta SQL.
// ─────────────────────────────────────────────────────────────

// Estados permitidos según el ENUM definido en la base de datos
const ESTADOS_VALIDOS = ['pendiente', 'esperando_pago', 'pagado', 'entregado', 'cancelado'];

// Mapa de transiciones permitidas por estado actual.
// Si necesitas habilitar una transición adicional (ej. pagado → esperando_pago),
// solo agrégala al array correspondiente sin tocar el resto del middleware.
const TRANSICIONES_VALIDAS = {
  pendiente:      ['esperando_pago', 'cancelado'],
  esperando_pago: ['pagado', 'cancelado'],
  pagado:         ['entregado', 'cancelado'],
  entregado:      [],
  cancelado:      []
};


/**
 * Valida el body al crear un nuevo pedido (POST /api/pedidos).
 *
 * Campos esperados en req.body:
 *   - total        {number}  Requerido. Total calculado desde el carrito en el frontend.
 *                            Debe ser un número mayor a cero.
 *   - id_direccion {number}  Requerido. ID de la dirección de entrega seleccionada.
 *   - comentarios  {string}  Opcional. Máximo 100 caracteres (límite de la BD).
 *
 * Si la validación pasa, deja pasar la solicitud al controller.
 * Si falla, responde con 400 y un arreglo de errores.
 */
const validarCrearPedido = (req, res, next) => {
    const { total, id_direccion, comentarios } = req.body;
    const errores = [];

    // ── total ────────────────────────────────────────────────
    if (total === undefined || total === null || total === '') {
        errores.push('El campo total es requerido.');
    } else {
        const totalNum = Number(total);
        if (isNaN(totalNum) || totalNum <= 0) {
            errores.push('El total debe ser un número mayor a cero.');
        }
    }

    // ── id_direccion ─────────────────────────────────────────
    if (id_direccion === undefined || id_direccion === null || id_direccion === '') {
        errores.push('El campo id_direccion es requerido.');
    } else {
        const idNum = Number(id_direccion);
        if (!Number.isInteger(idNum) || idNum <= 0) {
            errores.push('El id_direccion debe ser un entero positivo.');
        }
    }

    // ── comentarios (opcional) ───────────────────────────────
    if (comentarios !== undefined && comentarios !== null) {
        const comentarioLimpio = comentarios.toString().trim();
        if (comentarioLimpio.length > 100) {
            errores.push('Los comentarios no pueden superar los 100 caracteres.');
        }
        req.body.comentarios = comentarioLimpio || null;
    }

    if (errores.length > 0) {
        return res.status(400).json({ errores });
    }

    // Normalizar antes de pasar al controller
    req.body.total        = Number(total);
    req.body.id_direccion = Number(id_direccion);

    next();
};


/**
 * Valida el body al actualizar el estado de un pedido (PATCH /api/pedidos/:id/estado).
 * Solo puede ser usado por Vendedor o Admin (el controller verifica el rol).
 *
 * Campos esperados en req.body:
 *   - estado               {string}  Requerido. Nuevo estado deseado. Debe ser un valor del ENUM.
 *   - estado_actual        {string}  Requerido. Estado actual del pedido (lo manda el frontend).
 *                                    Se usa para validar que la transición sea permitida.
 *   - comentarios_vendedor {string}  Opcional. Máximo 100 caracteres.
 *
 * Si la validación pasa, deja pasar la solicitud al controller.
 * Si falla, responde con 400 y un arreglo de errores.
 */
const validarActualizarEstado = (req, res, next) => {
    const { estado, estado_actual, comentarios_vendedor } = req.body;
    const errores = [];

    // ── estado (nuevo) ───────────────────────────────────────
    if (!estado || !estado.toString().trim()) {
        errores.push('El campo estado es requerido.');
    } else if (!ESTADOS_VALIDOS.includes(estado.toString().trim())) {
        errores.push(`El estado '${estado}' no es válido. Estados permitidos: ${ESTADOS_VALIDOS.join(', ')}.`);
    }

    // ── transición permitida ─────────────────────────────────
    // Se valida solo si ambos estados son valores reconocidos
    if (estado && estado_actual) {
        const estadoNuevo  = estado.toString().trim();
        const estadoActual = estado_actual.toString().trim();
        const permitidos   = TRANSICIONES_VALIDAS[estadoActual];

        if (permitidos !== undefined && !permitidos.includes(estadoNuevo)) {
            errores.push(
                permitidos.length === 0
                    ? `El pedido en estado '${estadoActual}' ya es un estado final y no puede modificarse.`
                    : `No se puede cambiar de '${estadoActual}' a '${estadoNuevo}'. Transiciones permitidas: ${permitidos.join(', ')}.`
            );
        }
    }

    // ── comentarios_vendedor (opcional) ──────────────────────
    if (comentarios_vendedor !== undefined && comentarios_vendedor !== null) {
        const comentarioLimpio = comentarios_vendedor.toString().trim();
        if (comentarioLimpio.length > 100) {
            errores.push('Los comentarios del vendedor no pueden superar los 100 caracteres.');
        }
        req.body.comentarios_vendedor = comentarioLimpio || null;
    }

    if (errores.length > 0) {
        return res.status(400).json({ errores });
    }

    // Normalizar el estado limpio de vuelta al body
    req.body.estado = estado.toString().trim();

    next();
};


/**
 * Valida el body al agregar o editar el comentario interno del vendedor
 * (PATCH /api/pedidos/:id/comentario). Solo Vendedor y Admin pueden usarlo.
 *
 * Campos esperados en req.body:
 *   - comentario {string} Requerido. Texto de la nota interna. Máximo 100 caracteres.
 *
 * Si la validación pasa, deja pasar la solicitud al controller.
 * Si falla, responde con 400 y un arreglo de errores.
 */
const validarComentario = (req, res, next) => {
    const { comentario } = req.body;
    const errores = [];

    // ── comentario ───────────────────────────────────────────
    if (comentario === undefined || comentario === null || !comentario.toString().trim()) {
        errores.push('El campo comentario es requerido.');
    } else {
        const comentarioLimpio = comentario.toString().trim();
        if (comentarioLimpio.length > 100) {
            errores.push('El comentario no puede superar los 100 caracteres.');
        }
        // Escribir el valor limpio de vuelta para que el controller lo use
        req.body.comentario = comentarioLimpio;
    }

    if (errores.length > 0) {
        return res.status(400).json({ errores });
    }

    next();
};


module.exports = {
    validarCrearPedido,
    validarActualizarEstado,
    validarComentario,
};
