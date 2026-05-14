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
    const nuevaConfig = result.rows[0];

    // Backfill: inicializar baseline predictivo para TODAS las unidades existentes,
    // tomando como ultimo_mantenimiento_km el km actual de cada unidad. Sin esto,
    // /partes-unidades mostraría "Vencido +X km" inmediato en cada unidad para una
    // regla recién agregada (porque COALESCE(epu.ultimo_mantenimiento_km, 0) = 0).
    await pool.query(
      `INSERT INTO estado_partes_unidad
         (unidad_id, configuracion_parte_id, ultimo_mantenimiento_km, ultimo_mantenimiento_fecha)
       SELECT u.id, $1, COALESCE(u.kilometraje, 0), NOW()
       FROM unidades u
       ON CONFLICT (unidad_id, configuracion_parte_id) DO NOTHING`,
      [nuevaConfig.id]
    );

    res.status(201).json(nuevaConfig);
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
    if (result.rows.length === 0) return res.status(404).json({ message: "Regla predictiva no encontrada." });

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
        message: "No se puede eliminar la regla: hay alertas activas asociadas. Resuélvelas primero o desactívala con la opción 'Resolver alertas'.",
      });
    }

    await pool.query("DELETE FROM estado_partes_unidad WHERE configuracion_parte_id = $1", [id]);

    const result = await pool.query(
      "DELETE FROM configuracion_partes WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Regla predictiva no encontrada." });
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
