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

// Reporte exclusivo para el Chofer logueado (sólo ve su unidad actual)
const getMyUnitReports = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const choferQuery = await pool.query("SELECT id FROM choferes WHERE usuario_id = $1", [usuario_id]);
    if (choferQuery.rows.length === 0) return res.status(403).json({ error: "Rol inválido o chofer no encontrado" });
    const chofer_id = choferQuery.rows[0].id;

    const unidadQuery = await pool.query("SELECT id, placa FROM unidades WHERE chofer_id = $1", [chofer_id]);
    if (unidadQuery.rows.length === 0) return res.status(404).json({ error: "No tienes unidad asignada" });
    
    const result = await pool.query(`
      SELECT m.id AS mantenimiento_id, u.placa AS unidad, m.tipo, m.estado, 
             m.fecha_solicitud, m.fecha_realizacion, m.observaciones
      FROM mantenimientos m
      JOIN unidades u ON m.unidad_id = u.id
      WHERE m.unidad_id = $1
      ORDER BY m.fecha_solicitud DESC
    `, [unidadQuery.rows[0].id]);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getMaintenanceReport,
  getMaterialUsageReport,
  getCostReport,
  getUnitsByOwnerReport,
  getMyUnitReports,
};
