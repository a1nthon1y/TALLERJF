const pool = require("../config/db");

// ===============================================================
//  ✅ Crear chofer
// ===============================================================
const createDriver = async (req, res) => {
  try {
    const { usuario_id, licencia, telefono } = req.body;

    if (!usuario_id || !licencia) {
      return res.status(400).json({ message: "usuario_id y licencia son obligatorios" });
    }

    const result = await pool.query(
      `
      INSERT INTO choferes (usuario_id, licencia, telefono)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [usuario_id, licencia, telefono || null]
    );

    res.status(201).json({
      message: "Chofer creado correctamente",
      chofer: result.rows[0]
    });

  } catch (error) {
    console.error("Error al crear chofer:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


// ===============================================================
//  🔍 Obtener todos los choferes con datos del usuario
// ===============================================================
const getAllDrivers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id AS chofer_id,
        c.licencia,
        c.telefono,
        c.creado_en,

        u.id AS usuario_id,
        u.nombre AS usuario_nombre,
        u.correo AS usuario_correo

      FROM choferes c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      ORDER BY c.creado_en DESC
    `);

    res.json(result.rows);

  } catch (error) {
    console.error("Error al obtener choferes:", error);
    res.status(500).json({ error: "Error al obtener choferes" });
  }
};


// ===============================================================
//  🔍 Obtener chofer por ID
// ===============================================================
const getDriverById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        c.id AS chofer_id,
        c.licencia,
        c.telefono,
        c.creado_en,

        u.id AS usuario_id,
        u.nombre AS usuario_nombre,
        u.correo AS usuario_correo

      FROM choferes c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Chofer no encontrado" });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error("Error al obtener chofer:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


// ===============================================================
//  ✏ Actualizar chofer
// ===============================================================
const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id, licencia, telefono } = req.body;

    const result = await pool.query(
      `
      UPDATE choferes
      SET usuario_id = $1, licencia = $2, telefono = $3
      WHERE id = $4
      RETURNING *
      `,
      [usuario_id, licencia, telefono, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Chofer no encontrado" });
    }

    res.json({
      message: "Chofer actualizado correctamente",
      chofer: result.rows[0],
    });

  } catch (error) {
    console.error("Error al actualizar chofer:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


// ===============================================================
//  🗑 Eliminar chofer
// ===============================================================
const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM choferes WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Chofer no encontrado" });
    }

    res.json({ message: "Chofer eliminado correctamente" });

  } catch (error) {
    console.error("Error al eliminar chofer:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


module.exports = {
  createDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
};
    