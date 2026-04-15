const pool = require("../config/db");

// ===================================================================
//  ✅ Crear una unidad
// ===================================================================
const createUnit = async (req, res) => {
  try {
    const { placa, modelo, año, tipo, chofer_id, kilometraje, dueno_id } = req.body;

    if (!placa || !modelo || !año || !tipo || !dueno_id) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    const result = await pool.query(
      `INSERT INTO unidades (placa, modelo, año, tipo, chofer_id, kilometraje, dueno_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [placa, modelo, año, tipo, chofer_id || null, kilometraje || 0, dueno_id]
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
        u.id, u.placa, u.modelo, u.año, u.tipo, u.kilometraje, u.creado_en,
        d.id AS dueno_id,us2.nombre,us2.correo AS correo_dueno, d.telefono AS telefono_dueno,
        us.id AS chofer_usuario_id, us.nombre AS chofer_nombre, us.correo AS chofer_correo
      FROM unidades u
      LEFT JOIN duenos d ON u.dueno_id = d.id
      LEFT JOIN choferes c ON u.chofer_id = c.id
      LEFT JOIN usuarios us ON c.usuario_id = us.id
      LEFT JOIN usuarios us2 ON d.usuario_id = us2.id
      ORDER BY u.creado_en DESC
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
      [placa, modelo, año, tipo, chofer_id || null, kilometraje || 0, dueno_id, id]
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
//  🗑 Eliminar unidad
// ===================================================================
const deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM unidades WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Unidad no encontrada" });
    }

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
  deleteUnit,
  getMyUnits,
};
