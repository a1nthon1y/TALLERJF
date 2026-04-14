const pool = require("../config/db");

// Obtener todos los materiales
const getMaterials = async (req, res) => {
  try {
    const result = await pool.query("SELECT id, nombre, descripcion, stock, precio, creado_en FROM materiales ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los materiales" });
  }
};

// Crear nuevo material
const createMaterial = async (req, res) => {
  try {
    const { nombre, descripcion, stock, precio } = req.body;

    const result = await pool.query(
      "INSERT INTO materiales (nombre, descripcion, stock, precio, creado_en) VALUES ($1, $2, $3, $4, NOW()) RETURNING *",
      [nombre, descripcion, stock, precio]
    );

    res.status(201).json({ message: "Material creado exitosamente", material: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Error al crear material" });
  }
};

// Editar material
const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, stock, precio } = req.body;

    const result = await pool.query(
      `UPDATE materiales SET nombre = $1, descripcion = $2, stock = $3, precio = $4 
       WHERE id = $5 RETURNING *`,
      [nombre, descripcion, stock, precio, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Material no encontrado" });
    }

    res.json({ message: "Material actualizado correctamente", material: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar material" });
  }
};

// Eliminar material
const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query("DELETE FROM materiales WHERE id = $1 RETURNING *", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Material no encontrado" });
    }

    res.json({ message: "Material eliminado correctamente", material: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar material" });
  }
};

module.exports = {
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
};
