const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  const { nombre, correo, password, rol } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO usuarios (nombre, correo, password, rol, activo) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, correo, rol, activo",
      [nombre, correo, hashedPassword, rol, true] // Se registra como activo por defecto
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error en el registro" });
  }
};


const login = async (req, res) => {
  const { correo, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE correo = $1", [correo]);
    if (result.rows.length === 0) return res.status(400).json({ error: "Usuario no encontrado" });

    const user = result.rows[0];

    // Verificar si el usuario está activo
    if (!user.activo) return res.status(403).json({ error: "Tu cuenta está inactiva. Contacta al administrador." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Contraseña incorrecta" });

    const token = jwt.sign({ id: user.id, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: "8h" });

    res.json({
      message: "Inicio de sesión exitoso",
      token,
      user: { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol, activo: user.activo }
    });
  } catch (error) {
    res.status(500).json({ error: "Error en el login" });
  }
};


module.exports = { register, login };
