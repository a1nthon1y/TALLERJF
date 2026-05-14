const pool = require("../config/db");

// Reporte de todos los mantenimientos con detalles, filtrable por dueño
const getMaintenanceReport = async (req, res) => {
  try {
    const { duenoId } = req.query;

    let query = `
      SELECT 
        m.id AS mantenimiento_id,
        u.placa AS unidad,
        u.modelo,
        us2.nombre AS dueno_nombre,
        m.tipo,
        m.estado,
        m.fecha_solicitud,
        m.fecha_realizacion,
        m.observaciones,
        t.nombre AS tecnico_nombre
      FROM mantenimientos m
      JOIN unidades u ON m.unidad_id = u.id
      LEFT JOIN duenos d ON u.dueno_id = d.id
      LEFT JOIN usuarios us2 ON d.usuario_id = us2.id
      LEFT JOIN tecnicos t ON m.tecnico_id = t.id
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
    res.status(500).json({ error: "Error al obtener reporte de mantenimientos" });
  }
};

// Reporte del OWNER autenticado: historial de mantenimientos con materiales y costos
const getMyUnitsReport = async (req, res) => {
  try {
    const usuario_id = req.user.id;

    const duenoPQuery = await pool.query(
      "SELECT id FROM duenos WHERE usuario_id = $1",
      [usuario_id]
    );
    if (duenoPQuery.rows.length === 0) {
      return res.status(404).json({ message: "No se encontró perfil de dueño asociado a tu usuario." });
    }
    const dueno_id = duenoPQuery.rows[0].id;

    const result = await pool.query(
      `SELECT 
         m.id AS mantenimiento_id,
         u.placa AS unidad,
         u.modelo,
         m.tipo,
         m.estado,
         m.fecha_solicitud,
         m.fecha_realizacion,
         m.observaciones,
         m.kilometraje_actual,
         t.nombre AS tecnico_nombre,
         COALESCE(mat_resumen.costo_total, 0) AS costo_total,
         COALESCE(mat_resumen.materiales, '[]'::json) AS materiales
       FROM mantenimientos m
       JOIN unidades u ON m.unidad_id = u.id
       LEFT JOIN tecnicos t ON m.tecnico_id = t.id
       LEFT JOIN (
         SELECT dm.mantenimiento_id,
                json_agg(json_build_object(
                  'nombre', mat.nombre,
                  'cantidad', dm.cantidad,
                  'precio_unitario', mat.precio,
                  'costo_total', dm.costo_total
                )) AS materiales,
                SUM(dm.costo_total) AS costo_total
         FROM detalles_mantenimiento dm
         JOIN materiales mat ON dm.material_id = mat.id
         GROUP BY dm.mantenimiento_id
       ) mat_resumen ON mat_resumen.mantenimiento_id = m.id
       WHERE u.dueno_id = $1
       ORDER BY m.fecha_solicitud DESC`,
      [dueno_id]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener reporte del dueño" });
  }
};

// Reporte exclusivo para el Chofer logueado (sólo ve su unidad actual)
const getMyUnitReports = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const choferQuery = await pool.query("SELECT id FROM choferes WHERE usuario_id = $1", [usuario_id]);
    if (choferQuery.rows.length === 0) return res.status(403).json({ message: "No se encontró perfil de chofer asociado a tu usuario." });
    const chofer_id = choferQuery.rows[0].id;

    const unidadQuery = await pool.query("SELECT id, placa FROM unidades WHERE chofer_id = $1", [chofer_id]);
    if (unidadQuery.rows.length === 0) return res.status(404).json({ message: "No tienes ninguna unidad asignada actualmente." });

    const result = await pool.query(
      `SELECT m.id AS mantenimiento_id, u.placa AS unidad, m.tipo, m.estado,
              m.fecha_solicitud, m.fecha_realizacion, m.observaciones, m.kilometraje_actual,
              t.nombre AS tecnico_nombre,
              COALESCE(mat_resumen.nombres_materiales, '') AS materiales_usados
       FROM mantenimientos m
       JOIN unidades u ON m.unidad_id = u.id
       LEFT JOIN tecnicos t ON m.tecnico_id = t.id
       LEFT JOIN (
         SELECT dm.mantenimiento_id,
                STRING_AGG(mat.nombre, ', ') AS nombres_materiales
         FROM detalles_mantenimiento dm
         JOIN materiales mat ON dm.material_id = mat.id
         GROUP BY dm.mantenimiento_id
       ) mat_resumen ON mat_resumen.mantenimiento_id = m.id
       WHERE m.unidad_id = $1
       ORDER BY m.fecha_solicitud DESC`,
      [unidadQuery.rows[0].id]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener reporte del chofer" });
  }
};

module.exports = {
  getMaintenanceReport,
  getMyUnitsReport,
  getMyUnitReports,
};
