const pool = require("../config/db");

// Verifica que el usuario candidato exista, tenga rol OWNER, esté activo
// y no esté ya vinculado a otro registro de duenos. Devuelve { ok, status, code?, message? }.
async function validarUsuarioVinculable({ usuario_id, excludeId = null }) {
  const userQ = await pool.query(
    "SELECT id, nombre, rol, activo FROM usuarios WHERE id = $1",
    [usuario_id]
  );
  if (userQ.rows.length === 0) {
    return { ok: false, status: 404, message: `El usuario seleccionado (id ${usuario_id}) no existe.` };
  }
  const u = userQ.rows[0];
  if (u.rol !== "OWNER") {
    return {
      ok: false,
      status: 400,
      message: `El usuario "${u.nombre}" tiene rol ${u.rol}; debe tener rol OWNER para vincularse a un dueño.`,
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
    `SELECT id FROM duenos WHERE usuario_id = $1 ${excludeId ? "AND id != $2" : ""}`,
    params
  );
  if (dupQ.rows.length > 0) {
    return {
      ok: false,
      status: 409,
      code: "USUARIO_YA_VINCULADO",
      message: `El usuario "${u.nombre}" ya está vinculado a otro dueño. Un usuario solo puede tener un perfil de dueño.`,
    };
  }
  return { ok: true };
}

// 🔹 Crear un nuevo dueño (asociado a un usuario existente)
const createOwner = async (req, res) => {
  try {
    const { usuario_id } = req.body;

    const v = await validarUsuarioVinculable({ usuario_id });
    if (!v.ok) return res.status(v.status).json({ code: v.code, message: v.message });

    const result = await pool.query(
      "INSERT INTO duenos (usuario_id, creado_en) VALUES ($1, NOW()) RETURNING *",
      [usuario_id]
    );

    res.status(201).json({
      message: "Dueño creado exitosamente",
      owner: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: "Error al crear dueño", details: error.message });
  }
};

// 🔹 Obtener todos los dueños (con datos del usuario asociado)
const getAllOwners = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, d.usuario_id, u.nombre, u.correo, u.rol, u.activo, d.creado_en
      FROM duenos d
      JOIN usuarios u ON d.usuario_id = u.id
      ORDER BY d.id ASC
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener dueños", details: error.message });
  }
};

// 🔹 Obtener un dueño por ID (con su usuario asociado)
const getOwnerById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT d.id, d.usuario_id, u.nombre, u.correo, u.rol, u.activo, d.creado_en
      FROM duenos d
      JOIN usuarios u ON d.usuario_id = u.id
      WHERE d.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Dueño no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener dueño", details: error.message });
  }
};

// 🔹 Actualizar la asociación de un dueño (cambiar el usuario vinculado)
const updateOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.body;

    const v = await validarUsuarioVinculable({ usuario_id, excludeId: id });
    if (!v.ok) return res.status(v.status).json({ code: v.code, message: v.message });

    const result = await pool.query(
      "UPDATE duenos SET usuario_id = $1 WHERE id = $2 RETURNING *",
      [usuario_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Dueño no encontrado" });
    }

    res.json({ message: "Dueño actualizado correctamente", owner: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar dueño", details: error.message });
  }
};

// 🔹 Eliminar un dueño
const deleteOwner = async (req, res) => {
  try {
    const { id } = req.params;

    const ownerCheck = await pool.query(
      `SELECT u.nombre FROM duenos d JOIN usuarios u ON d.usuario_id = u.id WHERE d.id = $1`,
      [id]
    );
    if (ownerCheck.rows.length === 0)
      return res.status(404).json({ message: "Dueño no encontrado" });

    // Bloquear si tiene unidades registradas
    const unidadesCheck = await pool.query(
      "SELECT COUNT(*) FROM unidades WHERE dueno_id = $1",
      [id]
    );
    if (parseInt(unidadesCheck.rows[0].count) > 0) {
      return res.status(400).json({
        message: `No se puede eliminar al dueño ${ownerCheck.rows[0].nombre}: tiene ${unidadesCheck.rows[0].count} unidad(es) registrada(s). Elimínalas o reasígnalas primero.`,
      });
    }

    await pool.query("DELETE FROM duenos WHERE id = $1", [id]);
    res.json({ message: "Dueño eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar dueño", details: error.message });
  }
};

// Obtener el perfil del dueño autenticado (por su usuario_id del token)
const getMyProfile = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const result = await pool.query(
      `SELECT d.id, d.usuario_id, u.nombre, u.correo, u.rol, u.activo, d.creado_en
       FROM duenos d
       JOIN usuarios u ON d.usuario_id = u.id
       WHERE d.usuario_id = $1`,
      [usuario_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No se encontró perfil de dueño para este usuario" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener perfil de dueño" });
  }
};

module.exports = {
  createOwner,
  getAllOwners,
  getOwnerById,
  updateOwner,
  deleteOwner,
  getMyProfile,
};
