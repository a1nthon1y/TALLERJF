const pool = require("../config/db");

// Obtener todos los materiales
const getMaterials = async (req, res) => {
  try {
    const result = await pool.query("SELECT id, nombre, descripcion, stock, precio, activo, creado_en FROM materiales ORDER BY nombre ASC");
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

    const matCheck = await pool.query("SELECT nombre FROM materiales WHERE id = $1", [id]);
    if (matCheck.rows.length === 0)
      return res.status(404).json({ error: "Material no encontrado" });

    // Bloquear si ha sido usado en algún mantenimiento (historial intacto)
    const usadoCheck = await pool.query(
      "SELECT COUNT(*) FROM detalles_mantenimiento WHERE material_id = $1",
      [id]
    );
    if (parseInt(usadoCheck.rows[0].count) > 0) {
      return res.status(400).json({
        message: `No se puede eliminar "${matCheck.rows[0].nombre}": está registrado en ${usadoCheck.rows[0].count} mantenimiento(s). Desactívalo si ya no quieres usarlo.`,
      });
    }

    await pool.query("DELETE FROM materiales WHERE id = $1", [id]);
    res.json({ message: "Material eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar material" });
  }
};

// Activar / Desactivar material (soft disable)
const toggleMaterialStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query("SELECT nombre, activo FROM materiales WHERE id = $1", [id]);
    if (check.rows.length === 0)
      return res.status(404).json({ message: "Material no encontrado" });

    const { nombre, activo } = check.rows[0];
    const result = await pool.query(
      "UPDATE materiales SET activo = $1 WHERE id = $2 RETURNING activo",
      [!activo, id]
    );
    const estado = result.rows[0].activo ? "activado" : "desactivado";
    res.json({ message: `Material "${nombre}" ${estado}`, activo: result.rows[0].activo });
  } catch (error) {
    res.status(500).json({ error: "Error al cambiar estado del material" });
  }
};

// Historial de usos de un material en mantenimientos
const getMaterialUsage = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT
         dm.id AS detalle_id,
         dm.cantidad,
         dm.costo_total,
         m.id AS mantenimiento_id,
         m.tipo,
         m.estado,
         m.fecha_programada,
         u.placa,
         u.modelo
       FROM detalles_mantenimiento dm
       JOIN mantenimientos m ON dm.mantenimiento_id = m.id
       JOIN unidades u ON m.unidad_id = u.id
       WHERE dm.material_id = $1
       ORDER BY m.fecha_programada DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usos del material" });
  }
};

module.exports = {
  getMaterials,
  createMaterial,
  updateMaterial,
  toggleMaterialStatus,
  deleteMaterial,
  getMaterialUsage,
};
