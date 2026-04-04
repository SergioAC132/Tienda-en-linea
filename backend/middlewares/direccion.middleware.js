const ESTADOS_MEXICO = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
    'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero',
    'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla',
    'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas',
    'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
];

const limpiarTexto = (valor) => valor?.toString().trim();

const limpiarNumero = (valor) => String(valor).replace(/#/g, '').trim();

const validarDireccion = (req, res, next) => {
    let { calle, numeroExterior, numeroInterior, colonia, ciudad, estado, codigoPostal, pais, referencias } = req.body;

    // Limpiar espacios de campos de texto
    calle = limpiarTexto(calle);
    numeroInterior = limpiarTexto(numeroInterior);
    colonia = limpiarTexto(colonia);
    ciudad = limpiarTexto(ciudad);
    estado = limpiarTexto(estado);
    codigoPostal = limpiarTexto(codigoPostal);
    pais = limpiarTexto(pais);
    referencias = limpiarTexto(referencias);


    const errores = [];

    // Campos obligatorios no vacíos
    const camposRequeridos = { calle, numeroExterior, colonia, ciudad, estado, codigoPostal, pais };
    for (const [campo, valor] of Object.entries(camposRequeridos)) {
        if (!valor || !valor.toString().trim()) {
            errores.push(`El campo ${campo} es requerido.`);
        }
    }

    // Número exterior: limpiar # y validar que sean solo dígitos
    const extLimpio = limpiarNumero(numeroExterior);
    if (numeroExterior && !/^\d+$/.test(extLimpio))
        errores.push('El número exterior solo debe contener dígitos.');

    // Código postal: exactamente 5 dígitos
    if (codigoPostal && !/^\d{5}$/.test(codigoPostal))
        errores.push('Ingresa un código postal válido (5 dígitos).');

    // Estado dentro de los 32 de México
    if (estado && !ESTADOS_MEXICO.includes(estado))
        errores.push(`El estado ${estado} no es válido.`);

    if (errores.length > 0)
        return res.status(400).json({ errores });

    // Escribir valores ya limpios de vuelta en req.body para el controller
    req.body.calle = calle;
    req.body.colonia = colonia;
    req.body.ciudad = ciudad;
    req.body.estado = estado;
    req.body.codigoPostal = codigoPostal;
    req.body.pais = pais;
    req.body.numeroExterior = extLimpio;
    req.body.referencias = referencias;
    req.body.numeroInterior = numeroInterior;

    next();
};

module.exports = { validarDireccion };
