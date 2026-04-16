const pool = require("../config/db");

// Obtener lista de técnicos
const getTechnicians = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre, dni, especialidad, activo, usuario_id, creado_en FROM tecnicos ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener técnicos" });
  }
};

// Crear nuevo técnico
const createTechnician = async (req, res) => {
  try {
    const { nombre, dni, especialidad, activo, usuario_id } = req.body;

    // Verificar que el usuario existe y tiene rol TECNICO si se provee
    if (usuario_id) {
      const userCheck = await pool.query("SELECT rol FROM usuarios WHERE id = $1", [usuario_id]);
      if (userCheck.rows.length === 0 || userCheck.rows[0].rol !== "TECNICO") {
        return res.status(400).json({ error: "El usuario debe tener rol TECNICO" });
      }
    }

    const result = await pool.query(
      "INSERT INTO tecnicos (nombre, dni, especialidad, activo, usuario_id, creado_en) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *",
      [nombre, dni, especialidad, activo ?? true, usuario_id || null]
    );

    res.status(201).json({ message: "Técnico creado exitosamente", tecnico: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Error al crear técnico" });
  }
};

// Editar técnico
const updateTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, dni, especialidad, usuario_id } = req.body;

    // Verificar que el usuario existe y tiene rol TECNICO si se provee
    if (usuario_id) {
      const userCheck = await pool.query("SELECT rol FROM usuarios WHERE id = $1", [usuario_id]);
      if (userCheck.rows.length === 0 || userCheck.rows[0].rol !== "TECNICO") {
        return res.status(400).json({ error: "El usuario debe tener rol TECNICO" });
      }
    }

    const result = await pool.query(
      "UPDATE tecnicos SET nombre = $1, dni = $2, especialidad = $3, usuario_id = $4 WHERE id = $5 RETURNING *",
      [nombre, dni, especialidad, usuario_id || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Técnico no encontrado" });
    }

    res.json({ message: "Técnico actualizado correctamente", tecnico: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar técnico" });
  }
};

// Activar o desactivar técnico
const toggleTechnicianStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    const result = await pool.query(
      "UPDATE tecnicos SET activo = $1 WHERE id = $2 RETURNING *",
      [activo, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Técnico no encontrado" });
    }

    res.json({ message: `Técnico ${activo ? "activado" : "desactivado"} correctamente`, tecnico: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Error al cambiar estado del técnico" });
  }
};

module.exports = {
  getTechnicians,
  createTechnician,
  updateTechnician,
  toggleTechnicianStatus,
};
