const pool = require("../config/db");

// La tabla `rutas` y su seed inicial se crean en run-migrations.js.
// Aquí solo CRUD; no DDL.

// GET /api/rutas — todas (admin/encargado)
const getAll = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM rutas ORDER BY orden ASC, nombre ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener rutas" });
  }
};

// POST /api/rutas
const create = async (req, res) => {
  try {
    const { nombre, orden = 0 } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ message: "El nombre de la ruta es requerido." });

    const dup = await pool.query("SELECT id FROM rutas WHERE LOWER(nombre) = LOWER($1)", [nombre.trim()]);
    if (dup.rows.length > 0) return res.status(409).json({ message: `Ya existe una ruta con el nombre "${nombre.trim()}".` });

    const result = await pool.query(
      "INSERT INTO rutas (nombre, orden) VALUES ($1, $2) RETURNING *",
      [nombre.trim(), orden]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al crear ruta" });
  }
};

// PUT /api/rutas/:id
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, activa, orden } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ message: "El nombre de la ruta es requerido." });

    const result = await pool.query(
      "UPDATE rutas SET nombre=$1, activa=$2, orden=$3 WHERE id=$4 RETURNING *",
      [nombre.trim(), activa ?? true, orden ?? 0, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Ruta no encontrada." });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar ruta" });
  }
};

// DELETE /api/rutas/:id — eliminación real
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM rutas WHERE id=$1", [id]);
    res.json({ message: "Ruta eliminada" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar ruta" });
  }
};

module.exports = { getAll, create, update, remove };
