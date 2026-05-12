const pool = require("../config/db");

// ===================================
// 🛠 Obtener todas las configuraciones predictivas
// ===================================
const getPartConfigs = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM configuracion_partes ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error obteniendo configs:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ===================================
// 🔧 Crear nueva regla de mantenimiento
// ===================================
const createPartConfig = async (req, res) => {
  try {
    const { nombre, umbral_km } = req.body;
    const result = await pool.query(
      "INSERT INTO configuracion_partes (nombre, umbral_km) VALUES ($1, $2) RETURNING *",
      [nombre, umbral_km]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creando config:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ===================================
// 📝 Editar regla de mantenimiento
// Si activo=false y ?resolveAlerts=true, también marca las alertas
// activas vinculadas como RESUELTO (limpieza de inconsistencias)
// ===================================
const updatePartConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { umbral_km, activo } = req.body;
    const resolveAlerts = req.query.resolveAlerts === "true";

    const result = await pool.query(
      "UPDATE configuracion_partes SET umbral_km = $1, activo = $2 WHERE id = $3 RETURNING *",
      [umbral_km, activo, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Config no encontrado " });

    let alertasResueltas = 0;
    if (activo === false && resolveAlerts) {
      const r = await pool.query(
        "UPDATE alertas_mantenimiento SET estado = 'RESUELTO' WHERE parte_id = $1 AND estado = 'ACTIVO'",
        [id]
      );
      alertasResueltas = r.rowCount || 0;
    }

    res.json({ ...result.rows[0], alertas_resueltas: alertasResueltas });
  } catch (error) {
    console.error("Error actualizando config:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ===================================
// 📊 Resumen de impacto de una configuración (cuántas alertas/mantenimientos la usan)
// ===================================
const getPartConfigImpact = async (req, res) => {
  try {
    const { id } = req.params;
    const [alerts, maints] = await Promise.all([
      pool.query(
        "SELECT COUNT(*)::int AS count FROM alertas_mantenimiento WHERE parte_id = $1 AND estado = 'ACTIVO'",
        [id]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM mantenimientos
         WHERE estado IN ('PENDIENTE','EN_PROCESO')
         AND partes_programadas::jsonb @> $1::jsonb`,
        [JSON.stringify([Number(id)])]
      ),
    ]);
    res.json({
      alertas_activas: alerts.rows[0].count,
      mantenimientos_en_curso: maints.rows[0].count,
    });
  } catch (error) {
    console.error("Error obteniendo impacto:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ===================================
// 🗑 Eliminar regla de mantenimiento
// ===================================
const deletePartConfig = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que no tenga alertas activas vinculadas
    const alertas = await pool.query(
      "SELECT 1 FROM alertas_mantenimiento WHERE parte_id = $1 AND estado != 'RESUELTO' LIMIT 1",
      [id]
    );
    if (alertas.rows.length > 0) {
      return res.status(409).json({
        error: "No se puede eliminar: hay alertas activas para esta parte. Resuélvelas primero.",
      });
    }

    // Eliminar estado_partes_unidad relacionado
    await pool.query("DELETE FROM estado_partes_unidad WHERE configuracion_parte_id = $1", [id]);

    const result = await pool.query(
      "DELETE FROM configuracion_partes WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }
    res.json({ message: "Regla eliminada correctamente" });
  } catch (error) {
    console.error("Error eliminando config:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = {
  getPartConfigs,
  createPartConfig,
  updatePartConfig,
  deletePartConfig,
  getPartConfigImpact,
};
