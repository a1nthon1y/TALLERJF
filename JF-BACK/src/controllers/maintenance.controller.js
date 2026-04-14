const pool = require("../config/db");

// Registrar un mantenimiento (preventivo o correctivo) con kilometraje
const createMaintenance = async (req, res) => {
  try {
    const { unidad_id, tipo, observaciones, kilometraje_actual } = req.body;

    // Verificar si la unidad existe
    const unidad = await pool.query("SELECT * FROM unidades WHERE id = $1", [unidad_id]);
    if (unidad.rows.length === 0) {
      return res.status(404).json({ message: "Unidad no encontrada" });
    }

    // Registrar el mantenimiento
    const result = await pool.query(
      `INSERT INTO mantenimientos (unidad_id, tipo, observaciones, kilometraje_actual) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [unidad_id, tipo, observaciones, kilometraje_actual]
    );

    // Actualizar el kilometraje de la unidad
    await pool.query(
      `UPDATE unidades SET kilometraje = $1 WHERE id = $2`,
      [kilometraje_actual, unidad_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener todos los mantenimientos
const getAllMaintenances = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM mantenimientos ORDER BY fecha_solicitud DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener un mantenimiento por ID
const getMaintenanceById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query("SELECT * FROM mantenimientos WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Mantenimiento no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Actualizar estado de un mantenimiento (ejemplo: completado)
const updateMaintenanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const result = await pool.query(
      `UPDATE mantenimientos SET estado = $1, fecha_realizacion = NOW() 
       WHERE id = $2 RETURNING *`,
      [estado, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Mantenimiento no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createMaintenance,
  getAllMaintenances,
  getMaintenanceById,
  updateMaintenanceStatus,
};
