const pool = require("../config/db");

const getAll = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM especialidades ORDER BY nombre ASC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener especialidades:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const create = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre?.trim())
      return res.status(400).json({ message: "El nombre es requerido" });

    const result = await pool.query(
      "INSERT INTO especialidades (nombre) VALUES ($1) RETURNING *",
      [nombre.trim()]
    );
    res.status(201).json({ message: "Especialidad creada", especialidad: result.rows[0] });
  } catch (error) {
    if (error.code === "23505")
      return res.status(400).json({ message: "Ya existe una especialidad con ese nombre" });
    console.error("Error al crear especialidad:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;
    if (!nombre?.trim())
      return res.status(400).json({ message: "El nombre es requerido" });

    const result = await pool.query(
      "UPDATE especialidades SET nombre = $1 WHERE id = $2 RETURNING *",
      [nombre.trim(), id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Especialidad no encontrada" });

    res.json({ message: "Especialidad actualizada", especialidad: result.rows[0] });
  } catch (error) {
    if (error.code === "23505")
      return res.status(400).json({ message: "Ya existe una especialidad con ese nombre" });
    console.error("Error al actualizar especialidad:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query("SELECT nombre, activo FROM especialidades WHERE id = $1", [id]);
    if (check.rows.length === 0)
      return res.status(404).json({ message: "Especialidad no encontrada" });

    const { nombre, activo } = check.rows[0];
    const result = await pool.query(
      "UPDATE especialidades SET activo = $1 WHERE id = $2 RETURNING activo",
      [!activo, id]
    );
    const estado = result.rows[0].activo ? "activada" : "desactivada";
    res.json({ message: `Especialidad "${nombre}" ${estado}`, activo: result.rows[0].activo });
  } catch (error) {
    console.error("Error al cambiar estado:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const inUse = await pool.query(
      "SELECT COUNT(*) FROM tecnicos WHERE especialidad = (SELECT nombre FROM especialidades WHERE id = $1)",
      [id]
    );
    if (parseInt(inUse.rows[0].count) > 0)
      return res.status(400).json({ message: "No se puede eliminar: hay técnicos con esta especialidad." });

    const result = await pool.query("DELETE FROM especialidades WHERE id = $1 RETURNING nombre", [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Especialidad no encontrada" });

    res.json({ message: `Especialidad "${result.rows[0].nombre}" eliminada` });
  } catch (error) {
    console.error("Error al eliminar especialidad:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = { getAll, create, update, toggleStatus, remove };
