const pool = require("../config/db");

// GET /units/:id/parts-status
// Retorna el estado predictivo de cada parte configurada para una unidad
const getPartsStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const unidadCheck = await pool.query("SELECT id, kilometraje FROM unidades WHERE id = $1", [id]);
    if (unidadCheck.rows.length === 0) {
      return res.status(404).json({ message: "Unidad no encontrada" });
    }

    const result = await pool.query(
      `SELECT
         cp.id,
         cp.nombre,
         cp.umbral_km,
         COALESCE(epu.ultimo_mantenimiento_km, 0) AS ultimo_mantenimiento_km,
         COALESCE(epu.ultimo_mantenimiento_fecha, NULL) AS ultimo_mantenimiento_fecha,
         u.kilometraje AS km_actual,
         (u.kilometraje - COALESCE(epu.ultimo_mantenimiento_km, 0)) AS km_recorridos,
         ROUND(
           LEAST(
             ((u.kilometraje - COALESCE(epu.ultimo_mantenimiento_km, 0))::float / cp.umbral_km * 100),
             100
           )::numeric,
           1
         ) AS porcentaje
       FROM configuracion_partes cp
       CROSS JOIN unidades u
       LEFT JOIN estado_partes_unidad epu
         ON epu.configuracion_parte_id = cp.id AND epu.unidad_id = u.id
       WHERE u.id = $1 AND cp.activo = TRUE
       ORDER BY porcentaje DESC NULLS LAST`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getPartsStatus };
