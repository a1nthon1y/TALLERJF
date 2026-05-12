const pool = require("../config/db");

// Genera un código único: PRV-YYMM-NNNN | CRR-YYMM-NNNN | CAM-YYMM-NNNN
// Exportado para ser usado en otros controladores (ej: chofer.controller)
async function generarCodigo(tipo, estado = null) {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');

  let prefix;
  if (tipo === 'PREVENTIVO') prefix = 'PRV';
  else if (estado === 'REALIZADO') prefix = 'CAM';
  else prefix = 'CRR';

  const pattern = `${prefix}-${yy}${mm}-%`;
  const { rows } = await pool.query(
    `SELECT COUNT(*) FROM mantenimientos WHERE codigo LIKE $1`,
    [pattern]
  );
  const seq = String(parseInt(rows[0].count) + 1).padStart(4, '0');
  return `${prefix}-${yy}${mm}-${seq}`;
}

// Registrar un mantenimiento (preventivo o correctivo) con kilometraje y TECNICO
const createMaintenance = async (req, res) => {
  try {
    const { unidad_id, tipo, observaciones, kilometraje_actual, tecnico_id, partes_programadas } = req.body;

    // Normalizar tipo a mayúsculas (la DB requiere PREVENTIVO/CORRECTIVO)
    const tipoNorm = (tipo || "CORRECTIVO").toUpperCase();

    // Verificar si la unidad existe
    const unidad = await pool.query("SELECT * FROM unidades WHERE id = $1", [unidad_id]);
    if (unidad.rows.length === 0) {
      return res.status(404).json({ message: "Unidad no encontrada" });
    }

    const codigo = await generarCodigo(tipoNorm);
    const partesJSON = JSON.stringify(Array.isArray(partes_programadas) ? partes_programadas.map(Number) : []);

    // Registrar el mantenimiento incluyendo partes_programadas
    const result = await pool.query(
      `INSERT INTO mantenimientos (unidad_id, tipo, observaciones, kilometraje_actual, tecnico_id, codigo, partes_programadas) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [unidad_id, tipoNorm, observaciones, kilometraje_actual, tecnico_id || null, codigo, partesJSON]
    );

    // Actualizar el kilometraje de la unidad
    await pool.query(
      `UPDATE unidades SET kilometraje = $1 WHERE id = $2`,
      [kilometraje_actual, unidad_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener todos los mantenimientos
const getAllMaintenances = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*,
             u.placa,
             u.modelo,
             t.nombre AS tecnico_nombre
      FROM mantenimientos m
      JOIN unidades u ON m.unidad_id = u.id
      LEFT JOIN tecnicos t ON m.tecnico_id = t.id
      ORDER BY m.fecha_solicitud DESC
    `);
    res.json(result.rows.map(normalizeMaint));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener un mantenimiento por ID
// Normaliza partes_programadas a array (puede llegar como string si el driver no parsea JSONB)
const normalizeMaint = (row) => {
  if (!row) return row;
  let pp = row.partes_programadas;
  if (typeof pp === "string") { try { pp = JSON.parse(pp); } catch (_) { pp = []; } }
  return { ...row, partes_programadas: Array.isArray(pp) ? pp : [] };
};

const getMaintenanceById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query("SELECT * FROM mantenimientos WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Mantenimiento no encontrado" });
    }

    res.json(normalizeMaint(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Actualizar estado de un mantenimiento (ejemplo: completado) y RESETEAR contadores
const updateMaintenanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, partes_reparadas, tecnico_id } = req.body;

    const mantQuery = await pool.query("SELECT * FROM mantenimientos WHERE id = $1", [id]);
    if (mantQuery.rows.length === 0) return res.status(404).json({ message: "Mantenimiento no encontrado" });
    const m = mantQuery.rows[0];

    const estadoNorm = estado?.toUpperCase();

    // Validar que tecnico_id sea obligatorio al completar
    if (estadoNorm === "COMPLETADO" && !tecnico_id) {
      return res.status(400).json({ message: "tecnico_id es obligatorio para marcar como COMPLETADO" });
    }

    const result = await pool.query(
      `UPDATE mantenimientos 
       SET estado = $1, fecha_realizacion = NOW(), tecnico_id = COALESCE($3, tecnico_id)
       WHERE id = $2 RETURNING *`,
      [estadoNorm, id, tecnico_id || null]
    );

    // CASUÍSTICA 3: Si se completó la reparación e indicaron piezas cambiadas, resetear sus predicciones
    if (estadoNorm === "COMPLETADO" && partes_reparadas && partes_reparadas.length > 0) {
       for (let p_id of partes_reparadas) {
         await pool.query(
           `INSERT INTO estado_partes_unidad (unidad_id, configuracion_parte_id, ultimo_mantenimiento_km, ultimo_mantenimiento_fecha)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (unidad_id, configuracion_parte_id) 
            DO UPDATE SET ultimo_mantenimiento_km = EXCLUDED.ultimo_mantenimiento_km, ultimo_mantenimiento_fecha = NOW()`,
           [m.unidad_id, p_id, m.kilometraje_actual || 0]
         );
         
         // Limpiar alertas
         await pool.query(
            `UPDATE alertas_mantenimiento SET estado = 'RESUELTO' 
             WHERE unidad_id = $1 AND parte_id = $2`,
            [m.unidad_id, p_id]
         );
       }
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener mantenimientos filtrados por unidad (usado por chofer y owner)
const getMaintenancesByUnit = async (req, res) => {
  try {
    const { unidadId } = req.params;
    const result = await pool.query(
      `SELECT m.*, u.placa, t.nombre AS tecnico_nombre,
              COALESCE(mat_resumen.nombres_materiales, '') AS materiales_usados,
              COALESCE(mat_resumen.materiales_detalle, '[]'::json) AS materiales_detalle
       FROM mantenimientos m
       JOIN unidades u ON m.unidad_id = u.id
       LEFT JOIN tecnicos t ON m.tecnico_id = t.id
       LEFT JOIN (
         SELECT dm.mantenimiento_id,
                STRING_AGG(mat.nombre, ', ') AS nombres_materiales,
                json_agg(json_build_object(
                  'nombre', mat.nombre,
                  'cantidad', dm.cantidad
                )) AS materiales_detalle
         FROM detalles_mantenimiento dm
         JOIN materiales mat ON dm.material_id = mat.id
         GROUP BY dm.mantenimiento_id
       ) mat_resumen ON mat_resumen.mantenimiento_id = m.id
       WHERE m.unidad_id = $1
       ORDER BY m.fecha_solicitud DESC`,
      [unidadId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener mantenimientos de la unidad" });
  }
};

// Técnico ve sus trabajos asignados (solo los de su registro en tecnicos)
const getMyJobs = async (req, res) => {
  try {
    const tecnicoResult = await pool.query(
      "SELECT id FROM tecnicos WHERE usuario_id = $1",
      [req.user.id]
    );
    if (tecnicoResult.rows.length === 0) {
      return res.status(404).json({ message: "No tienes un registro de técnico asociado a tu usuario" });
    }
    const tecnicoId = tecnicoResult.rows[0].id;

    const result = await pool.query(
      `SELECT m.*, u.placa, u.modelo, u.kilometraje AS kilometraje_unidad,
              c.nombre AS chofer_nombre
       FROM mantenimientos m
       JOIN unidades u ON m.unidad_id = u.id
       LEFT JOIN choferes ch ON ch.id = u.chofer_id
       LEFT JOIN usuarios c ON ch.usuario_id = c.id
       WHERE m.tecnico_id = $1
       ORDER BY m.fecha_solicitud DESC`,
      [tecnicoId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Técnico actualiza el estado de su propio trabajo (solo EN_PROCESO o COMPLETADO)
// Al completar, puede indicar partes_reparadas y notas_tecnico
const updateMyJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, partes_reparadas = [], notas_tecnico } = req.body;
    const estadoNorm = estado?.toUpperCase();

    if (!["EN_PROCESO", "COMPLETADO"].includes(estadoNorm)) {
      return res.status(400).json({ message: "Solo puedes cambiar el estado a EN_PROCESO o COMPLETADO" });
    }

    const tecnicoResult = await pool.query(
      "SELECT id FROM tecnicos WHERE usuario_id = $1",
      [req.user.id]
    );
    if (tecnicoResult.rows.length === 0) {
      return res.status(403).json({ message: "No tienes un registro de técnico asociado" });
    }
    const tecnicoId = tecnicoResult.rows[0].id;

    const mantResult = await pool.query("SELECT * FROM mantenimientos WHERE id = $1", [id]);
    if (mantResult.rows.length === 0) {
      return res.status(404).json({ message: "Mantenimiento no encontrado" });
    }
    const m = mantResult.rows[0];
    if (m.tecnico_id !== tecnicoId) {
      return res.status(403).json({ message: "Este mantenimiento no está asignado a ti" });
    }
    if (m.estado === "CERRADO") {
      return res.status(400).json({ message: "No puedes modificar un mantenimiento ya cerrado" });
    }

    // Append notas del técnico a las observaciones si se proveen
    let finalObs = m.observaciones || "";
    if (estadoNorm === "COMPLETADO" && notas_tecnico?.trim()) {
      finalObs = finalObs
        ? `${finalObs}\n\n--- NOTAS DEL TÉCNICO ---\n${notas_tecnico.trim()}`
        : `--- NOTAS DEL TÉCNICO ---\n${notas_tecnico.trim()}`;
    }

    const result = await pool.query(
      `UPDATE mantenimientos
       SET estado = $1,
           fecha_realizacion = CASE WHEN $2 = 'COMPLETADO' THEN NOW() ELSE fecha_realizacion END,
           observaciones = $3
       WHERE id = $4 RETURNING *`,
      [estadoNorm, estadoNorm, finalObs, id]
    );

    // Si completado con partes indicadas, resetear contadores predictivos
    if (estadoNorm === "COMPLETADO" && Array.isArray(partes_reparadas) && partes_reparadas.length > 0) {
      for (const p_id of partes_reparadas) {
        await pool.query(
          `INSERT INTO estado_partes_unidad (unidad_id, configuracion_parte_id, ultimo_mantenimiento_km, ultimo_mantenimiento_fecha)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (unidad_id, configuracion_parte_id)
           DO UPDATE SET ultimo_mantenimiento_km = EXCLUDED.ultimo_mantenimiento_km,
                         ultimo_mantenimiento_fecha = NOW()`,
          [m.unidad_id, p_id, m.kilometraje_actual || 0]
        );
        await pool.query(
          `UPDATE alertas_mantenimiento SET estado = 'RESUELTO' WHERE unidad_id = $1 AND parte_id = $2`,
          [m.unidad_id, p_id]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Encargado/Admin cierra/aprueba el mantenimiento (COMPLETADO → CERRADO)
const closeMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones_cierre } = req.body;

    const mantResult = await pool.query("SELECT * FROM mantenimientos WHERE id = $1", [id]);
    if (mantResult.rows.length === 0) {
      return res.status(404).json({ message: "Mantenimiento no encontrado" });
    }
    if (mantResult.rows[0].estado !== "COMPLETADO") {
      return res.status(400).json({ message: "Solo se puede cerrar un mantenimiento en estado COMPLETADO" });
    }

    const obsActual = mantResult.rows[0].observaciones || "";
    const obsNueva = observaciones_cierre
      ? `${obsActual}\n\n--- CIERRE DEL ENCARGADO ---\n${observaciones_cierre}`
      : obsActual;

    const result = await pool.query(
      "UPDATE mantenimientos SET estado = 'CERRADO', observaciones = $1 WHERE id = $2 RETURNING *",
      [obsNueva, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Eliminar un mantenimiento (solo ADMIN, solo si está PENDIENTE)
const deleteMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const mant = await pool.query("SELECT estado FROM mantenimientos WHERE id = $1", [id]);
    if (mant.rows.length === 0)
      return res.status(404).json({ message: "Mantenimiento no encontrado" });
    if (mant.rows[0].estado !== "PENDIENTE")
      return res.status(400).json({ message: "Solo se pueden eliminar mantenimientos en estado PENDIENTE" });

    await pool.query("DELETE FROM detalles_mantenimiento WHERE mantenimiento_id = $1", [id]);
    await pool.query("DELETE FROM mantenimientos WHERE id = $1", [id]);
    res.json({ message: "Mantenimiento eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reasignar técnico (ADMIN/ENCARGADO, no CERRADO)
// Editar mantenimiento completo (ADMIN/ENCARGADO) — unifica estado, técnico, observaciones y partes
const editMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, tecnico_id, observaciones, nota_adicional, partes_reparadas, partes_programadas } = req.body;

    const mantQuery = await pool.query("SELECT * FROM mantenimientos WHERE id = $1", [id]);
    if (mantQuery.rows.length === 0)
      return res.status(404).json({ message: "Mantenimiento no encontrado" });
    const m = mantQuery.rows[0];

    // CERRADO es estado final — no se puede alterar (integridad para los dueños)
    if (m.estado === "CERRADO")
      return res.status(400).json({ message: "Un mantenimiento cerrado no puede ser modificado" });

    const estadoNorm = estado ? estado.toUpperCase() : m.estado;
    const userRole = req.user?.rol;
    const isAdmin = userRole === "ADMIN";

    // Encargado: forward-only · Admin: libre (puede corregir errores)
    const TRANSICIONES_ENCARGADO = {
      PENDIENTE:  ["EN_PROCESO", "COMPLETADO"],
      EN_PROCESO: ["COMPLETADO"],
      COMPLETADO: [], // encargado solo cierra via closeMaintenance
    };

    if (estadoNorm !== m.estado) {
      if (estadoNorm === "CERRADO")
        return res.status(400).json({ message: "Para cerrar un mantenimiento use la acción 'Cerrar / Aprobar'" });
      if (!isAdmin && !TRANSICIONES_ENCARGADO[m.estado]?.includes(estadoNorm))
        return res.status(400).json({
          message: `Solo el ADMIN puede retroceder estados. Cambio ${m.estado} → ${estadoNorm} no permitido para ${userRole}.`
        });
      // Admin sí puede retroceder libremente entre PENDIENTE/EN_PROCESO/COMPLETADO
    }

    // tecnico_id obligatorio al avanzar a COMPLETADO
    const finalTecnicoId = tecnico_id != null ? (tecnico_id || null) : m.tecnico_id;
    if (estadoNorm === "COMPLETADO" && !finalTecnicoId)
      return res.status(400).json({ message: "El técnico es obligatorio al marcar como Completado" });

    if (finalTecnicoId) {
      const tec = await pool.query("SELECT id FROM tecnicos WHERE id = $1", [finalTecnicoId]);
      if (tec.rows.length === 0)
        return res.status(404).json({ message: "Técnico no encontrado" });
    }

    // Nunca sobrescribir historial — solo agregar nueva nota al final
    let finalObs = m.observaciones || "";
    if (nota_adicional?.trim()) {
      finalObs = finalObs
        ? `${finalObs}\n\n--- NOTA DEL ENCARGADO ---\n${nota_adicional.trim()}`
        : nota_adicional.trim();
    }

    const setFecha = ['COMPLETADO', 'EN_PROCESO'].includes(estadoNorm) && !m.fecha_realizacion;

    // Actualizar partes_programadas si se envían (permite editar el plan)
    const finalPartesProg = Array.isArray(partes_programadas)
      ? JSON.stringify(partes_programadas.map(Number))
      : null;

    const result = await pool.query(
      `UPDATE mantenimientos
       SET estado              = $1,
           tecnico_id          = $2,
           observaciones       = $3,
           fecha_realizacion   = COALESCE(fecha_realizacion, $5),
           partes_programadas  = COALESCE($6::jsonb, partes_programadas)
       WHERE id = $4
       RETURNING *`,
      [estadoNorm, finalTecnicoId, finalObs, id, setFecha ? new Date() : m.fecha_realizacion, finalPartesProg]
    );

    // Resetear contadores predictivos al completar con partes indicadas
    if (estadoNorm === "COMPLETADO" && Array.isArray(partes_reparadas) && partes_reparadas.length > 0) {
      for (const p_id of partes_reparadas) {
        await pool.query(
          `INSERT INTO estado_partes_unidad (unidad_id, configuracion_parte_id, ultimo_mantenimiento_km, ultimo_mantenimiento_fecha)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (unidad_id, configuracion_parte_id)
           DO UPDATE SET ultimo_mantenimiento_km = EXCLUDED.ultimo_mantenimiento_km,
                         ultimo_mantenimiento_fecha = NOW()`,
          [m.unidad_id, p_id, m.kilometraje_actual || 0]
        );
        await pool.query(
          `UPDATE alertas_mantenimiento SET estado = 'RESUELTO'
           WHERE unidad_id = $1 AND parte_id = $2`,
          [m.unidad_id, p_id]
        );
      }
    }

    res.json(normalizeMaint(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const assignTecnico = async (req, res) => {
  try {
    const { id } = req.params;
    const { tecnico_id } = req.body;

    const mant = await pool.query("SELECT estado FROM mantenimientos WHERE id = $1", [id]);
    if (mant.rows.length === 0)
      return res.status(404).json({ message: "Mantenimiento no encontrado" });
    if (mant.rows[0].estado === "CERRADO")
      return res.status(400).json({ message: "No se puede reasignar un mantenimiento cerrado" });

    // Si tecnico_id es null se desasigna
    if (tecnico_id) {
      const tec = await pool.query("SELECT id FROM tecnicos WHERE id = $1", [tecnico_id]);
      if (tec.rows.length === 0)
        return res.status(404).json({ message: "Técnico no encontrado" });
    }

    const result = await pool.query(
      "UPDATE mantenimientos SET tecnico_id = $1 WHERE id = $2 RETURNING *",
      [tecnico_id || null, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Editar observaciones de un mantenimiento (ADMIN/ENCARGADO, no CERRADO)
const updateObservaciones = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;
    if (!observaciones?.trim())
      return res.status(400).json({ message: "Las observaciones no pueden estar vacías" });

    const mant = await pool.query("SELECT estado FROM mantenimientos WHERE id = $1", [id]);
    if (mant.rows.length === 0)
      return res.status(404).json({ message: "Mantenimiento no encontrado" });
    if (mant.rows[0].estado === "CERRADO")
      return res.status(400).json({ message: "No se puede editar un mantenimiento cerrado" });

    const result = await pool.query(
      "UPDATE mantenimientos SET observaciones = $1 WHERE id = $2 RETURNING *",
      [observaciones.trim(), id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  generarCodigo,
  createMaintenance,
  getAllMaintenances,
  getMaintenanceById,
  updateMaintenanceStatus,
  getMaintenancesByUnit,
  getMyJobs,
  updateMyJobStatus,
  closeMaintenance,
  deleteMaintenance,
  updateObservaciones,
  assignTecnico,
  editMaintenance,
};
