const pool = require("../config/db");

// 🔹 Crear una parte para una unidad
const createPart = async (req, res) => {
    try {
        const { unidad_id, nombre, kilometraje_mantenimiento } = req.body;

        // Validación de datos
        if (!unidad_id || !nombre || !kilometraje_mantenimiento) {
            return res.status(400).json({ error: "Todos los campos son obligatorios." });
        }

        // Insertar parte en la base de datos
        const result = await pool.query(
            `INSERT INTO partes_unidades (unidad_id, nombre, kilometraje_mantenimiento, ultimo_mantenimiento_km) 
             VALUES ($1, $2, $3, 0) RETURNING *`,
            [unidad_id, nombre, kilometraje_mantenimiento]
        );

        res.status(201).json({ message: "Parte registrada exitosamente.", data: result.rows[0] });
    } catch (error) {
        console.error("Error al crear parte:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};

// 🔹 Obtener todas las partes registradas
const getAllParts = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM partes_unidades");

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "No hay partes registradas." });
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error al obtener partes:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};

// 🔹 Obtener las partes de una unidad específica
const getPartsByUnit = async (req, res) => {
    try {
        const { unidadId } = req.params;

        // Verificar que unidadId sea un número válido
        if (isNaN(unidadId)) {
            return res.status(400).json({ error: "El ID de la unidad debe ser un número válido." });
        }

        const result = await pool.query("SELECT * FROM partes_unidades WHERE unidad_id = $1", [unidadId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "No se encontraron partes para esta unidad." });
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error al obtener partes de la unidad:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};

module.exports = {
    createPart,
    getAllParts,
    getPartsByUnit
};
