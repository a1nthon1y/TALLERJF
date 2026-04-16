const pool = require("../config/db");

// GET /maintenances/:id/materials — cualquier usuario autenticado puede ver los materiales
const getMaterials = async (req, res) => {
  try {
    const { id } = req.params;

    const mantCheck = await pool.query("SELECT id FROM mantenimientos WHERE id = $1", [id]);
    if (mantCheck.rows.length === 0) {
      return res.status(404).json({ message: "Mantenimiento no encontrado" });
    }

    const result = await pool.query(
      `SELECT dm.id, dm.material_id, dm.cantidad, dm.costo_total,
              mat.nombre, mat.precio AS precio_unitario
       FROM detalles_mantenimiento dm
       JOIN materiales mat ON dm.material_id = mat.id
       WHERE dm.mantenimiento_id = $1
       ORDER BY dm.id ASC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /maintenances/:id/materials — ADMIN/ENCARGADO registran material usado
const addMaterial = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { material_id, cantidad } = req.body;

    if (!material_id || !cantidad || Number(cantidad) <= 0) {
      return res.status(400).json({ message: "material_id y cantidad (> 0) son requeridos" });
    }

    await client.query("BEGIN");

    const mantCheck = await client.query("SELECT id FROM mantenimientos WHERE id = $1", [id]);
    if (mantCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Mantenimiento no encontrado" });
    }

    const matResult = await client.query(
      "SELECT id, nombre, precio, stock FROM materiales WHERE id = $1",
      [material_id]
    );
    if (matResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Material no encontrado" });
    }

    const mat = matResult.rows[0];
    if (mat.stock < Number(cantidad)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: `Stock insuficiente. Disponible: ${mat.stock}` });
    }

    const costo_total = Number(mat.precio) * Number(cantidad);

    const inserted = await client.query(
      `INSERT INTO detalles_mantenimiento (mantenimiento_id, material_id, cantidad, costo_total)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, material_id, cantidad, costo_total]
    );

    await client.query(
      "UPDATE materiales SET stock = stock - $1 WHERE id = $2",
      [cantidad, material_id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      ...inserted.rows[0],
      nombre: mat.nombre,
      precio_unitario: mat.precio,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// DELETE /maintenances/:id/materials/:detalleId — ADMIN/ENCARGADO eliminan material y restauran stock
const removeMaterial = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id, detalleId } = req.params;

    await client.query("BEGIN");

    const detalleResult = await client.query(
      "SELECT * FROM detalles_mantenimiento WHERE id = $1 AND mantenimiento_id = $2",
      [detalleId, id]
    );
    if (detalleResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Detalle no encontrado" });
    }

    const detalle = detalleResult.rows[0];

    await client.query("DELETE FROM detalles_mantenimiento WHERE id = $1", [detalleId]);

    await client.query(
      "UPDATE materiales SET stock = stock + $1 WHERE id = $2",
      [detalle.cantidad, detalle.material_id]
    );

    await client.query("COMMIT");

    res.json({ message: "Material eliminado y stock restaurado" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

module.exports = { getMaterials, addMaterial, removeMaterial };
