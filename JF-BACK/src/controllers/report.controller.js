const pool = require("../config/db");

// Reporte de todos los mantenimientos con detalles, filtrable por dueño
const getMaintenanceReport = async (req, res) => {
  try {
    const { duenoId } = req.query; // Parámetro opcional

    let query = `
      SELECT 
        m.id AS mantenimiento_id,
        u.placa AS unidad,
        u.modelo,
        d.nombre AS dueno_nombre,
        d.apellido AS dueno_apellido,
        m.tipo,
        m.estado,
        m.fecha_solicitud,
        m.fecha_realizacion,
        m.observaciones
      FROM mantenimientos m
      JOIN unidades u ON m.unidad_id = u.id
      LEFT JOIN duenos d ON u.dueno_id = d.id
    `;

    const params = [];

    if (duenoId) {
      query += " WHERE u.dueno_id = $1";
      params.push(duenoId);
    }

    query += " ORDER BY m.fecha_solicitud DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reporte de materiales utilizados en mantenimientos, filtrable por dueño
const getMaterialUsageReport = async (req, res) => {
  try {
    const { duenoId } = req.query; // Parámetro opcional

    let query = `
      SELECT 
        m.nombre AS material,
        SUM(dm.cantidad) AS cantidad_usada,
        SUM(dm.costo_total) AS costo_total,
        u.placa AS unidad,
        d.nombre AS dueno_nombre,
        d.apellido AS dueno_apellido
      FROM detalles_mantenimiento dm
      JOIN materiales m ON dm.material_id = m.id
      JOIN mantenimientos mt ON dm.mantenimiento_id = mt.id
      JOIN unidades u ON mt.unidad_id = u.id
      LEFT JOIN duenos d ON u.dueno_id = d.id
    `;

    const params = [];

    if (duenoId) {
      query += " WHERE u.dueno_id = $1";
      params.push(duenoId);
    }

    query += " GROUP BY m.nombre, u.placa, d.nombre, d.apellido ORDER BY cantidad_usada DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reporte de costos de mantenimiento por unidad, filtrable por dueño
const getCostReport = async (req, res) => {
  try {
    const { duenoId } = req.query; // Parámetro opcional

    let query = `
      SELECT 
        u.placa AS unidad,
        u.modelo,
        d.nombre AS dueno_nombre,
        d.apellido AS dueno_apellido,
        SUM(dm.costo_total) AS costo_total
      FROM mantenimientos m
      JOIN unidades u ON m.unidad_id = u.id
      LEFT JOIN duenos d ON u.dueno_id = d.id
      JOIN detalles_mantenimiento dm ON m.id = dm.mantenimiento_id
    `;

    const params = [];

    if (duenoId) {
      query += " WHERE u.dueno_id = $1";
      params.push(duenoId);
    }

    query += " GROUP BY u.placa, u.modelo, d.nombre, d.apellido ORDER BY costo_total DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reporte de unidades por dueño (nuevo)
const getUnitsByOwnerReport = async (req, res) => {
  try {
    const { duenoId } = req.params;

    const result = await pool.query(
      `SELECT * FROM unidades WHERE dueno_id = $1`,
      [duenoId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getMaintenanceReport,
  getMaterialUsageReport,
  getCostReport,
  getUnitsByOwnerReport, // Nuevo reporte agregado
};
