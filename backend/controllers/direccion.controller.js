const { findDireccionesByUser, createDireccion, updateDireccion } = require('../models/direccion.model');

/* GET /api/direcciones/ */
const getDirecciones = async (req, res) => {
    try {
        const idUsuario = req.usuario.id_usuario;
        const direcciones = await findDireccionesByUser(idUsuario);
        res.json(direcciones);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener direcciones', error: error.message });
    }
};


/* POST /api/direcciones/
   Body: { calle, numeroExterior, numeroInterior, colonia, ciudad, estado, codigoPostal,
           pais, referencias, principal } */
const crearDireccion = async (req, res) => {
    const { calle, numeroExterior, numeroInterior, colonia, ciudad, estado,
            codigoPostal, pais, referencias, principal } = req.body;
    try {
        const idUsuario = req.usuario.id_usuario;
        const nueva = await createDireccion({ idUsuario, calle, numeroExterior, numeroInterior, colonia, ciudad,
                                              estado, codigoPostal, pais, referencias, principal });
        res.status(201).json(nueva);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear dirección', error: error.message });
    }
};


/* PUT /api/direcciones/:idDireccion
   Body: { calle, numeroExterior, numeroInterior, colonia, ciudad, estado, codigoPostal,
           pais, referencias, principal } */
const modificarDireccion = async (req, res) => {
    const { calle, numeroExterior, numeroInterior, colonia, ciudad, estado,
            codigoPostal, pais, referencias, principal } = req.body;
    try {
        const { idDireccion } = req.params;
        const idUsuario = req.usuario.id_usuario;
        const actualizada = await updateDireccion(idDireccion, idUsuario, { calle, numeroExterior, numeroInterior,
                                                                             colonia, ciudad, estado, codigoPostal,
                                                                             pais, referencias, principal });
        if (!actualizada)
            return res.status(404).json({ message: 'Dirección no encontrada o no pertenece al usuario.' });

        res.json(actualizada);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar dirección', error: error.message });
    }
};

module.exports = {
    getDirecciones,
    crearDireccion,
    modificarDireccion,
};
