const pool = require("../config/db");

// La tabla `rutas` y su seed inicial se crean en run-migrations.js.
// Aquí solo CRUD; no DDL.
//
// NOTA: La columna `rutas.orden` quedó deprecada — el dropdown del chofer
// se ordena por su historial de uso (ver chofer.controller.js → getRutas).
// Para rutas (admin) se ordena alfabético. La columna se mantiene en la DB
// solo para no romper migraciones; ningún endpoint la lee/escribe.

// GET /api/rutas — todas (admin/encargado)
const getAll = async (req, res) => {
  try {
    const result = await pool.query("SELECT id, nombre, activa FROM rutas ORDER BY nombre ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener rutas" });
  }
};

// POST /api/rutas
const create = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ message: "El nombre de la ruta es requerido." });

    const dup = await pool.query("SELECT id FROM rutas WHERE LOWER(nombre) = LOWER($1)", [nombre.trim()]);
    if (dup.rows.length > 0) return res.status(409).json({ message: `Ya existe una ruta con el nombre "${nombre.trim()}".` });

    const result = await pool.query(
      "INSERT INTO rutas (nombre) VALUES ($1) RETURNING id, nombre, activa",
      [nombre.trim()]
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
    const { nombre, activa } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ message: "El nombre de la ruta es requerido." });

    const prev = await pool.query("SELECT nombre, activa FROM rutas WHERE id = $1", [id]);
    if (prev.rows.length === 0) return res.status(404).json({ message: "Ruta no encontrada." });

    const result = await pool.query(
      "UPDATE rutas SET nombre=$1, activa=$2 WHERE id=$3 RETURNING id, nombre, activa",
      [nombre.trim(), activa ?? true, id]
    );

    // Advertencia informativa al desactivar (no bloquea):
    //  - los reportes_llegada históricos guardan `origen` como texto y
    //    no se ven afectados; pero el chofer dejará de ver esta ruta
    //    en el dropdown (chofer.getRutas filtra por activa = TRUE).
    const advertencias = [];
    const seDesactiva = prev.rows[0].activa === true && (activa ?? true) === false;
    if (seDesactiva) {
      const usos = await pool.query(
        "SELECT COUNT(*)::int AS total FROM reportes_llegada WHERE origen = $1",
        [prev.rows[0].nombre]
      );
      if (usos.rows[0].total > 0) {
        advertencias.push(
          `Esta ruta aparece en ${usos.rows[0].total} reporte(s) de llegada históricos. Los registros se mantienen, pero los choferes ya no podrán seleccionarla para nuevas llegadas.`
        );
      }
    }

    res.json({ ...result.rows[0], advertencias });
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
