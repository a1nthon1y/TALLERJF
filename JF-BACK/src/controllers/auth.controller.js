const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  const { nombre, correo, password } = req.body;
  const rol = "CHOFER";
  try {
    if (!nombre || !password) {
      return res.status(400).json({ error: "nombre y password son obligatorios" });
    }

    const { generateUsername } = require("../utils/usernameGenerator");
    const username = await generateUsername(nombre);

    if (correo) {
      const existing = await pool.query("SELECT id FROM usuarios WHERE correo = $1", [correo]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "Ya existe un usuario con ese correo" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO usuarios (nombre, correo, username, password, rol, activo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nombre, correo, username, rol, activo",
      [nombre, correo || null, username, hashedPassword, rol, true]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error en el registro" });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ error: "usuario y contraseña son obligatorios" });
    }

    // Buscar por username (o correo como fallback para retrocompatibilidad)
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE username = $1 OR correo = $1",
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const user = result.rows[0];

    if (!user.activo) {
      return res.status(403).json({ error: "Tu cuenta está inactiva. Contacta al administrador." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Credenciales inválidas" });

    const token = jwt.sign({ id: user.id, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: "8h" });

    res.json({
      message: "Inicio de sesión exitoso",
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        username: user.username,
        correo: user.correo,
        rol: user.rol,
        activo: user.activo,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Error en el login" });
  }
};

module.exports = { register, login };
