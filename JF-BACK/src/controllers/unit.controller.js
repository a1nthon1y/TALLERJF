const pool = require("../config/db");

// ===================================================================
//  ✅ Crear una unidad
// ===================================================================
const createUnit = async (req, res) => {
  try {
    const { placa, modelo, año, tipo, chofer_id, kilometraje, dueno_id } = req.body;

    const tipoNorm = tipo?.toUpperCase();
    if (!placa || !modelo || !año || !tipoNorm) {
      return res.status(400).json({ message: "Faltan campos obligatorios (placa, modelo, año, tipo)" });
    }

    const result = await pool.query(
      `INSERT INTO unidades (placa, modelo, año, tipo, chofer_id, kilometraje, dueno_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [placa, modelo, año, tipoNorm, chofer_id || null, kilometraje || 0, dueno_id || null]
    );

    res.status(201).json({
      message: "Unidad creada correctamente",
      unidad: result.rows[0],
    });
  } catch (error) {
    console.error("Error al crear unidad:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ✅ Obtener todas las unidades con datos del dueño y chofer
const getAllUnits = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.placa, u.modelo, u.año, u.tipo, u.kilometraje, u.activo, u.creado_en,
        d.id AS dueno_id,
        us2.nombre AS dueno_nombre,
        us2.correo AS dueno_correo,
        d.telefono AS dueno_telefono,
        us.id AS chofer_usuario_id, us.nombre AS chofer_nombre, us.correo AS chofer_correo
      FROM unidades u
      LEFT JOIN duenos d ON u.dueno_id = d.id
      LEFT JOIN choferes c ON u.chofer_id = c.id
      LEFT JOIN usuarios us ON c.usuario_id = us.id
      LEFT JOIN usuarios us2 ON d.usuario_id = us2.id
      ORDER BY u.activo DESC, u.creado_en DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener unidades:", error);
    res.status(500).json({ error: "Error al obtener unidades" });
  }
};

// ===================================================================
//  ⚡🔥 Consulta MEJORADA: Obtener unidades por ID de dueño
// ===================================================================
const getUnitsByOwner = async (req, res) => {
  try {
    const { duenoId } = req.params;

    const result = await pool.query(
      `
      SELECT 
        u.id, u.placa, u.modelo, u.año, u.tipo, u.kilometraje, u.creado_en,

        -- datos del dueño
        d.id AS dueno_id,
        us2.nombre AS dueno_nombre,
        us2.correo AS dueno_correo,
        d.telefono AS dueno_telefono,

        -- datos del chofer
        c.id AS chofer_id,
        us.nombre AS chofer_nombre,
        us.correo AS chofer_correo

      FROM unidades u
      LEFT JOIN duenos d ON u.dueno_id = d.id
      LEFT JOIN usuarios us2 ON d.usuario_id = us2.id

      LEFT JOIN choferes c ON u.chofer_id = c.id
      LEFT JOIN usuarios us ON c.usuario_id = us.id
      
      WHERE u.dueno_id = $1
      ORDER BY u.creado_en DESC
      `,
      [duenoId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener unidades por dueño:", error);
    res.status(500).json({ error: "Error al obtener unidades por dueño" });
  }
};

// ===================================================================
//  ⚡🔥 Consulta MEJORADA: Obtener una unidad por ID
// ===================================================================
const getUnitById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        u.id, u.placa, u.modelo, u.año, u.tipo, u.kilometraje, 
        u.creado_en,

        -- dueño
        d.id AS dueno_id,
        us2.nombre AS dueno_nombre,
        us2.correo AS dueno_correo,
        d.telefono AS dueno_telefono,

        -- chofer
        c.id AS chofer_id,
        us.nombre AS chofer_nombre,
        us.correo AS chofer_correo,
        c.licencia,
        c.telefono AS chofer_telefono

      FROM unidades u
      LEFT JOIN duenos d ON u.dueno_id = d.id
      LEFT JOIN usuarios us2 ON d.usuario_id = us2.id

      LEFT JOIN choferes c ON u.chofer_id = c.id
      LEFT JOIN usuarios us ON c.usuario_id = us.id

      WHERE u.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Unidad no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener unidad:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ===================================================================
//  🔧 Actualizar una unidad
// ===================================================================
const updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { placa, modelo, año, tipo, chofer_id, kilometraje, dueno_id } = req.body;

    const result = await pool.query(
      `
      UPDATE unidades 
      SET placa = $1, modelo = $2, año = $3, tipo = $4, chofer_id = $5,
          kilometraje = $6, dueno_id = $7
      WHERE id = $8
      RETURNING *
      `,
      [placa, modelo, año, tipo?.toUpperCase(), chofer_id || null, kilometraje || 0, dueno_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Unidad no encontrada" });
    }

    res.json({
      message: "Unidad actualizada correctamente",
      unidad: result.rows[0],
    });
  } catch (error) {
    console.error("Error al actualizar unidad:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ===================================================================
//  🔁 Reasignar dueño de una unidad (sin tocar otros campos)
// ===================================================================
const reassignOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const { dueno_id } = req.body; // null = dejar sin dueño

    const unitCheck = await pool.query("SELECT id, placa FROM unidades WHERE id = $1", [id]);
    if (unitCheck.rows.length === 0) {
      return res.status(404).json({ message: "Unidad no encontrada" });
    }

    if (dueno_id != null) {
      const ownerCheck = await pool.query("SELECT id FROM duenos WHERE id = $1", [dueno_id]);
      if (ownerCheck.rows.length === 0) {
        return res.status(404).json({ message: "Dueño no encontrado" });
      }
    }

    const result = await pool.query(
      "UPDATE unidades SET dueno_id = $1 WHERE id = $2 RETURNING *",
      [dueno_id || null, id]
    );

    res.json({
      message: dueno_id ? "Dueño asignado correctamente" : "Dueño removido de la unidad",
      unidad: result.rows[0],
    });
  } catch (error) {
    console.error("Error al reasignar dueño:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ===================================================================
//  🔄 Activar / Desactivar unidad (soft disable)
// ===================================================================
const toggleUnitStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const unitCheck = await pool.query("SELECT placa, activo FROM unidades WHERE id = $1", [id]);
    if (unitCheck.rows.length === 0) {
      return res.status(404).json({ message: "Unidad no encontrada" });
    }

    const { placa, activo } = unitCheck.rows[0];

    const result = await pool.query(
      "UPDATE unidades SET activo = $1 WHERE id = $2 RETURNING activo",
      [!activo, id]
    );

    const nuevoEstado = result.rows[0].activo ? "activada" : "desactivada";
    res.json({ message: `Unidad ${placa} ${nuevoEstado} correctamente`, activo: result.rows[0].activo });
  } catch (error) {
    console.error("Error al cambiar estado de unidad:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

//  🗑 Eliminar unidad
// ===================================================================
const deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la unidad existe
    const unitCheck = await pool.query("SELECT placa FROM unidades WHERE id = $1", [id]);
    if (unitCheck.rows.length === 0) {
      return res.status(404).json({ message: "Unidad no encontrada" });
    }

    // Bloquear si tiene mantenimientos activos (PENDIENTE o EN_PROCESO)
    const activeCheck = await pool.query(
      `SELECT COUNT(*) FROM mantenimientos
       WHERE unidad_id = $1 AND estado IN ('PENDIENTE','EN_PROCESO')`,
      [id]
    );
    if (parseInt(activeCheck.rows[0].count) > 0) {
      return res.status(400).json({
        message: `No se puede eliminar la unidad ${unitCheck.rows[0].placa}: tiene ${activeCheck.rows[0].count} mantenimiento(s) activo(s). Ciérralos antes de eliminar la unidad.`,
      });
    }

    // Advertir si tiene historial (pero permitir si todos están cerrados)
    const historyCheck = await pool.query(
      "SELECT COUNT(*) FROM mantenimientos WHERE unidad_id = $1",
      [id]
    );
    if (parseInt(historyCheck.rows[0].count) > 0) {
      return res.status(400).json({
        message: `No se puede eliminar la unidad ${unitCheck.rows[0].placa}: tiene ${historyCheck.rows[0].count} registro(s) de mantenimiento en su historial. Elimina primero esos registros desde la sección Mantenimientos.`,
      });
    }

    await pool.query("DELETE FROM estado_partes_unidad WHERE unidad_id = $1", [id]);
    await pool.query("DELETE FROM alertas_mantenimiento WHERE unidad_id = $1", [id]);
    await pool.query("DELETE FROM unidades WHERE id = $1", [id]);

    res.json({ message: "Unidad eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar unidad:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// Unidades del OWNER autenticado (busca dueno por usuario_id del token)
const getMyUnits = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const duenoPQuery = await pool.query(
      "SELECT id FROM duenos WHERE usuario_id = $1",
      [usuario_id]
    );
    if (duenoPQuery.rows.length === 0) {
      return res.status(404).json({ error: "No se encontró perfil de dueño para este usuario" });
    }
    const dueno_id = duenoPQuery.rows[0].id;

    const result = await pool.query(
      `SELECT 
         u.id, u.placa, u.modelo, u.año, u.tipo, u.kilometraje, u.creado_en,
         c.id AS chofer_id,
         us.nombre AS chofer_nombre,
         us.correo AS chofer_correo
       FROM unidades u
       LEFT JOIN choferes c ON u.chofer_id = c.id
       LEFT JOIN usuarios us ON c.usuario_id = us.id
       WHERE u.dueno_id = $1
       ORDER BY u.placa`,
      [dueno_id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener tus unidades" });
  }
};

module.exports = {
  createUnit,
  getAllUnits,
  getUnitsByOwner,
  getUnitById,
  updateUnit,
  reassignOwner,
  toggleUnitStatus,
  deleteUnit,
  getMyUnits,
};
