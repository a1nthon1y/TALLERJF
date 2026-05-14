const pool = require("../config/db");
const { sendReport } = require("../utils/report-export");

/**
 * Convención compartida:
 *   Todos los endpoints aceptan ?formato=json|xlsx|pdf (json por defecto).
 *   La forma JSON devuelve { titulo, subtitulo, filtros, columnas, rows, totales }
 *   para que el frontend pueda renderizar exactamente lo mismo que el archivo
 *   descargable (preview WYSIWYG).
 */

// ─── Helpers de filtros ─────────────────────────────────────────────────────
const parseDate = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const fmtFiltrosTexto = (filtros) => {
  const out = {};
  if (filtros.desde && filtros.hasta) out.Período = `${filtros.desde} → ${filtros.hasta}`;
  else if (filtros.desde)             out.Período = `Desde ${filtros.desde}`;
  else if (filtros.hasta)             out.Período = `Hasta ${filtros.hasta}`;
  if (filtros.tipo)                   out.Tipo    = filtros.tipo;
  if (filtros.estado)                 out.Estado  = filtros.estado;
  if (filtros.dueno_nombre)           out.Dueño   = filtros.dueno_nombre;
  if (filtros.unidad_placa)           out.Unidad  = filtros.unidad_placa;
  if (filtros.tecnico_nombre)         out.Técnico = filtros.tecnico_nombre;
  return out;
};

