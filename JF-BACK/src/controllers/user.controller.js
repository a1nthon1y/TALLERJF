const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const { generateUsername } = require("../utils/usernameGenerator");

// Obtener lista de usuarios
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre, username, correo, rol, activo, creado_en FROM usuarios ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
};

// Sugerir username a partir de un nombre (sin guardar)
const suggestUsername = async (req, res) => {
  try {
    const { nombre } = req.query;
    if (!nombre) return res.status(400).json({ error: "nombre es requerido" });
    const username = await generateUsername(nombre);
    res.json({ username });
  } catch (error) {
    res.status(500).json({ error: "Error al generar username" });
  }
};

// Crear usuario (solo admin)
const createUser = async (req, res) => {
  try {
    const { nombre, correo, username: usernameInput, password, rol, activo } = req.body;

    if (!nombre || !password || !rol) {
      return res.status(400).json({ error: "nombre, password y rol son obligatorios" });
    }

    // Si el admin envió un username manual, verificar que no exista
    // Si no envió uno, generarlo automáticamente
    let username;
    if (usernameInput && usernameInput.trim()) {
      const existing = await pool.query("SELECT id FROM usuarios WHERE username = $1", [usernameInput.trim()]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: `El usuario '${usernameInput.trim()}' ya existe` });
      }
      username = usernameInput.trim().toLowerCase();
    } else {
      username = await generateUsername(nombre);
    }

    // Verificar unicidad de correo si se proporcionó
    if (correo) {
      const correoExists = await pool.query("SELECT id FROM usuarios WHERE correo = $1", [correo]);
      if (correoExists.rows.length > 0) {
        return res.status(409).json({ error: "Ya existe un usuario con ese correo" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, username, correo, password, rol, activo, creado_en)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, nombre, username, correo, rol, activo, creado_en`,
      [nombre, username, correo || null, hashedPassword, rol, activo ?? true]
    );

    res.status(201).json({ message: "Usuario creado exitosamente", user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Error al crear usuario" });
  }
};

// Editar usuario
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, username: usernameInput, rol, password } = req.body;

    // Verificar unicidad de username si cambió
    if (usernameInput) {
      const existing = await pool.query(
        "SELECT id FROM usuarios WHERE username = $1 AND id != $2",
        [usernameInput.trim(), id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: `El usuario '${usernameInput.trim()}' ya existe` });
      }
    }

    let query, params;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = `UPDATE usuarios SET nombre=$1, username=$2, correo=$3, rol=$4, password=$5
               WHERE id=$6 RETURNING id, nombre, username, correo, rol, activo, creado_en`;
      params = [nombre, usernameInput?.trim() || null, correo || null, rol, hashedPassword, id];
    } else {
      query = `UPDATE usuarios SET nombre=$1, username=$2, correo=$3, rol=$4
               WHERE id=$5 RETURNING id, nombre, username, correo, rol, activo, creado_en`;
      params = [nombre, usernameInput?.trim() || null, correo || null, rol, id];
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
      "UPDATE usuarios SET activo=$1 WHERE id=$2 RETURNING id, nombre, username, correo, rol, activo, creado_en",
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

module.exports = { getUsers, suggestUsername, createUser, updateUser, toggleUserStatus };
