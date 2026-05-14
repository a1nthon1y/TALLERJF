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
// 2a. MANTENIMIENTOS DEL DUEÑO (owner) — array crudo para la vista
//     funcional /dueno/mantenimientos. NO es un "reporte exportable":
//     devuelve materiales como JSON anidado para que la UI pueda expandir
//     cada fila y mostrar el detalle. Para la versión PDF/Excel ver
//     getOwnerStatement más abajo.
// ════════════════════════════════════════════════════════════════════════════
const getMyUnitsReport = async (req, res) => {
  try {
    const usuario_id = req.user.id;

    const dueno = await pool.query("SELECT id FROM duenos WHERE usuario_id = $1", [usuario_id]);
    if (dueno.rows.length === 0) {
      return res.status(404).json({ message: "No se encontró perfil de dueño asociado a tu usuario." });
    }
    const dueno_id = dueno.rows[0].id;

    const result = await pool.query(
      `SELECT
         m.id                                                     AS mantenimiento_id,
         m.codigo,
         u.placa                                                  AS unidad,
         u.modelo,
         m.tipo,
         m.estado,
         m.fecha_solicitud,
         m.fecha_realizacion,
         m.observaciones,
         m.kilometraje_actual,
         t.nombre                                                 AS tecnico_nombre,
         COALESCE(mat_resumen.costo_total, 0)                     AS costo_total,
         COALESCE(mat_resumen.materiales, '[]'::json)             AS materiales
       FROM mantenimientos m
       JOIN unidades u           ON m.unidad_id = u.id
       LEFT JOIN tecnicos t      ON m.tecnico_id = t.id
       LEFT JOIN (
         SELECT dm.mantenimiento_id,
                json_agg(json_build_object(
                  'nombre',          mat.nombre,
                  'cantidad',        dm.cantidad,
                  'precio_unitario', mat.precio,
                  'costo_total',     dm.costo_total
                )) AS materiales,
                SUM(dm.costo_total) AS costo_total
         FROM detalles_mantenimiento dm
         JOIN materiales mat ON dm.material_id = mat.id
         GROUP BY dm.mantenimiento_id
       ) mat_resumen ON mat_resumen.mantenimiento_id = m.id
       WHERE u.dueno_id = $1
       ORDER BY m.fecha_solicitud DESC`,
      [dueno_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error en getMyUnitsReport:", error);
    res.status(500).json({ message: "Error al obtener mantenimientos del dueño" });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 2b. ESTADO DE CUENTA DEL DUEÑO (owner) — formato wrapper para PDF/Excel.
//     Cada fila es un mantenimiento de sus unidades, con costo desglosado.
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

// ════════════════════════════════════════════════════════════════════════════
// 5. COSTOS POR DUEÑO (admin / encargado) — consolidado por dueño
//    Una fila por dueño con totales del período. Útil para facturación.
// ════════════════════════════════════════════════════════════════════════════
const getCostByOwner = async (req, res) => {
  try {
    const { desde, hasta, formato } = req.query;

    const where = ["u.dueno_id IS NOT NULL"];
    const params = [];
    let i = 1;
    if (parseDate(desde)) { where.push(`m.fecha_solicitud >= $${i++}`); params.push(desde); }
    if (parseDate(hasta)) { where.push(`m.fecha_solicitud <= $${i++}`); params.push(hasta); }

    const sql = `
      SELECT
        d.id                                                   AS dueno_id,
        us.nombre                                              AS dueno_nombre,
        us.correo                                              AS dueno_correo,
        COUNT(DISTINCT u.id)                                   AS unidades,
        COUNT(m.id)                                            AS total_mantenimientos,
        COUNT(*) FILTER (WHERE UPPER(m.tipo) = 'PREVENTIVO')   AS preventivos,
        COUNT(*) FILTER (WHERE UPPER(m.tipo) = 'CORRECTIVO')   AS correctivos,
        COALESCE(SUM(mat.costo_total), 0)::numeric(12,2)        AS costo_total
      FROM duenos d
      JOIN usuarios us  ON d.usuario_id = us.id
      JOIN unidades u   ON u.dueno_id = d.id
      LEFT JOIN mantenimientos m ON m.unidad_id = u.id
      LEFT JOIN (
        SELECT mantenimiento_id, SUM(costo_total) AS costo_total
        FROM detalles_mantenimiento GROUP BY mantenimiento_id
      ) mat ON mat.mantenimiento_id = m.id
      WHERE ${where.join(" AND ")}
      GROUP BY d.id, us.nombre, us.correo
      HAVING COUNT(m.id) > 0
      ORDER BY costo_total DESC, total_mantenimientos DESC
    `;
    const result = await pool.query(sql, params);

    const totales = {
      unidades:             result.rows.reduce((s, r) => s + Number(r.unidades), 0),
      total_mantenimientos: result.rows.reduce((s, r) => s + Number(r.total_mantenimientos), 0),
      preventivos:          result.rows.reduce((s, r) => s + Number(r.preventivos), 0),
      correctivos:          result.rows.reduce((s, r) => s + Number(r.correctivos), 0),
      costo_total:          result.rows.reduce((s, r) => s + Number(r.costo_total), 0),
    };

    return sendReport(res, {
      formato,
      titulo: "Costos por dueño",
      subtitulo: `${result.rows.length} dueño(s) con actividad en el período`,
      filtros: fmtFiltrosTexto({ desde, hasta }),
      columnas: [
        { key: "dueno_nombre",         label: "Dueño",        width: 22 },
        { key: "dueno_correo",         label: "Correo",       width: 22 },
        { key: "unidades",             label: "Unidades",     width: 10, type: "number" },
        { key: "total_mantenimientos",label: "Total mant.",   width: 12, type: "number" },
        { key: "preventivos",          label: "Preventivos",  width: 12, type: "number" },
        { key: "correctivos",          label: "Correctivos",  width: 12, type: "number" },
        { key: "costo_total",          label: "Costo total",  width: 14, type: "currency" },
      ],
      rows: result.rows,
      totales,
      filename: `costos_por_dueno_${desde || "inicio"}_${hasta || "hoy"}`,
    });
  } catch (error) {
    console.error("Error en getCostByOwner:", error);
    res.status(500).json({ message: "Error al obtener costos por dueño" });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 6. CONSUMO DE MATERIALES (admin / encargado)
//    Por material: cuánto se consumió y cuánto representó en costo.
// ════════════════════════════════════════════════════════════════════════════
const getMaterialsConsumption = async (req, res) => {
  try {
    const { desde, hasta, material_id, formato } = req.query;

    const where = [];
    const params = [];
    let i = 1;
    if (parseDate(desde)) { where.push(`m.fecha_solicitud >= $${i++}`); params.push(desde); }
    if (parseDate(hasta)) { where.push(`m.fecha_solicitud <= $${i++}`); params.push(hasta); }
    if (material_id)      { where.push(`mat.id = $${i++}`); params.push(material_id); }
    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        mat.id,
        mat.nombre                                       AS material,
        mat.precio                                       AS precio_unitario,
        mat.stock                                        AS stock_actual,
        COUNT(DISTINCT dm.mantenimiento_id)              AS mantenimientos,
        COALESCE(SUM(dm.cantidad), 0)                    AS cantidad_total,
        COALESCE(SUM(dm.costo_total), 0)::numeric(12,2)  AS costo_total
      FROM materiales mat
      LEFT JOIN detalles_mantenimiento dm ON dm.material_id = mat.id
      LEFT JOIN mantenimientos m          ON m.id = dm.mantenimiento_id
      ${whereSQL}
      GROUP BY mat.id, mat.nombre, mat.precio, mat.stock
      HAVING COALESCE(SUM(dm.cantidad), 0) > 0
      ORDER BY costo_total DESC, cantidad_total DESC
    `;
    const result = await pool.query(sql, params);

    let materialNombre;
    if (material_id) {
      const r = await pool.query("SELECT nombre FROM materiales WHERE id = $1", [material_id]);
      materialNombre = r.rows[0]?.nombre;
    }

    const totales = {
      mantenimientos: result.rows.reduce((s, r) => s + Number(r.mantenimientos), 0),
      cantidad_total: result.rows.reduce((s, r) => s + Number(r.cantidad_total), 0),
      costo_total:    result.rows.reduce((s, r) => s + Number(r.costo_total), 0),
    };

    return sendReport(res, {
      formato,
      titulo: "Consumo de materiales",
      subtitulo: `${result.rows.length} material(es) con movimiento en el período`,
      filtros: fmtFiltrosTexto({ desde, hasta, ...(materialNombre ? { unidad_placa: materialNombre } : {}) }),
      columnas: [
        { key: "material",        label: "Material",       width: 24 },
        { key: "precio_unitario", label: "Precio unit.",   width: 13, type: "currency" },
        { key: "stock_actual",    label: "Stock actual",   width: 12, type: "number" },
        { key: "mantenimientos",  label: "En # mant.",     width: 11, type: "number" },
        { key: "cantidad_total",  label: "Cantidad usada", width: 14, type: "number" },
        { key: "costo_total",     label: "Costo total",    width: 14, type: "currency" },
      ],
      rows: result.rows,
      totales,
      filename: `consumo_materiales_${desde || "inicio"}_${hasta || "hoy"}`,
    });
  } catch (error) {
    console.error("Error en getMaterialsConsumption:", error);
    res.status(500).json({ message: "Error al obtener consumo de materiales" });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 7. TOP UNIDADES PROBLEMÁTICAS (admin / encargado)
//    Por unidad: cuántos mantenimientos y qué costo. Identifica unidades caras.
// ════════════════════════════════════════════════════════════════════════════
const getTopUnits = async (req, res) => {
  try {
    const { desde, hasta, top = 20, formato } = req.query;

    const where = [];
    const params = [];
    let i = 1;
    if (parseDate(desde)) { where.push(`m.fecha_solicitud >= $${i++}`); params.push(desde); }
    if (parseDate(hasta)) { where.push(`m.fecha_solicitud <= $${i++}`); params.push(hasta); }
    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const limit = Math.min(Math.max(parseInt(top) || 20, 1), 200);

    const sql = `
      SELECT
        u.id,
        u.placa,
        u.modelo,
        u.kilometraje,
        us2.nombre                                              AS dueno_nombre,
        COUNT(m.id)                                             AS total_mantenimientos,
        COUNT(*) FILTER (WHERE UPPER(m.tipo) = 'CORRECTIVO')    AS correctivos,
        COUNT(*) FILTER (WHERE UPPER(m.tipo) = 'PREVENTIVO')    AS preventivos,
        COALESCE(SUM(mat.costo_total), 0)::numeric(12,2)         AS costo_total
      FROM unidades u
      LEFT JOIN duenos d         ON u.dueno_id = d.id
      LEFT JOIN usuarios us2     ON d.usuario_id = us2.id
      LEFT JOIN mantenimientos m ON m.unidad_id = u.id
      LEFT JOIN (
        SELECT mantenimiento_id, SUM(costo_total) AS costo_total
        FROM detalles_mantenimiento GROUP BY mantenimiento_id
      ) mat ON mat.mantenimiento_id = m.id
      ${whereSQL}
      GROUP BY u.id, u.placa, u.modelo, u.kilometraje, us2.nombre
      HAVING COUNT(m.id) > 0
      ORDER BY costo_total DESC, total_mantenimientos DESC
      LIMIT ${limit}
    `;
    const result = await pool.query(sql, params);

    const totales = {
      total_mantenimientos: result.rows.reduce((s, r) => s + Number(r.total_mantenimientos), 0),
      preventivos:          result.rows.reduce((s, r) => s + Number(r.preventivos), 0),
      correctivos:          result.rows.reduce((s, r) => s + Number(r.correctivos), 0),
      costo_total:          result.rows.reduce((s, r) => s + Number(r.costo_total), 0),
    };

    return sendReport(res, {
      formato,
      titulo: `Top ${limit} unidades por costo y frecuencia`,
      subtitulo: `${result.rows.length} unidad(es) con mantenimientos en el período`,
      filtros: fmtFiltrosTexto({ desde, hasta }),
      columnas: [
        { key: "placa",                label: "Placa",        width: 11 },
        { key: "modelo",               label: "Modelo",       width: 16 },
        { key: "kilometraje",          label: "Km actual",    width: 11, type: "number" },
        { key: "dueno_nombre",         label: "Dueño",        width: 18 },
        { key: "total_mantenimientos",label: "Total mant.",   width: 12, type: "number" },
        { key: "preventivos",          label: "Preventivos",  width: 12, type: "number" },
        { key: "correctivos",          label: "Correctivos",  width: 12, type: "number" },
        { key: "costo_total",          label: "Costo total",  width: 14, type: "currency" },
      ],
      rows: result.rows,
      totales,
      filename: `top_unidades_${desde || "inicio"}_${hasta || "hoy"}`,
    });
  } catch (error) {
    console.error("Error en getTopUnits:", error);
    res.status(500).json({ message: "Error al obtener top de unidades" });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 8. CUMPLIMIENTO DEL PLAN PREDICTIVO (admin / encargado)
//    KPI por mes del período: # mantenimientos preventivos vs correctivos.
//    Idealmente la mayor parte deben ser preventivos.
// ════════════════════════════════════════════════════════════════════════════
const getPredictiveCompliance = async (req, res) => {
  try {
    const { desde, hasta, formato } = req.query;

    const where = [];
    const params = [];
    let i = 1;
    if (parseDate(desde)) { where.push(`fecha_solicitud >= $${i++}`); params.push(desde); }
    if (parseDate(hasta)) { where.push(`fecha_solicitud <= $${i++}`); params.push(hasta); }
    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        TO_CHAR(DATE_TRUNC('month', fecha_solicitud), 'YYYY-MM')            AS periodo,
        COUNT(*)                                                            AS total,
        COUNT(*) FILTER (WHERE UPPER(tipo) = 'PREVENTIVO')                  AS preventivos,
        COUNT(*) FILTER (WHERE UPPER(tipo) = 'CORRECTIVO')                  AS correctivos,
        ROUND(
          (COUNT(*) FILTER (WHERE UPPER(tipo) = 'PREVENTIVO'))::numeric
          / NULLIF(COUNT(*), 0) * 100, 1
        )                                                                   AS pct_preventivo
      FROM mantenimientos
      ${whereSQL}
      GROUP BY DATE_TRUNC('month', fecha_solicitud)
      ORDER BY DATE_TRUNC('month', fecha_solicitud) DESC
    `;
    const result = await pool.query(sql, params);

    const totales = {
      total:        result.rows.reduce((s, r) => s + Number(r.total), 0),
      preventivos:  result.rows.reduce((s, r) => s + Number(r.preventivos), 0),
      correctivos:  result.rows.reduce((s, r) => s + Number(r.correctivos), 0),
    };
    if (totales.total > 0) {
      totales.pct_preventivo = Math.round((totales.preventivos / totales.total) * 1000) / 10;
    }

    return sendReport(res, {
      formato,
      titulo: "Cumplimiento del plan predictivo",
      subtitulo: `% de preventivos vs correctivos por mes — meta: ≥ 70% preventivos`,
      filtros: fmtFiltrosTexto({ desde, hasta }),
      columnas: [
        { key: "periodo",         label: "Mes",            width: 12 },
        { key: "total",           label: "Total mant.",    width: 12, type: "number" },
        { key: "preventivos",     label: "Preventivos",    width: 13, type: "number" },
        { key: "correctivos",     label: "Correctivos",    width: 13, type: "number" },
        { key: "pct_preventivo",  label: "% Preventivo",   width: 13, type: "number" },
      ],
      rows: result.rows,
      totales,
      filename: `cumplimiento_predictivo_${desde || "inicio"}_${hasta || "hoy"}`,
    });
  } catch (error) {
    console.error("Error en getPredictiveCompliance:", error);
    res.status(500).json({ message: "Error al obtener cumplimiento predictivo" });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 9. BITÁCORA DE LLEGADAS (admin / encargado)
//    Reportes que envían los choferes desde la app — útil para verificar
//    KMs, rutas y comentarios.
// ════════════════════════════════════════════════════════════════════════════
const getArrivalsLog = async (req, res) => {
  try {
    const { desde, hasta, chofer_id, unidad_id, formato } = req.query;

    const where = [];
    const params = [];
    let i = 1;
    if (parseDate(desde)) { where.push(`r.creado_en >= $${i++}`); params.push(desde); }
    if (parseDate(hasta)) { where.push(`r.creado_en <= $${i++}`); params.push(hasta); }
    if (chofer_id)        { where.push(`r.chofer_id = $${i++}`); params.push(chofer_id); }
    if (unidad_id)        { where.push(`r.unidad_id = $${i++}`); params.push(unidad_id); }
    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        r.creado_en      AS fecha,
        u.placa          AS unidad,
        us.nombre        AS chofer,
        r.kilometraje,
        r.origen         AS ruta,
        r.comentarios
      FROM reportes_llegada r
      LEFT JOIN unidades u  ON r.unidad_id = u.id
      LEFT JOIN choferes c  ON r.chofer_id = c.id
      LEFT JOIN usuarios us ON c.usuario_id = us.id
      ${whereSQL}
      ORDER BY r.creado_en DESC
      LIMIT 5000
    `;
    const result = await pool.query(sql, params);

    return sendReport(res, {
      formato,
      titulo: "Bitácora de llegadas",
      subtitulo: `${result.rows.length} reporte(s) de llegada en el período`,
      filtros: fmtFiltrosTexto({ desde, hasta }),
      columnas: [
        { key: "fecha",        label: "Fecha",       width: 14, type: "date" },
        { key: "unidad",       label: "Unidad",      width: 12 },
        { key: "chofer",       label: "Chofer",      width: 18 },
        { key: "ruta",         label: "Ruta",        width: 18 },
        { key: "kilometraje",  label: "Km",          width: 10, type: "number" },
        { key: "comentarios",  label: "Comentarios", width: 28 },
      ],
      rows: result.rows,
      filename: `bitacora_llegadas_${desde || "inicio"}_${hasta || "hoy"}`,
    });
  } catch (error) {
    console.error("Error en getArrivalsLog:", error);
    res.status(500).json({ message: "Error al obtener bitácora de llegadas" });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 10. PRÓXIMOS VENCIMIENTOS (owner)
//    Por cada parte configurada de cada unidad del owner: km recorridos vs
//    umbral, y semáforo (vencido / próximo / ok).
// ════════════════════════════════════════════════════════════════════════════
const getOwnerUpcomingMaintenance = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const { unidad_id, formato } = req.query;

    const dueno = await pool.query("SELECT id FROM duenos WHERE usuario_id = $1", [usuario_id]);
    if (dueno.rows.length === 0) {
      return res.status(404).json({ message: "No se encontró perfil de dueño." });
    }
    const dueno_id = dueno.rows[0].id;

    const where = ["u.dueno_id = $1", "cp.activo = TRUE", "u.activo = TRUE"];
    const params = [dueno_id];
    let i = 2;
    if (unidad_id) { where.push(`u.id = $${i++}`); params.push(unidad_id); }

    const sql = `
      SELECT
        u.placa                                                AS unidad,
        u.modelo,
        cp.nombre                                              AS parte,
        cp.umbral_km,
        u.kilometraje                                          AS km_actual,
        epu.ultimo_mantenimiento_km,
        epu.ultimo_mantenimiento_fecha,
        (u.kilometraje - COALESCE(epu.ultimo_mantenimiento_km, 0)) AS km_recorridos,
        (cp.umbral_km - (u.kilometraje - COALESCE(epu.ultimo_mantenimiento_km, 0))) AS km_restantes,
        CASE
          WHEN (u.kilometraje - COALESCE(epu.ultimo_mantenimiento_km, 0)) >= cp.umbral_km
            THEN 'VENCIDO'
          WHEN (u.kilometraje - COALESCE(epu.ultimo_mantenimiento_km, 0)) >= cp.umbral_km * 0.85
            THEN 'PROXIMO'
          ELSE 'OK'
        END                                                    AS estado_parte
      FROM unidades u
      CROSS JOIN configuracion_partes cp
      LEFT JOIN estado_partes_unidad epu
        ON epu.unidad_id = u.id AND epu.configuracion_parte_id = cp.id
      WHERE ${where.join(" AND ")}
      ORDER BY
        CASE
          WHEN (u.kilometraje - COALESCE(epu.ultimo_mantenimiento_km, 0)) >= cp.umbral_km THEN 0
          WHEN (u.kilometraje - COALESCE(epu.ultimo_mantenimiento_km, 0)) >= cp.umbral_km * 0.85 THEN 1
          ELSE 2
        END,
        u.placa, cp.nombre
    `;
    const result = await pool.query(sql, params);

    let unidadPlaca;
    if (unidad_id) {
      const r = await pool.query("SELECT placa FROM unidades WHERE id = $1", [unidad_id]);
      unidadPlaca = r.rows[0]?.placa;
    }

    const vencidos  = result.rows.filter((r) => r.estado_parte === "VENCIDO").length;
    const proximos  = result.rows.filter((r) => r.estado_parte === "PROXIMO").length;

    return sendReport(res, {
      formato,
      titulo: "Próximos vencimientos",
      subtitulo: `${vencidos} vencido(s), ${proximos} próximo(s) a vencer`,
      filtros: fmtFiltrosTexto({ unidad_placa: unidadPlaca }),
      columnas: [
        { key: "unidad",                     label: "Unidad",        width: 11 },
        { key: "modelo",                     label: "Modelo",        width: 14 },
        { key: "parte",                      label: "Parte",         width: 22 },
        { key: "km_actual",                  label: "Km actual",     width: 11, type: "number" },
        { key: "ultimo_mantenimiento_km",    label: "Últ. mant.",    width: 11, type: "number" },
        { key: "ultimo_mantenimiento_fecha", label: "Fecha últ.",    width: 12, type: "date" },
        { key: "umbral_km",                  label: "Umbral",        width: 10, type: "number" },
        { key: "km_recorridos",              label: "Recorridos",    width: 11, type: "number" },
        { key: "km_restantes",               label: "Restantes",     width: 11, type: "number" },
        { key: "estado_parte",               label: "Estado",        width: 10 },
      ],
      rows: result.rows,
      filename: `proximos_vencimientos`,
    });
  } catch (error) {
    console.error("Error en getOwnerUpcomingMaintenance:", error);
    res.status(500).json({ message: "Error al obtener próximos vencimientos" });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 11. MIS TRABAJOS DEL PERÍODO (técnico)
//    Lista detallada con métricas individuales del técnico autenticado.
// ════════════════════════════════════════════════════════════════════════════
const getTechnicianMyJobs = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const { desde, hasta, estado, formato } = req.query;

    const tec = await pool.query("SELECT id, nombre FROM tecnicos WHERE usuario_id = $1", [usuario_id]);
    if (tec.rows.length === 0) {
      return res.status(403).json({ message: "No se encontró perfil de técnico asociado a tu usuario." });
    }
    const tecnico_id = tec.rows[0].id;
    const tecnico_nombre = tec.rows[0].nombre;

    const where = ["m.tecnico_id = $1"];
    const params = [tecnico_id];
    let i = 2;
    if (parseDate(desde)) { where.push(`m.fecha_solicitud >= $${i++}`); params.push(desde); }
    if (parseDate(hasta)) { where.push(`m.fecha_solicitud <= $${i++}`); params.push(hasta); }
    if (estado)           { where.push(`UPPER(m.estado) = UPPER($${i++})`); params.push(estado); }

    const sql = `
      SELECT
        m.codigo,
        m.fecha_solicitud,
        m.fecha_realizacion,
        u.placa                                       AS unidad,
        UPPER(m.tipo)                                 AS tipo,
        UPPER(m.estado)                               AS estado,
        m.kilometraje_actual,
        COALESCE(mat.materiales, '')                  AS materiales,
        COALESCE(mat.costo_total, 0)::numeric(12,2)   AS costo_materiales
      FROM mantenimientos m
      JOIN unidades u ON m.unidad_id = u.id
      LEFT JOIN (
        SELECT dm.mantenimiento_id,
               SUM(dm.costo_total)                                AS costo_total,
               STRING_AGG(mat.nombre || ' x' || dm.cantidad, ', ') AS materiales
        FROM detalles_mantenimiento dm
        JOIN materiales mat ON dm.material_id = mat.id
        GROUP BY dm.mantenimiento_id
      ) mat ON mat.mantenimiento_id = m.id
      WHERE ${where.join(" AND ")}
      ORDER BY m.fecha_solicitud DESC
    `;
    const result = await pool.query(sql, params);

    const totales = {
      costo_materiales: result.rows.reduce((s, r) => s + Number(r.costo_materiales || 0), 0),
    };

    return sendReport(res, {
      formato,
      titulo: "Mis trabajos del período",
      subtitulo: `${tecnico_nombre} — ${result.rows.length} mantenimiento(s)`,
      filtros: fmtFiltrosTexto({ desde, hasta, estado }),
      columnas: [
        { key: "codigo",             label: "Código",       width: 12 },
        { key: "fecha_solicitud",    label: "Asignado",     width: 12, type: "date" },
        { key: "fecha_realizacion",  label: "Cerrado",      width: 12, type: "date" },
        { key: "unidad",             label: "Unidad",       width: 11 },
        { key: "tipo",               label: "Tipo",         width: 11 },
        { key: "estado",             label: "Estado",       width: 12 },
        { key: "kilometraje_actual", label: "Km",           width: 9,  type: "number" },
        { key: "materiales",         label: "Materiales",   width: 24 },
        { key: "costo_materiales",   label: "Costo mater.", width: 13, type: "currency" },
      ],
      rows: result.rows,
      totales,
      filename: `mis_trabajos_${desde || "inicio"}_${hasta || "hoy"}`,
    });
  } catch (error) {
    console.error("Error en getTechnicianMyJobs:", error);
    res.status(500).json({ message: "Error al obtener mis trabajos" });
  }
};

module.exports = {
  getMaintenanceReport,
  getMyUnitsReport,
  getOwnerStatement,
  getTechnicianProductivity,
  getDriverUnitReport,
  getCostByOwner,
  getMaterialsConsumption,
  getTopUnits,
  getPredictiveCompliance,
  getArrivalsLog,
  getOwnerUpcomingMaintenance,
  getTechnicianMyJobs,
};
