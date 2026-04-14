const pool = require("../config/db");

// 🔹 Crear un nuevo dueño (asociado a un usuario existente)
const createOwner = async (req, res) => {
  try {
    const { usuario_id } = req.body;

    // Verificar que el usuario exista
    const userCheck = await pool.query("SELECT id FROM usuarios WHERE id = $1", [usuario_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "El usuario asociado no existe" });
    }

    // Insertar el nuevo dueño
    const result = await pool.query(
      "INSERT INTO duenos (usuario_id, creado_en) VALUES ($1, NOW()) RETURNING *",
      [usuario_id]
    );

    res.status(201).json({
      message: "Dueño creado exitosamente",
      owner: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: "Error al crear dueño", details: error.message });
  }
};

// 🔹 Obtener todos los dueños (con datos del usuario asociado)
const getAllOwners = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, d.usuario_id, u.nombre, u.correo, u.rol, u.activo, d.creado_en
      FROM duenos d
      JOIN usuarios u ON d.usuario_id = u.id
      ORDER BY d.id ASC
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener dueños", details: error.message });
  }
};

// 🔹 Obtener un dueño por ID (con su usuario asociado)
const getOwnerById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT d.id, d.usuario_id, u.nombre, u.correo, u.rol, u.activo, d.creado_en
      FROM duenos d
      JOIN usuarios u ON d.usuario_id = u.id
      WHERE d.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Dueño no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener dueño", details: error.message });
  }
};

// 🔹 Actualizar la asociación de un dueño (cambiar el usuario vinculado)
const updateOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.body;

    // Verificar que el usuario exista
    const userCheck = await pool.query("SELECT id FROM usuarios WHERE id = $1", [usuario_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "El nuevo usuario asociado no existe" });
    }

    const result = await pool.query(
      "UPDATE duenos SET usuario_id = $1 WHERE id = $2 RETURNING *",
      [usuario_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Dueño no encontrado" });
    }

    res.json({ message: "Dueño actualizado correctamente", owner: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar dueño", details: error.message });
  }
};

// 🔹 Eliminar un dueño
const deleteOwner = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query("DELETE FROM duenos WHERE id = $1 RETURNING *", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Dueño no encontrado" });
    }

    res.json({ message: "Dueño eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar dueño", details: error.message });
  }
};

module.exports = {
  createOwner,
  getAllOwners,
  getOwnerById,
  updateOwner,
  deleteOwner,
};