// ════════════════════════════════════════════════════════════════════════════
// 1. MANTENIMIENTOS POR PERÍODO (admin / encargado)
// ════════════════════════════════════════════════════════════════════════════
const getMaintenanceReport = async (req, res) => {
  try {
    const { desde, hasta, tipo, estado, dueno_id, unidad_id, tecnico_id, formato } = req.query;

    const where = [];
    const params = [];
    let i = 1;

    if (parseDate(desde))  { where.push(`m.fecha_solicitud >= $${i++}`); params.push(desde); }
    if (parseDate(hasta))  { where.push(`m.fecha_solicitud <= $${i++}`); params.push(hasta); }
    if (tipo)              { where.push(`UPPER(m.tipo) = UPPER($${i++})`); params.push(tipo); }
    if (estado)            { where.push(`UPPER(m.estado) = UPPER($${i++})`); params.push(estado); }
    if (dueno_id)          { where.push(`u.dueno_id = $${i++}`); params.push(dueno_id); }
    if (unidad_id)         { where.push(`u.id = $${i++}`); params.push(unidad_id); }
    if (tecnico_id)        { where.push(`m.tecnico_id = $${i++}`); params.push(tecnico_id); }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        m.id                                         AS mantenimiento_id,
        m.codigo,
        u.placa                                      AS unidad,
        u.modelo,
        UPPER(m.tipo)                                AS tipo,
        UPPER(m.estado)                              AS estado,
        m.fecha_solicitud,
        m.fecha_realizacion,
        m.kilometraje_actual,
        us2.nombre                                   AS dueno_nombre,
        t.nombre                                     AS tecnico_nombre,
        COALESCE(mat.costo_total, 0)::numeric(12,2)  AS costo_total
      FROM mantenimientos m
      JOIN unidades u            ON m.unidad_id = u.id
      LEFT JOIN duenos d         ON u.dueno_id = d.id
      LEFT JOIN usuarios us2     ON d.usuario_id = us2.id
      LEFT JOIN tecnicos t       ON m.tecnico_id = t.id
      LEFT JOIN (
        SELECT mantenimiento_id, SUM(costo_total) AS costo_total
        FROM detalles_mantenimiento
        GROUP BY mantenimiento_id
      ) mat ON mat.mantenimiento_id = m.id
      ${whereSQL}
      ORDER BY m.fecha_solicitud DESC
    `;
    const result = await pool.query(sql, params);

    // Datos auxiliares para cabecera (resolver nombres de FKs)
    const filtrosTexto = { desde, hasta, tipo, estado };
    if (dueno_id) {
      const r = await pool.query("SELECT us.nombre FROM duenos d JOIN usuarios us ON d.usuario_id = us.id WHERE d.id = $1", [dueno_id]);
      filtrosTexto.dueno_nombre = r.rows[0]?.nombre;
    }
    if (unidad_id) {
      const r = await pool.query("SELECT placa FROM unidades WHERE id = $1", [unidad_id]);
      filtrosTexto.unidad_placa = r.rows[0]?.placa;
    }
    if (tecnico_id) {
      const r = await pool.query("SELECT nombre FROM tecnicos WHERE id = $1", [tecnico_id]);
      filtrosTexto.tecnico_nombre = r.rows[0]?.nombre;
    }

    const totalCosto = result.rows.reduce((s, r) => s + Number(r.costo_total || 0), 0);

    return sendReport(res, {
      formato,
      titulo: "Mantenimientos por período",
      subtitulo: `${result.rows.length} mantenimiento(s) encontrado(s)`,
      filtros: fmtFiltrosTexto(filtrosTexto),
      columnas: [
        { key: "codigo",             label: "Código",        width: 12 },
        { key: "fecha_solicitud",    label: "Fecha sol.",    width: 12, type: "date" },
        { key: "unidad",             label: "Unidad",        width: 12 },
        { key: "modelo",             label: "Modelo",        width: 14 },
        { key: "tipo",               label: "Tipo",          width: 11 },
        { key: "estado",             label: "Estado",        width: 12 },
        { key: "kilometraje_actual", label: "Km",            width: 10, type: "number" },
        { key: "tecnico_nombre",     label: "Técnico",       width: 16 },
        { key: "dueno_nombre",       label: "Dueño",         width: 16 },
        { key: "costo_total",        label: "Costo materiales", width: 14, type: "currency" },
      ],
      rows: result.rows,
      totales: { costo_total: totalCosto },
      filename: `mantenimientos_${desde || "inicio"}_${hasta || "hoy"}`,
    });
  } catch (error) {
    console.error("Error en getMaintenanceReport:", error);
    res.status(500).json({ message: "Error al obtener reporte de mantenimientos" });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 2. ESTADO DE CUENTA DEL DUEÑO (owner)
//    Cada fila es un mantenimiento de sus unidades, con costo desglosado.
// ════════════════════════════════════════════════════════════════════════════
const getOwnerStatement = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const { desde, hasta, unidad_id, formato } = req.query;

    const dueno = await pool.query("SELECT id FROM duenos WHERE usuario_id = $1", [usuario_id]);
    if (dueno.rows.length === 0) {
      return res.status(404).json({ message: "No se encontró perfil de dueño asociado a tu usuario." });
    }
    const dueno_id = dueno.rows[0].id;
    const ownerInfo = await pool.query(
      "SELECT us.nombre, us.correo FROM duenos d JOIN usuarios us ON d.usuario_id = us.id WHERE d.id = $1",
      [dueno_id]
    );

    const where = ["u.dueno_id = $1"];
    const params = [dueno_id];
    let i = 2;
    if (parseDate(desde)) { where.push(`m.fecha_solicitud >= $${i++}`); params.push(desde); }
    if (parseDate(hasta)) { where.push(`m.fecha_solicitud <= $${i++}`); params.push(hasta); }
    if (unidad_id)        { where.push(`u.id = $${i++}`); params.push(unidad_id); }

    const sql = `
      SELECT
        m.codigo,
        m.fecha_solicitud,
        m.fecha_realizacion,
        u.placa                                      AS unidad,
        u.modelo,
        UPPER(m.tipo)                                AS tipo,
        UPPER(m.estado)                              AS estado,
        m.kilometraje_actual,
        t.nombre                                     AS tecnico_nombre,
        COALESCE(mat.costo_total, 0)::numeric(12,2)  AS costo_total,
        COALESCE(mat.materiales, '')                 AS materiales_resumen
      FROM mantenimientos m
      JOIN unidades u           ON m.unidad_id = u.id
      LEFT JOIN tecnicos t      ON m.tecnico_id = t.id
      LEFT JOIN (
        SELECT dm.mantenimiento_id,
               SUM(dm.costo_total)                                      AS costo_total,
               STRING_AGG(mat.nombre || ' x' || dm.cantidad, ', ')      AS materiales
        FROM detalles_mantenimiento dm
        JOIN materiales mat ON dm.material_id = mat.id
        GROUP BY dm.mantenimiento_id
      ) mat ON mat.mantenimiento_id = m.id
      WHERE ${where.join(" AND ")}
      ORDER BY m.fecha_solicitud DESC
    `;
    const result = await pool.query(sql, params);

    // Filtro de unidad bonito
    let unidadPlaca;
    if (unidad_id) {
      const r = await pool.query("SELECT placa FROM unidades WHERE id = $1", [unidad_id]);
      unidadPlaca = r.rows[0]?.placa;
    }
    const totalCosto = result.rows.reduce((s, r) => s + Number(r.costo_total || 0), 0);

    return sendReport(res, {
      formato,
      titulo: "Estado de cuenta",
      subtitulo: `${ownerInfo.rows[0]?.nombre || "Dueño"} — ${result.rows.length} mantenimiento(s)`,
      filtros: fmtFiltrosTexto({ desde, hasta, unidad_placa: unidadPlaca }),
      columnas: [
        { key: "codigo",             label: "Código",     width: 12 },
        { key: "fecha_realizacion",  label: "Fecha",      width: 12, type: "date" },
        { key: "unidad",             label: "Unidad",     width: 11 },
        { key: "tipo",               label: "Tipo",       width: 11 },
        { key: "estado",             label: "Estado",     width: 12 },
        { key: "kilometraje_actual", label: "Km",         width: 9,  type: "number" },
        { key: "tecnico_nombre",     label: "Técnico",    width: 14 },
        { key: "materiales_resumen", label: "Materiales", width: 30 },
        { key: "costo_total",        label: "Costo",      width: 12, type: "currency" },
      ],
      rows: result.rows,
      totales: { costo_total: totalCosto },
      filename: `estado_cuenta_${desde || "inicio"}_${hasta || "hoy"}`,
    });
  } catch (error) {
    console.error("Error en getOwnerStatement:", error);
    res.status(500).json({ message: "Error al obtener estado de cuenta" });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 3. PRODUCTIVIDAD POR TÉCNICO (admin / encargado)
//    Una fila por técnico con métricas agregadas en el período.
// ════════════════════════════════════════════════════════════════════════════
const getTechnicianProductivity = async (req, res) => {
  try {
    const { desde, hasta, tecnico_id, formato } = req.query;

    const where = ["m.tecnico_id IS NOT NULL"];
    const params = [];
    let i = 1;
    if (parseDate(desde)) { where.push(`m.fecha_solicitud >= $${i++}`); params.push(desde); }
    if (parseDate(hasta)) { where.push(`m.fecha_solicitud <= $${i++}`); params.push(hasta); }
    if (tecnico_id)       { where.push(`m.tecnico_id = $${i++}`); params.push(tecnico_id); }

    const sql = `
      SELECT
        t.id,
        t.nombre                                                AS tecnico,
        t.especialidad,
        COUNT(m.id)                                             AS total_asignados,
        COUNT(*) FILTER (WHERE UPPER(m.estado) IN ('COMPLETADO','CERRADO','REALIZADO'))      AS total_completados,
        COUNT(*) FILTER (WHERE UPPER(m.estado) IN ('PENDIENTE','EN_PROCESO'))                AS total_en_curso,
        COUNT(*) FILTER (WHERE UPPER(m.tipo)   = 'PREVENTIVO') AS total_preventivos,
        COUNT(*) FILTER (WHERE UPPER(m.tipo)   = 'CORRECTIVO') AS total_correctivos,
        COALESCE(SUM(mat.costo_total), 0)::numeric(12,2)        AS costo_materiales,
        ROUND(AVG(EXTRACT(EPOCH FROM (m.fecha_realizacion - m.fecha_solicitud)) / 3600.0)
              FILTER (WHERE m.fecha_realizacion IS NOT NULL)::numeric, 1)                    AS horas_promedio
      FROM mantenimientos m
      JOIN tecnicos t ON m.tecnico_id = t.id
      LEFT JOIN (
        SELECT mantenimiento_id, SUM(costo_total) AS costo_total
        FROM detalles_mantenimiento
        GROUP BY mantenimiento_id
      ) mat ON mat.mantenimiento_id = m.id
      WHERE ${where.join(" AND ")}
      GROUP BY t.id, t.nombre, t.especialidad
      ORDER BY total_completados DESC, total_asignados DESC
    `;
    const result = await pool.query(sql, params);

    let tecnicoNombre;
    if (tecnico_id) {
      const r = await pool.query("SELECT nombre FROM tecnicos WHERE id = $1", [tecnico_id]);
      tecnicoNombre = r.rows[0]?.nombre;
    }

    const totales = {
      total_asignados:    result.rows.reduce((s, r) => s + Number(r.total_asignados),    0),
      total_completados:  result.rows.reduce((s, r) => s + Number(r.total_completados),  0),
      total_en_curso:     result.rows.reduce((s, r) => s + Number(r.total_en_curso),     0),
      total_preventivos:  result.rows.reduce((s, r) => s + Number(r.total_preventivos),  0),
      total_correctivos:  result.rows.reduce((s, r) => s + Number(r.total_correctivos),  0),
      costo_materiales:   result.rows.reduce((s, r) => s + Number(r.costo_materiales),   0),
    };

    return sendReport(res, {
      formato,
      titulo: "Productividad por técnico",
      subtitulo: `${result.rows.length} técnico(s) con actividad`,
      filtros: fmtFiltrosTexto({ desde, hasta, tecnico_nombre: tecnicoNombre }),
      columnas: [
        { key: "tecnico",            label: "Técnico",       width: 18 },
        { key: "especialidad",       label: "Especialidad",  width: 16 },
        { key: "total_asignados",    label: "Asignados",     width: 11, type: "number" },
        { key: "total_completados",  label: "Completados",   width: 12, type: "number" },
        { key: "total_en_curso",     label: "En curso",      width: 11, type: "number" },
        { key: "total_preventivos",  label: "Preventivos",   width: 12, type: "number" },
        { key: "total_correctivos",  label: "Correctivos",   width: 12, type: "number" },
        { key: "horas_promedio",     label: "Horas prom.",   width: 11, type: "number" },
        { key: "costo_materiales",   label: "Costo mater.",  width: 14, type: "currency" },
      ],
      rows: result.rows,
      totales,
      filename: `productividad_tecnicos_${desde || "inicio"}_${hasta || "hoy"}`,
    });
  } catch (error) {
    console.error("Error en getTechnicianProductivity:", error);
    res.status(500).json({ message: "Error al obtener productividad de técnicos" });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 4. MIS MANTENIMIENTOS (chofer) — solo su unidad asignada
// ════════════════════════════════════════════════════════════════════════════
const getDriverUnitReport = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const { desde, hasta, formato } = req.query;

    const chofer = await pool.query("SELECT id FROM choferes WHERE usuario_id = $1", [usuario_id]);
    if (chofer.rows.length === 0) {
      return res.status(403).json({ message: "No se encontró perfil de chofer asociado a tu usuario." });
    }
    const chofer_id = chofer.rows[0].id;

    const unidad = await pool.query("SELECT id, placa, modelo FROM unidades WHERE chofer_id = $1", [chofer_id]);
    if (unidad.rows.length === 0) {
      return res.status(404).json({ message: "No tienes ninguna unidad asignada actualmente." });
    }

    const where = ["m.unidad_id = $1"];
    const params = [unidad.rows[0].id];
    let i = 2;
    if (parseDate(desde)) { where.push(`m.fecha_solicitud >= $${i++}`); params.push(desde); }
    if (parseDate(hasta)) { where.push(`m.fecha_solicitud <= $${i++}`); params.push(hasta); }

    const sql = `
      SELECT
        m.codigo,
        m.fecha_solicitud,
        m.fecha_realizacion,
        UPPER(m.tipo)        AS tipo,
        UPPER(m.estado)      AS estado,
        m.kilometraje_actual,
        m.observaciones,
        t.nombre             AS tecnico_nombre,
        COALESCE(mat.materiales, '')  AS materiales_usados
      FROM mantenimientos m
      LEFT JOIN tecnicos t ON m.tecnico_id = t.id
      LEFT JOIN (
        SELECT dm.mantenimiento_id,
               STRING_AGG(mat.nombre, ', ') AS materiales
        FROM detalles_mantenimiento dm
        JOIN materiales mat ON dm.material_id = mat.id
        GROUP BY dm.mantenimiento_id
      ) mat ON mat.mantenimiento_id = m.id
      WHERE ${where.join(" AND ")}
      ORDER BY m.fecha_solicitud DESC
    `;
    const result = await pool.query(sql, params);

    return sendReport(res, {
      formato,
      titulo: "Mantenimientos de mi unidad",
      subtitulo: `Unidad ${unidad.rows[0].placa} — ${result.rows.length} mantenimiento(s)`,
      filtros: fmtFiltrosTexto({ desde, hasta, unidad_placa: unidad.rows[0].placa }),
      columnas: [
        { key: "codigo",             label: "Código",        width: 12 },
        { key: "fecha_solicitud",    label: "Fecha sol.",    width: 12, type: "date" },
        { key: "fecha_realizacion",  label: "Fecha real.",   width: 12, type: "date" },
        { key: "tipo",               label: "Tipo",          width: 11 },
        { key: "estado",             label: "Estado",        width: 12 },
        { key: "kilometraje_actual", label: "Km",            width: 9,  type: "number" },
        { key: "tecnico_nombre",     label: "Técnico",       width: 14 },
        { key: "materiales_usados",  label: "Materiales",    width: 24 },
      ],
      rows: result.rows,
      filename: `mi_unidad_${unidad.rows[0].placa}_${desde || "inicio"}_${hasta || "hoy"}`,
    });
  } catch (error) {
    console.error("Error en getDriverUnitReport:", error);
    res.status(500).json({ message: "Error al obtener reporte del chofer" });
  }
};

module.exports = {
  getMaintenanceReport,
  getOwnerStatement,
  getTechnicianProductivity,
  getDriverUnitReport,
};
