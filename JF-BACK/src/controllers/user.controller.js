const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const { generateUsername } = require("../utils/usernameGenerator");

// Obtener lista de usuarios
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre, username, correo, rol, activo, creado_en FROM usuarios ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
};

// Sugerir username a partir de un nombre (sin guardar)
const suggestUsername = async (req, res) => {
  try {
    const { nombre } = req.query;
    if (!nombre) return res.status(400).json({ message: "El nombre es requerido para sugerir un username." });
    const username = await generateUsername(nombre);
    res.json({ username });
  } catch (error) {
    res.status(500).json({ error: "Error al generar username" });
  }
};

// Crear usuario (solo admin)
const createUser = async (req, res) => {
  try {
    const { nombre, correo, username: usernameInput, password, rol, activo } = req.body;

    if (!nombre || !password || !rol) {
      return res.status(400).json({ message: "Nombre, contraseña y rol son obligatorios para crear un usuario." });
    }

    let username;
    if (usernameInput && usernameInput.trim()) {
      const existing = await pool.query("SELECT id FROM usuarios WHERE username = $1", [usernameInput.trim()]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ message: `Ya existe un usuario con el username '${usernameInput.trim()}'. Elige otro.` });
      }
      username = usernameInput.trim().toLowerCase();
    } else {
      username = await generateUsername(nombre);
    }

    if (correo) {
      const correoExists = await pool.query("SELECT id FROM usuarios WHERE correo = $1", [correo]);
      if (correoExists.rows.length > 0) {
        return res.status(409).json({ message: `Ya existe un usuario registrado con el correo ${correo}.` });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, username, correo, password, rol, activo, creado_en)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, nombre, username, correo, rol, activo, creado_en`,
      [nombre, username, correo || null, hashedPassword, rol, activo ?? true]
    );

    res.status(201).json({ message: "Usuario creado exitosamente", user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Error al crear usuario" });
  }
};

// Editar usuario
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, username: usernameInput, rol, password } = req.body;

    // Verificar unicidad de username si cambió
    if (usernameInput) {
      const existing = await pool.query(
        "SELECT id FROM usuarios WHERE username = $1 AND id != $2",
        [usernameInput.trim(), id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ message: `Ya existe otro usuario con el username '${usernameInput.trim()}'.` });
      }
    }

    let query, params;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = `UPDATE usuarios SET nombre=$1, username=$2, correo=$3, rol=$4, password=$5
               WHERE id=$6 RETURNING id, nombre, username, correo, rol, activo, creado_en`;
      params = [nombre, usernameInput?.trim() || null, correo || null, rol, hashedPassword, id];
    } else {
      query = `UPDATE usuarios SET nombre=$1, username=$2, correo=$3, rol=$4
               WHERE id=$5 RETURNING id, nombre, username, correo, rol, activo, creado_en`;
      params = [nombre, usernameInput?.trim() || null, correo || null, rol, id];
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    res.json({ message: "Usuario actualizado correctamente", user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    // Reglas:
    //   - Un admin no puede auto-desactivarse (se quedaría sin sesión).
    //   - No se puede desactivar al último ADMIN activo (la app perdería su único admin).
    if (String(req.user.id) === String(id) && activo === false) {
      return res.status(400).json({
        message: "No puedes desactivar tu propia cuenta mientras estás en sesión.",
      });
    }

    const target = await pool.query(
      "SELECT id, nombre, rol, activo FROM usuarios WHERE id = $1",
      [id]
    );
    if (target.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    const t = target.rows[0];

    if (t.rol === "ADMIN" && activo === false && t.activo === true) {
      const otrosAdmins = await pool.query(
        "SELECT COUNT(*)::int AS total FROM usuarios WHERE rol = 'ADMIN' AND activo = TRUE AND id != $1",
        [id]
      );
      if (otrosAdmins.rows[0].total === 0) {
        return res.status(400).json({
          message: `No se puede desactivar a "${t.nombre}": es el único administrador activo del sistema. Crea o activa otro administrador antes de desactivar a este.`,
        });
      }
    }

    // Recolectamos advertencias informativas del impacto cuando el admin
    // está APAGANDO una cuenta (no al activar). No bloquean: solo informan.
    // El usuario desactivado no podrá hacer login y, gracias a las
    // validaciones en createChofer/createTechnician/createOwner, tampoco
    // podrá ser vinculado a nuevos perfiles. Los perfiles existentes
    // permanecen para preservar historial.
    const advertencias = [];
    if (activo === false && t.activo === true) {
      advertencias.push(
        `${t.nombre} no podrá iniciar sesión hasta que reactives su cuenta.`
      );
      if (t.rol === "CHOFER") {
        const ch = await pool.query("SELECT id FROM choferes WHERE usuario_id = $1", [id]);
        if (ch.rows.length > 0) {
          const ch_id = ch.rows[0].id;
          const u = await pool.query(
            "SELECT COUNT(*)::int AS total FROM unidades WHERE chofer_id = $1 AND activo = TRUE",
            [ch_id]
          );
          if (u.rows[0].total > 0) {
            advertencias.push(
              `Está asignado a ${u.rows[0].total} unidad(es) activa(s). Mientras esté desactivado no podrá registrar llegadas ni reportar fallas. La asignación se mantiene.`
            );
          }
        }
      }
      if (t.rol === "TECNICO") {
        const tec = await pool.query("SELECT id FROM tecnicos WHERE usuario_id = $1", [id]);
        if (tec.rows.length > 0) {
          const tec_id = tec.rows[0].id;
          const m = await pool.query(
            "SELECT COUNT(*)::int AS total FROM mantenimientos WHERE tecnico_id = $1 AND estado IN ('PENDIENTE','EN_PROCESO')",
            [tec_id]
          );
          if (m.rows[0].total > 0) {
            advertencias.push(
              `Tiene ${m.rows[0].total} mantenimiento(s) activo(s) asignado(s). Considera reasignarlos a otro técnico antes de desactivarlo.`
            );
          }
        }
      }
      if (t.rol === "OWNER") {
        const d = await pool.query("SELECT id FROM duenos WHERE usuario_id = $1", [id]);
        if (d.rows.length > 0) {
          const d_id = d.rows[0].id;
          const u = await pool.query(
            "SELECT COUNT(*)::int AS total FROM unidades WHERE dueno_id = $1",
            [d_id]
          );
          if (u.rows[0].total > 0) {
            advertencias.push(
              `Es dueño de ${u.rows[0].total} unidad(es). El historial se conserva, pero no podrá entrar al panel del dueño hasta reactivarlo.`
            );
          }
        }
      }
    }

    const result = await pool.query(
      "UPDATE usuarios SET activo=$1 WHERE id=$2 RETURNING id, nombre, username, correo, rol, activo, creado_en",
      [activo, id]
    );

    res.json({
      message: `Usuario ${activo ? "activado" : "desactivado"} correctamente`,
      user: result.rows[0],
      advertencias,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar estado del usuario" });
  }
};

// Eliminar usuario (DELETE permanente).
//
// Reglas de negocio (en orden de validación):
//   1. No te puedes auto-eliminar.
//   2. Si es ADMIN, debe quedar al menos otro ADMIN (cualquier estado activo) en el sistema.
//   3. Si tiene perfil OWNER con unidades vinculadas → bloquear (sugerir desactivar).
//   4. Si tiene perfil CHOFER con mantenimientos / reportes / unidad asignada → bloquear.
//   5. Si tiene perfil TECNICO con mantenimientos asignados → bloquear.
//   6. Cualquier perfil "vacío" (owner/chofer/tecnico sin actividad) se elimina junto con el usuario.
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (String(req.user.id) === String(id)) {
      return res.status(400).json({
        message: "No puedes eliminar tu propia cuenta mientras estás en sesión.",
      });
    }

    const target = await pool.query(
      "SELECT id, nombre, rol FROM usuarios WHERE id = $1",
      [id]
    );
    if (target.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    const u = target.rows[0];

    // Regla 2: último admin
    if (u.rol === "ADMIN") {
      const otrosAdmins = await pool.query(
        "SELECT COUNT(*)::int AS total FROM usuarios WHERE rol = 'ADMIN' AND id != $1",
        [id]
      );
      if (otrosAdmins.rows[0].total === 0) {
        return res.status(400).json({
          message: `No se puede eliminar a "${u.nombre}": es el único administrador del sistema. Crea otro administrador antes de eliminar a este.`,
        });
      }
    }

    // Regla 3: OWNER con unidades
    if (u.rol === "OWNER") {
      const owner = await pool.query("SELECT id FROM duenos WHERE usuario_id = $1", [id]);
      if (owner.rows.length > 0) {
        const dueno_id = owner.rows[0].id;
        const unidades = await pool.query(
          "SELECT COUNT(*)::int AS total FROM unidades WHERE dueno_id = $1",
          [dueno_id]
        );
        if (unidades.rows[0].total > 0) {
          return res.status(400).json({
            message: `No se puede eliminar a "${u.nombre}": tiene ${unidades.rows[0].total} unidad(es) registrada(s) como dueño. Reasigna las unidades a otro dueño o usa "Desactivar" para conservar el historial.`,
          });
        }
      }
    }

    // Regla 4: CHOFER con actividad
    if (u.rol === "CHOFER") {
      const chofer = await pool.query("SELECT id FROM choferes WHERE usuario_id = $1", [id]);
      if (chofer.rows.length > 0) {
        const chofer_id = chofer.rows[0].id;
        const unidadAsignada = await pool.query(
          "SELECT COUNT(*)::int AS total FROM unidades WHERE chofer_id = $1",
          [chofer_id]
        );
        if (unidadAsignada.rows[0].total > 0) {
          return res.status(400).json({
            message: `No se puede eliminar a "${u.nombre}": tiene ${unidadAsignada.rows[0].total} unidad(es) asignada(s). Reasigna esas unidades antes de eliminar al chofer.`,
          });
        }
        const reportes = await pool.query(
          "SELECT COUNT(*)::int AS total FROM reportes_llegada WHERE chofer_id = $1",
          [chofer_id]
        );
        if (reportes.rows[0].total > 0) {
          return res.status(400).json({
            message: `No se puede eliminar a "${u.nombre}": tiene ${reportes.rows[0].total} reporte(s) de llegada en su historial. Usa "Desactivar" para conservar el historial.`,
          });
        }
      }
    }

    // Regla 5: TECNICO con mantenimientos
    if (u.rol === "TECNICO") {
      const tec = await pool.query("SELECT id FROM tecnicos WHERE usuario_id = $1", [id]);
      if (tec.rows.length > 0) {
        const tecnico_id = tec.rows[0].id;
        const mant = await pool.query(
          "SELECT COUNT(*)::int AS total FROM mantenimientos WHERE tecnico_id = $1",
          [tecnico_id]
        );
        if (mant.rows[0].total > 0) {
          return res.status(400).json({
            message: `No se puede eliminar a "${u.nombre}": tiene ${mant.rows[0].total} mantenimiento(s) en su historial como técnico. Usa "Desactivar" para conservar el historial.`,
          });
        }
      }
    }

    // Regla 6: limpiar perfiles "vacíos" en cascada manual (porque las FKs son SET NULL).
    //   Si dejamos los perfiles huérfanos sin usuario_id, quedan basura imposible de
    //   reasociar. Por consistencia, los borramos junto con el usuario.
    await pool.query("DELETE FROM duenos   WHERE usuario_id = $1", [id]);
    await pool.query("DELETE FROM choferes WHERE usuario_id = $1", [id]);
    await pool.query("DELETE FROM tecnicos WHERE usuario_id = $1", [id]);

    await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
    res.json({ message: `Usuario "${u.nombre}" eliminado correctamente.` });
  } catch (error) {
    console.error("Error en deleteUser:", error);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
};

module.exports = { getUsers, suggestUsername, createUser, updateUser, toggleUserStatus, deleteUser };
