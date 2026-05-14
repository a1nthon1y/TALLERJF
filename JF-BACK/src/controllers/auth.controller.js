const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ message: "El usuario y la contraseña son obligatorios." });
    }

    const result = await pool.query(
      `SELECT id, nombre, username, correo, password, rol, activo
       FROM usuarios
       WHERE username = $1 OR correo = $1`,
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Usuario o contraseña incorrectos." });
    }

    const user = result.rows[0];

    if (!user.activo) {
      return res.status(403).json({ message: "Tu cuenta está inactiva. Contacta al administrador para reactivarla." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Usuario o contraseña incorrectos." });

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

module.exports = { login };
