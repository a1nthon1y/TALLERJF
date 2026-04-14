const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// Obtener lista de usuarios
const getUsers = async (req, res) => {
  try {
    const result = await pool.query("SELECT id, nombre, correo, rol, activo, creado_en FROM usuarios ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
};

// Crear usuario (solo admin)
const createUser = async (req, res) => {
  try {
    const { nombre, correo, password, rol, activo } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10); // Encripta la contraseña

    const result = await pool.query(
      "INSERT INTO usuarios (nombre, correo, password, rol, activo, creado_en) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, nombre, correo, rol, activo, creado_en",
      [nombre, correo, hashedPassword, rol, activo]
    );

    res.status(201).json({ message: "Usuario creado exitosamente", user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Error al crear usuario" });
  }
};

// Editar usuario (nombre, correo, rol)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, rol, password } = req.body;

    let query;
    let params;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = `
        UPDATE usuarios SET nombre = $1, correo = $2, rol = $3, password = $4
        WHERE id = $5 RETURNING id, nombre, correo, rol, activo, creado_en`;
      params = [nombre, correo, rol, hashedPassword, id];
    } else {
      query = `
        UPDATE usuarios SET nombre = $1, correo = $2, rol = $3
        WHERE id = $4 RETURNING id, nombre, correo, rol, activo, creado_en`;
      params = [nombre, correo, rol, id];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ message: "Usuario actualizado correctamente", user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
};


// Activar o desactivar usuario
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    const result = await pool.query(
      "UPDATE usuarios SET activo = $1 WHERE id = $2 RETURNING id, nombre, correo, rol, activo, creado_en",
      [activo, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ message: `Usuario ${activo ? "activado" : "desactivado"} correctamente`, user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar estado del usuario" });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
};
