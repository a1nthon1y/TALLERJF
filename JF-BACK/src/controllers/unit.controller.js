const pool = require("../config/db");
const { evaluarMotorPredictivo } = require("../services/predictive-engine");

// ===================================================================
//  ✅ Crear una unidad
// ===================================================================
const createUnit = async (req, res) => {
  try {
    const { placa, modelo, año, tipo, chofer_id, kilometraje, dueno_id } = req.body;

    const tipoNorm = tipo?.toUpperCase();
    if (!placa || !modelo || !año || !tipoNorm) {
      return res.status(400).json({ message: "Faltan campos obligatorios (placa, modelo, año, tipo)" });
    }

    const result = await pool.query(
      `INSERT INTO unidades (placa, modelo, año, tipo, chofer_id, kilometraje, dueno_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [placa, modelo, año, tipoNorm, chofer_id || null, kilometraje || 0, dueno_id || null]
    );

    const nuevaUnidad = result.rows[0];

    // Inicializar baseline predictivo: una fila en estado_partes_unidad por
    // cada regla activa, con ultimo_mantenimiento_km = km actual de la unidad.
    // Esto evita el bug donde COALESCE(NULL, 0) producía "Vencido +X km" falso
    // en /partes-unidades para reglas que nunca habían sido reparadas en esta unidad.
    await pool.query(
      `INSERT INTO estado_partes_unidad
         (unidad_id, configuracion_parte_id, ultimo_mantenimiento_km, ultimo_mantenimiento_fecha)
       SELECT $1, cp.id, $2, NOW()
       FROM configuracion_partes cp
       WHERE cp.activo = TRUE
       ON CONFLICT (unidad_id, configuracion_parte_id) DO NOTHING`,
      [nuevaUnidad.id, nuevaUnidad.kilometraje || 0]
    );

    res.status(201).json({
      message: "Unidad creada correctamente",
      unidad: nuevaUnidad,
    });
  } catch (error) {
    console.error("Error al crear unidad:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ✅ Obtener todas las unidades con datos del dueño y chofer
const getAllUnits = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.placa, u.modelo, u.año, u.tipo, u.kilometraje, u.activo, u.creado_en,
        d.id AS dueno_id,
        us2.nombre AS dueno_nombre,
        us2.correo AS dueno_correo,
        us2.telefono AS dueno_telefono,
        us.id AS chofer_usuario_id, us.nombre AS chofer_nombre, us.correo AS chofer_correo,
        us.telefono AS chofer_telefono
      FROM unidades u
      LEFT JOIN duenos d ON u.dueno_id = d.id
      LEFT JOIN choferes c ON u.chofer_id = c.id
      LEFT JOIN usuarios us ON c.usuario_id = us.id
      LEFT JOIN usuarios us2 ON d.usuario_id = us2.id
      ORDER BY u.activo DESC, u.creado_en DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener unidades:", error);
    res.status(500).json({ error: "Error al obtener unidades" });
  }
};

// ===================================================================
//  ⚡🔥 Consulta MEJORADA: Obtener unidades por ID de dueño
// ===================================================================
const getUnitsByOwner = async (req, res) => {
  try {
    const { duenoId } = req.params;

    const result = await pool.query(
      `
      SELECT 
        u.id, u.placa, u.modelo, u.año, u.tipo, u.kilometraje, u.creado_en,

        -- datos del dueño
        d.id AS dueno_id,
        us2.nombre AS dueno_nombre,
        us2.correo AS dueno_correo,
        us2.telefono AS dueno_telefono,

        -- datos del chofer
        c.id AS chofer_id,
        us.nombre AS chofer_nombre,
        us.correo AS chofer_correo,
        us.telefono AS chofer_telefono

      FROM unidades u
      LEFT JOIN duenos d ON u.dueno_id = d.id
      LEFT JOIN usuarios us2 ON d.usuario_id = us2.id

      LEFT JOIN choferes c ON u.chofer_id = c.id
      LEFT JOIN usuarios us ON c.usuario_id = us.id
      
      WHERE u.dueno_id = $1
      ORDER BY u.creado_en DESC
      `,
      [duenoId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener unidades por dueño:", error);
    res.status(500).json({ error: "Error al obtener unidades por dueño" });
  }
};

// ===================================================================
//  ⚡🔥 Consulta MEJORADA: Obtener una unidad por ID
// ===================================================================
const getUnitById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        u.id, u.placa, u.modelo, u.año, u.tipo, u.kilometraje, 
        u.creado_en,

        -- dueño
        d.id AS dueno_id,
        us2.nombre AS dueno_nombre,
        us2.correo AS dueno_correo,
        us2.telefono AS dueno_telefono,

        -- chofer
        c.id AS chofer_id,
        us.nombre AS chofer_nombre,
        us.correo AS chofer_correo,
        c.licencia,
        us.telefono AS chofer_telefono

      FROM unidades u
      LEFT JOIN duenos d ON u.dueno_id = d.id
      LEFT JOIN usuarios us2 ON d.usuario_id = us2.id

      LEFT JOIN choferes c ON u.chofer_id = c.id
      LEFT JOIN usuarios us ON c.usuario_id = us.id

      WHERE u.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Unidad no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener unidad:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ===================================================================
//  🔧 Actualizar una unidad
//
//  Reglas para el campo `kilometraje`:
//    - ENCARGADO: solo puede AVANZARLO (nuevo ≥ actual). Cualquier intento de
//      reducirlo se rechaza con 400 y mensaje guiando a contactar al admin.
//    - ADMIN: puede establecer cualquier valor (corrige errores humanos del
//      chofer en ambos sentidos).
//
//  Si el km cambia (sin importar el rol), se dispara el motor predictivo
//  compartido (mismo helper que `crearReporteLlegada`):
//    - km sube → puede emitir nuevas alertas ACTIVO.
//    - km baja → resuelve alertas ACTIVO huérfanas (que existían por una
//      lectura inflada anterior).
//
//  No se inserta en `reportes_llegada`: la edición admin es una corrección,
//  no una bitácora del chofer. La trazabilidad queda en el `unidades.kilometraje`.
// ===================================================================
const updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { placa, modelo, año, tipo, chofer_id, kilometraje, dueno_id } = req.body;
    const isAdmin = req.user?.rol === "ADMIN";

    const current = await pool.query(
      "SELECT placa, kilometraje FROM unidades WHERE id = $1",
      [id]
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ message: "Unidad no encontrada" });
    }

    const placaActual = current.rows[0].placa;
    const kmActual = Number(current.rows[0].kilometraje) || 0;
    const kmNuevo = Number(kilometraje) || 0;
    const kmCambio = kmNuevo !== kmActual;

    if (kmCambio && !isAdmin && kmNuevo < kmActual) {
      return res.status(400).json({
        message: `No puedes reducir el kilometraje de la unidad ${placaActual}. Actual: ${kmActual.toLocaleString()} km, ingresaste ${kmNuevo.toLocaleString()} km. Solo un administrador puede corregir errores hacia atrás.`,
      });
    }

    const result = await pool.query(
      `UPDATE unidades
         SET placa = $1, modelo = $2, año = $3, tipo = $4, chofer_id = $5,
             kilometraje = $6, dueno_id = $7
       WHERE id = $8
       RETURNING *`,
      [placa, modelo, año, tipo?.toUpperCase(), chofer_id || null, kmNuevo, dueno_id, id]
    );

    let motor = null;
    let advertencias = [];

    if (kmCambio) {
      motor = await evaluarMotorPredictivo(id, kmNuevo);

      // ── Advertencia de inconsistencia histórica ──────────────────────────
      // Si el km nuevo es MENOR que algún mantenimiento ya registrado,
      // los registros históricos quedarán con kilometraje_actual > km actual
      // de la unidad (inconsistencia semántica). No bloqueamos — es una
      // corrección intencional del admin — pero avisamos para que lo tenga en cuenta.
      if (kmNuevo < kmActual) {
        const inconsistenteMant = await pool.query(
          `SELECT COUNT(*) AS total, MAX(kilometraje_actual) AS max_km
           FROM mantenimientos
           WHERE unidad_id = $1
             AND kilometraje_actual IS NOT NULL
             AND kilometraje_actual > $2`,
          [id, kmNuevo]
        );
        const totalInc = parseInt(inconsistenteMant.rows[0].total) || 0;
        if (totalInc > 0) {
          const maxKm = parseInt(inconsistenteMant.rows[0].max_km).toLocaleString();
          advertencias.push(
            `${totalInc} mantenimiento(s) registrado(s) muestran un km histórico mayor al nuevo valor ` +
            `(máx. ${maxKm} km). Los registros históricos no se modifican — esto es esperado en una ` +
            `corrección hacia atrás, pero puede confundir en reportes.`
          );
        }

        // También advertir si hay mantenimientos activos que verán el km
        // de la unidad reducido mientras están en proceso.
        const activosMant = await pool.query(
          `SELECT COUNT(*) AS total FROM mantenimientos
           WHERE unidad_id = $1 AND estado IN ('PENDIENTE','EN_PROCESO')`,
          [id]
        );
        const totalActivos = parseInt(activosMant.rows[0].total) || 0;
        if (totalActivos > 0) {
          advertencias.push(
            `Hay ${totalActivos} mantenimiento(s) activo(s) en esta unidad. El técnico asignado ` +
            `verá el km actualizado (${kmNuevo.toLocaleString()} km) en su pantalla.`
          );
        }
      }
    }

    let mensaje = "Unidad actualizada correctamente";
    if (motor) {
      const partes = [];
      if (motor.alertasGeneradas > 0) partes.push(`${motor.alertasGeneradas} alerta(s) nueva(s)`);
      if (motor.alertasResueltas > 0) partes.push(`${motor.alertasResueltas} alerta(s) resuelta(s)`);
      if (partes.length > 0) {
        mensaje = `Unidad actualizada — Motor predictivo: ${partes.join(", ")}.`;
      }
    }

    res.json({
      message: mensaje,
      advertencias: advertencias.length > 0 ? advertencias : undefined,
      unidad: result.rows[0],
      motor: motor || undefined,
    });
  } catch (error) {
    console.error("Error al actualizar unidad:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ===================================================================
//  🔁 Reasignar dueño de una unidad (sin tocar otros campos)
// ===================================================================
const reassignOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const { dueno_id } = req.body; // null = dejar sin dueño

    const unitCheck = await pool.query("SELECT id, placa FROM unidades WHERE id = $1", [id]);
    if (unitCheck.rows.length === 0) {
      return res.status(404).json({ message: "Unidad no encontrada" });
    }

    if (dueno_id != null) {
      const ownerCheck = await pool.query("SELECT id FROM duenos WHERE id = $1", [dueno_id]);
      if (ownerCheck.rows.length === 0) {
        return res.status(404).json({ message: "Dueño no encontrado" });
      }
    }

    const result = await pool.query(
      "UPDATE unidades SET dueno_id = $1 WHERE id = $2 RETURNING *",
      [dueno_id || null, id]
    );

    res.json({
      message: dueno_id ? "Dueño asignado correctamente" : "Dueño removido de la unidad",
      unidad: result.rows[0],
    });
  } catch (error) {
    console.error("Error al reasignar dueño:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ===================================================================
//  🔄 Activar / Desactivar unidad (soft disable)
// ===================================================================
const toggleUnitStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const unitCheck = await pool.query(
      `SELECT u.placa, u.activo, u.chofer_id, c_user.nombre AS chofer_nombre
         FROM unidades u
         LEFT JOIN choferes c     ON u.chofer_id = c.id
         LEFT JOIN usuarios c_user ON c.usuario_id = c_user.id
        WHERE u.id = $1`,
      [id]
    );
    if (unitCheck.rows.length === 0) {
      return res.status(404).json({ message: "Unidad no encontrada" });
    }

    const { placa, activo, chofer_nombre } = unitCheck.rows[0];

    // Recolectamos advertencias informativas (no bloqueantes) sobre el
    // impacto de desactivar. La asignación al chofer se mantiene a propósito
    // (al reactivar, vuelve a operar tal cual). Sí bloqueamos endpoints de
    // escritura (llegada, mantenimientos) en otros controllers.
    const advertencias = [];
    if (activo) {
      if (chofer_nombre) {
        advertencias.push(
          `Tiene asignado al chofer ${chofer_nombre}. Mientras esté desactivada, no podrá registrar llegadas ni reportar fallas. La asignación se mantiene para cuando reactives la unidad.`
        );
      }
      const mantsActivos = await pool.query(
        `SELECT COUNT(*)::int AS total FROM mantenimientos
          WHERE unidad_id = $1 AND estado IN ('PENDIENTE','EN_PROCESO')`,
        [id]
      );
      if (mantsActivos.rows[0].total > 0) {
        advertencias.push(
          `Tiene ${mantsActivos.rows[0].total} mantenimiento(s) activo(s) (PENDIENTE / EN_PROCESO). Esos trabajos seguirán visibles, pero no se podrán crear nuevos hasta reactivarla.`
        );
      }
    }

    const result = await pool.query(
      "UPDATE unidades SET activo = $1 WHERE id = $2 RETURNING activo",
      [!activo, id]
    );

    const nuevoEstado = result.rows[0].activo ? "activada" : "desactivada";
    res.json({
      message: `Unidad ${placa} ${nuevoEstado} correctamente`,
      activo: result.rows[0].activo,
      advertencias,
    });
  } catch (error) {
    console.error("Error al cambiar estado de unidad:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

//  🗑 Eliminar unidad
// ===================================================================
const deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la unidad existe
    const unitCheck = await pool.query("SELECT placa FROM unidades WHERE id = $1", [id]);
    if (unitCheck.rows.length === 0) {
      return res.status(404).json({ message: "Unidad no encontrada" });
    }

    // Bloquear si tiene mantenimientos activos (PENDIENTE o EN_PROCESO)
    const activeCheck = await pool.query(
      `SELECT COUNT(*) FROM mantenimientos
       WHERE unidad_id = $1 AND estado IN ('PENDIENTE','EN_PROCESO')`,
      [id]
    );
    if (parseInt(activeCheck.rows[0].count) > 0) {
      return res.status(400).json({
        message: `No se puede eliminar la unidad ${unitCheck.rows[0].placa}: tiene ${activeCheck.rows[0].count} mantenimiento(s) activo(s). Ciérralos antes de eliminar la unidad.`,
      });
    }

    // Advertir si tiene historial (pero permitir si todos están cerrados)
    const historyCheck = await pool.query(
      "SELECT COUNT(*) FROM mantenimientos WHERE unidad_id = $1",
      [id]
    );
    if (parseInt(historyCheck.rows[0].count) > 0) {
      return res.status(400).json({
        message: `No se puede eliminar la unidad ${unitCheck.rows[0].placa}: tiene ${historyCheck.rows[0].count} registro(s) de mantenimiento en su historial. Elimina primero esos registros desde la sección Mantenimientos.`,
      });
    }

    await pool.query("DELETE FROM estado_partes_unidad WHERE unidad_id = $1", [id]);
    await pool.query("DELETE FROM alertas_mantenimiento WHERE unidad_id = $1", [id]);
    await pool.query("DELETE FROM unidades WHERE id = $1", [id]);

    res.json({ message: "Unidad eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar unidad:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// Unidades del OWNER autenticado (busca dueno por usuario_id del token)
const getMyUnits = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const duenoPQuery = await pool.query(
      "SELECT id FROM duenos WHERE usuario_id = $1",
      [usuario_id]
    );
    if (duenoPQuery.rows.length === 0) {
      return res.status(404).json({ message: "No se encontró perfil de dueño para este usuario" });
    }
    const dueno_id = duenoPQuery.rows[0].id;

    const result = await pool.query(
      `SELECT 
         u.id, u.placa, u.modelo, u.año, u.tipo, u.kilometraje, u.creado_en,
         c.id AS chofer_id,
         us.nombre AS chofer_nombre,
         us.correo AS chofer_correo
       FROM unidades u
       LEFT JOIN choferes c ON u.chofer_id = c.id
       LEFT JOIN usuarios us ON c.usuario_id = us.id
       WHERE u.dueno_id = $1
       ORDER BY u.placa`,
      [dueno_id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener tus unidades" });
  }
};

module.exports = {
  createUnit,
  getAllUnits,
  getUnitsByOwner,
  getUnitById,
  updateUnit,
  reassignOwner,
  toggleUnitStatus,
  deleteUnit,
  getMyUnits,
};
