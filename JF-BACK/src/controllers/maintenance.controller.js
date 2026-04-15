const pool = require("../config/db");

// Registrar un mantenimiento (preventivo o correctivo) con kilometraje y TECNICO
const createMaintenance = async (req, res) => {
  try {
    const { unidad_id, tipo, observaciones, kilometraje_actual, tecnico_id } = req.body;

    // Verificar si la unidad existe
    const unidad = await pool.query("SELECT * FROM unidades WHERE id = $1", [unidad_id]);
    if (unidad.rows.length === 0) {
      return res.status(404).json({ message: "Unidad no encontrada" });
    }

    // Registrar el mantenimiento incluyendo el tecnico_id
    const result = await pool.query(
      `INSERT INTO mantenimientos (unidad_id, tipo, observaciones, kilometraje_actual, tecnico_id) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [unidad_id, tipo, observaciones, kilometraje_actual, tecnico_id || null]
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

// Actualizar estado de un mantenimiento (ejemplo: completado) y RESETEAR contadores
const updateMaintenanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, partes_reparadas, tecnico_id } = req.body;

    const mantQuery = await pool.query("SELECT * FROM mantenimientos WHERE id = $1", [id]);
    if (mantQuery.rows.length === 0) return res.status(404).json({ message: "Mantenimiento no encontrado" });
    const m = mantQuery.rows[0];

    const estadoNorm = estado?.toUpperCase();

    // Validar que tecnico_id sea obligatorio al completar
    if (estadoNorm === "COMPLETADO" && !tecnico_id) {
      return res.status(400).json({ message: "tecnico_id es obligatorio para marcar como COMPLETADO" });
    }

    const result = await pool.query(
      `UPDATE mantenimientos 
       SET estado = $1, fecha_realizacion = NOW(), tecnico_id = COALESCE($3, tecnico_id)
       WHERE id = $2 RETURNING *`,
      [estadoNorm, id, tecnico_id || null]
    );

    // CASUÍSTICA 3: Si se completó la reparación e indicaron piezas cambiadas, resetear sus predicciones
    if (estadoNorm === "COMPLETADO" && partes_reparadas && partes_reparadas.length > 0) {
       for (let p_id of partes_reparadas) {
         await pool.query(
           `INSERT INTO estado_partes_unidad (unidad_id, configuracion_parte_id, ultimo_mantenimiento_km, ultimo_mantenimiento_fecha)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (unidad_id, configuracion_parte_id) 
            DO UPDATE SET ultimo_mantenimiento_km = EXCLUDED.ultimo_mantenimiento_km, ultimo_mantenimiento_fecha = NOW()`,
           [m.unidad_id, p_id, m.kilometraje_actual || 0]
         );
         
         // Limpiar alertas
         await pool.query(
            `UPDATE alertas_mantenimiento SET estado = 'RESUELTO' 
             WHERE unidad_id = $1 AND parte_id = $2`,
            [m.unidad_id, p_id]
         );
       }
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener mantenimientos filtrados por unidad (usado por chofer y owner)
const getMaintenancesByUnit = async (req, res) => {
  try {
    const { unidadId } = req.params;
    const result = await pool.query(
      `SELECT m.*, u.placa, t.nombre AS tecnico_nombre
       FROM mantenimientos m
       JOIN unidades u ON m.unidad_id = u.id
       LEFT JOIN tecnicos t ON m.tecnico_id = t.id
       WHERE m.unidad_id = $1
       ORDER BY m.fecha_solicitud DESC`,
      [unidadId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener mantenimientos de la unidad" });
  }
};

module.exports = {
  createMaintenance,
  getAllMaintenances,
  getMaintenanceById,
  updateMaintenanceStatus,
  getMaintenancesByUnit,
};
