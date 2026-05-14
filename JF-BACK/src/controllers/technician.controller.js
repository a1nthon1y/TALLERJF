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

// Verifica que el usuario candidato exista, tenga el rol esperado, esté activo
// y no esté ya vinculado a otro técnico (excludeId omite la verificación al editar
// el mismo registro). Devuelve { ok, status, code?, message? }.
async function validarUsuarioVinculable({ usuario_id, excludeId = null }) {
  const userQ = await pool.query(
    "SELECT id, nombre, rol, activo FROM usuarios WHERE id = $1",
    [usuario_id]
  );
  if (userQ.rows.length === 0) {
    return { ok: false, status: 404, message: `El usuario seleccionado (id ${usuario_id}) no existe.` };
  }
  const u = userQ.rows[0];
  if (u.rol !== "TECNICO") {
    return {
      ok: false,
      status: 400,
      message: `El usuario "${u.nombre}" tiene rol ${u.rol}; debe tener rol TECNICO para vincularse a un técnico.`,
    };
  }
  if (!u.activo) {
    return {
      ok: false,
      status: 409,
      code: "USUARIO_DESACTIVADO",
      message: `El usuario "${u.nombre}" está desactivado. Reactívalo desde Usuarios antes de vincularlo.`,
    };
  }
  const params = excludeId ? [usuario_id, excludeId] : [usuario_id];
  const dupQ = await pool.query(
    `SELECT id FROM tecnicos WHERE usuario_id = $1 ${excludeId ? "AND id != $2" : ""}`,
    params
  );
  if (dupQ.rows.length > 0) {
    return {
      ok: false,
      status: 409,
      code: "USUARIO_YA_VINCULADO",
      message: `El usuario "${u.nombre}" ya está vinculado a otro técnico. Un usuario solo puede tener un perfil de técnico.`,
    };
  }
  return { ok: true };
}

// Crear nuevo técnico
const createTechnician = async (req, res) => {
  try {
    const { nombre, dni, especialidad, activo, usuario_id } = req.body;

    if (usuario_id) {
      const v = await validarUsuarioVinculable({ usuario_id });
      if (!v.ok) return res.status(v.status).json({ code: v.code, message: v.message });
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

    if (usuario_id) {
      const v = await validarUsuarioVinculable({ usuario_id, excludeId: id });
      if (!v.ok) return res.status(v.status).json({ code: v.code, message: v.message });
    }

    const result = await pool.query(
      "UPDATE tecnicos SET nombre = $1, dni = $2, especialidad = $3, usuario_id = $4 WHERE id = $5 RETURNING *",
      [nombre, dni, especialidad, usuario_id || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Técnico no encontrado." });
    }

    res.json({ message: "Técnico actualizado correctamente", tecnico: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar técnico" });
  }
};

// Eliminar técnico
const deleteTechnician = async (req, res) => {
  try {
    const { id } = req.params;

    const check = await pool.query("SELECT nombre FROM tecnicos WHERE id = $1", [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: "Técnico no encontrado." });
    }
    const nombre = check.rows[0].nombre;

    // Bloquear si tiene mantenimientos activos asignados
    const activos = await pool.query(
      `SELECT COUNT(*) FROM mantenimientos
       WHERE tecnico_id = $1 AND estado IN ('PENDIENTE','EN_PROCESO')`,
      [id]
    );
    if (parseInt(activos.rows[0].count) > 0) {
      return res.status(400).json({
        message: `No se puede eliminar a "${nombre}": tiene ${activos.rows[0].count} mantenimiento(s) activo(s) asignado(s). Ciérralos o reasígnalos antes de eliminarlo.`,
      });
    }

    // Bloquear si tiene historial de mantenimientos
    const historial = await pool.query(
      "SELECT COUNT(*) FROM mantenimientos WHERE tecnico_id = $1",
      [id]
    );
    if (parseInt(historial.rows[0].count) > 0) {
      return res.status(400).json({
        message: `No se puede eliminar a "${nombre}": tiene ${historial.rows[0].count} mantenimiento(s) en su historial. Usa la opción "Desactivar" para darle de baja sin perder el historial.`,
      });
    }

    await pool.query("DELETE FROM tecnicos WHERE id = $1", [id]);
    res.json({ message: `Técnico "${nombre}" eliminado correctamente.` });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar técnico" });
  }
};

// Activar o desactivar técnico
const toggleTechnicianStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    const tCheck = await pool.query("SELECT nombre, activo FROM tecnicos WHERE id = $1", [id]);
    if (tCheck.rows.length === 0) {
      return res.status(404).json({ message: "Técnico no encontrado." });
    }

    // Advertencias informativas al desactivar. No bloquean la acción —
    // solo informan al admin del impacto. El técnico desactivado deja de
    // aparecer en los selectores de "asignar técnico" para nuevos trabajos.
    const advertencias = [];
    if (activo === false && tCheck.rows[0].activo === true) {
      const m = await pool.query(
        `SELECT COUNT(*)::int AS total FROM mantenimientos
          WHERE tecnico_id = $1 AND estado IN ('PENDIENTE','EN_PROCESO')`,
        [id]
      );
      if (m.rows[0].total > 0) {
        advertencias.push(
          `Tiene ${m.rows[0].total} mantenimiento(s) activo(s) asignado(s). Considera reasignarlos a otro técnico antes de desactivarlo.`
        );
      }
    }

    const result = await pool.query(
      "UPDATE tecnicos SET activo = $1 WHERE id = $2 RETURNING *",
      [activo, id]
    );

    res.json({
      message: `Técnico ${activo ? "activado" : "desactivado"} correctamente`,
      tecnico: result.rows[0],
      advertencias,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al cambiar estado del técnico" });
  }
};

module.exports = {
  getTechnicians,
  createTechnician,
  updateTechnician,
  deleteTechnician,
  toggleTechnicianStatus,
};
