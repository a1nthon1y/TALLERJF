const pool = require("../config/db");
const { generarCodigo } = require("./maintenance.controller");
const { evaluarMotorPredictivo } = require("../services/predictive-engine");

// ===============================================================
//  ✅ Crear chofer
// ===============================================================
const createDriver = async (req, res) => {
  try {
    const { usuario_id, licencia, telefono } = req.body;

    if (!usuario_id || !licencia) {
      return res.status(400).json({ message: "usuario_id y licencia son obligatorios" });
    }

    const result = await pool.query(
      `
      INSERT INTO choferes (usuario_id, licencia, telefono)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [usuario_id, licencia, telefono || null]
    );

    res.status(201).json({
      message: "Chofer creado correctamente",
      chofer: result.rows[0]
    });

  } catch (error) {
    console.error("Error al crear chofer:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


// ===============================================================
//  🔍 Obtener todos los choferes con datos del usuario
// ===============================================================
const getAllDrivers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id AS chofer_id,
        c.licencia,
        c.telefono,
        c.activo,
        c.creado_en,

        u.id AS usuario_id,
        u.nombre AS usuario_nombre,
        u.correo AS usuario_correo

      FROM choferes c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      ORDER BY c.activo DESC, c.creado_en DESC
    `);

    res.json(result.rows);

  } catch (error) {
    console.error("Error al obtener choferes:", error);
    res.status(500).json({ error: "Error al obtener choferes" });
  }
};


// ===============================================================
//  🔍 Obtener chofer por ID
// ===============================================================
const getDriverById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        c.id AS chofer_id,
        c.licencia,
        c.telefono,
        c.creado_en,

        u.id AS usuario_id,
        u.nombre AS usuario_nombre,
        u.correo AS usuario_correo

      FROM choferes c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Chofer no encontrado" });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error("Error al obtener chofer:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


// ===============================================================
//  ✏ Actualizar chofer
// ===============================================================
const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id, licencia, telefono } = req.body;

    const result = await pool.query(
      `
      UPDATE choferes
      SET usuario_id = $1, licencia = $2, telefono = $3
      WHERE id = $4
      RETURNING *
      `,
      [usuario_id, licencia, telefono, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Chofer no encontrado" });
    }

    res.json({
      message: "Chofer actualizado correctamente",
      chofer: result.rows[0],
    });

  } catch (error) {
    console.error("Error al actualizar chofer:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


// ===============================================================
//  🔄 Activar / Desactivar chofer (soft disable)
// ===============================================================
const toggleDriverStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const check = await pool.query(
      `SELECT c.activo, u.nombre FROM choferes c JOIN usuarios u ON c.usuario_id = u.id WHERE c.id = $1`,
      [id]
    );
    if (check.rows.length === 0)
      return res.status(404).json({ message: "Chofer no encontrado" });

    const { activo, nombre } = check.rows[0];
    const result = await pool.query(
      "UPDATE choferes SET activo = $1 WHERE id = $2 RETURNING activo",
      [!activo, id]
    );

    const nuevoEstado = result.rows[0].activo ? "activado" : "desactivado";
    res.json({ message: `Chofer ${nombre} ${nuevoEstado} correctamente`, activo: result.rows[0].activo });
  } catch (error) {
    console.error("Error al cambiar estado del chofer:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ===============================================================
//  🗑 Eliminar chofer
// ===============================================================
const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;

    const choferCheck = await pool.query(
      `SELECT u.nombre FROM choferes c JOIN usuarios u ON c.usuario_id = u.id WHERE c.id = $1`,
      [id]
    );
    if (choferCheck.rows.length === 0)
      return res.status(404).json({ message: "Chofer no encontrado" });

    // Bloquear si tiene unidades asignadas
    const unidadesCheck = await pool.query(
      "SELECT COUNT(*) FROM unidades WHERE chofer_id = $1",
      [id]
    );
    if (parseInt(unidadesCheck.rows[0].count) > 0) {
      return res.status(400).json({
        message: `No se puede eliminar al chofer ${choferCheck.rows[0].nombre}: tiene ${unidadesCheck.rows[0].count} unidad(es) asignada(s). Desasígnalas primero desde Unidades.`,
      });
    }

    await pool.query("DELETE FROM choferes WHERE id = $1", [id]);
    res.json({ message: "Chofer eliminado correctamente" });

  } catch (error) {
    console.error("Error al eliminar chofer:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


// ===============================================================
//  🔍 Obtener las unidades asignadas al chofer autenticado
// ===============================================================
const getMiUnidad = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const choferQuery = await pool.query(
      "SELECT id FROM choferes WHERE usuario_id = $1",
      [usuario_id]
    );
    if (choferQuery.rows.length === 0) {
      return res.status(404).json({ message: "No se encontró registro de chofer para este usuario" });
    }
    const chofer_id = choferQuery.rows[0].id;
    const unidadQuery = await pool.query(
      "SELECT id, placa, modelo, año, tipo, kilometraje FROM unidades WHERE chofer_id = $1 ORDER BY id ASC",
      [chofer_id]
    );
    if (unidadQuery.rows.length === 0) {
      return res.status(404).json({ message: "No tienes una unidad asignada actualmente" });
    }
    res.json({ unidades: unidadQuery.rows });
  } catch (error) {
    console.error("Error al obtener unidades del chofer:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


// ===============================================================
//  ✅ Crear Reporte de Llegada (con lógica predictiva e incidencias)
// ===============================================================
const crearReporteLlegada = async (req, res) => {
  try {
    // partes_campo: [{configuracion_parte_id, km_realizado, costo_estimado, descripcion}]
    const { unidad_id, kilometraje, origen, comentarios, partes_campo } = req.body;
    const usuario_id = req.user.id;

    // 1. Obtener el chofer asociado al usuario
    const choferQuery = await pool.query("SELECT id FROM choferes WHERE usuario_id = $1", [usuario_id]);
    if (choferQuery.rows.length === 0) return res.status(403).json({ message: "Rol inválido o chofer no encontrado" });
    const chofer_id = choferQuery.rows[0].id;

    // 2. Verificar unidad y validar kilometraje
    const unidadQuery = await pool.query("SELECT kilometraje FROM unidades WHERE id = $1", [unidad_id]);
    if (unidadQuery.rows.length === 0) return res.status(404).json({ message: "Unidad no encontrada" });
    const kilometrajeActual = unidadQuery.rows[0].kilometraje;
    if (kilometraje < kilometrajeActual) {
      return res.status(400).json({
        message: `El kilometraje ingresado (${Number(kilometraje).toLocaleString()} km) no puede ser menor al último registrado (${Number(kilometrajeActual).toLocaleString()} km). Verifica el tacómetro o, si fue un error humano, solicita a un administrador que lo corrija desde Unidades.`,
      });
    }

    // 3. Registrar el reporte de llegada
    const reporte = await pool.query(
      `INSERT INTO reportes_llegada (chofer_id, unidad_id, kilometraje, origen, comentarios)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [chofer_id, unidad_id, kilometraje, origen, comentarios || ""]
    );

    // 4. Actualizar kilometraje de la unidad
    await pool.query("UPDATE unidades SET kilometraje = $1 WHERE id = $2", [kilometraje, unidad_id]);

    // 5. TRABAJOS REALIZADOS EN RUTA (campo) — se procesan ANTES del motor predictivo
    //    para que los contadores ya estén resetados cuando se evalúen las alertas
    let trabajosCampo = 0;
    if (Array.isArray(partes_campo) && partes_campo.length > 0) {
      // El material "Servicio en Ruta" se siembra en run-migrations.js. Lo buscamos;
      // si por algún motivo (BD recién creada sin migrar, borrado manual) no existe,
      // lo creamos aquí defensivamente con la columna correcta (`precio`, no `precio_unitario`).
      let materialCampoId;
      const matExistente = await pool.query(
        "SELECT id FROM materiales WHERE nombre = 'Servicio en Ruta' LIMIT 1"
      );
      if (matExistente.rows.length > 0) {
        materialCampoId = matExistente.rows[0].id;
      } else {
        const matNuevo = await pool.query(
          "INSERT INTO materiales (nombre, precio, stock) VALUES ('Servicio en Ruta', 0, 0) RETURNING id"
        );
        materialCampoId = matNuevo.rows[0].id;
      }

      for (const p of partes_campo) {
        const { configuracion_parte_id, km_realizado, costo_estimado, descripcion } = p;
        const kmIntervencion = km_realizado || kilometraje;
        const costo = Number(costo_estimado) || 0;

        // Obtener nombre de la parte para la observación
        const parteInfo = await pool.query("SELECT nombre FROM configuracion_partes WHERE id = $1", [configuracion_parte_id]);
        const partNombre = parteInfo.rows[0]?.nombre || "Parte desconocida";

        // Crear mantenimiento REALIZADO (ya hecho en campo, sin técnico del taller)
        const obsText = [
          `TRABAJO EN RUTA — ${partNombre}`,
          `Descripción: ${descripcion || "Sin descripción"}`,
          `Km de intervención: ${Number(kmIntervencion).toLocaleString()}`,
          costo > 0 ? `Costo estimado: S/. ${costo.toFixed(2)}` : null,
        ].filter(Boolean).join("\n");

        const codigoCampo = await generarCodigo('CORRECTIVO', 'REALIZADO');

        const mantResult = await pool.query(
          `INSERT INTO mantenimientos (unidad_id, tipo, observaciones, kilometraje_actual, estado, fecha_realizacion, codigo)
           VALUES ($1, 'CORRECTIVO', $2, $3, 'REALIZADO', NOW(), $4) RETURNING id`,
          [unidad_id, obsText, kmIntervencion, codigoCampo]
        );
        const mantId = mantResult.rows[0].id;

        // Si hay costo, registrar en detalles_mantenimiento para que aparezca en reportes del dueño
        if (costo > 0) {
          await pool.query(
            `INSERT INTO detalles_mantenimiento (mantenimiento_id, material_id, cantidad, costo_total)
             VALUES ($1, $2, 1, $3)`,
            [mantId, materialCampoId, costo]
          );
        }

        // Resetear contador de esta parte en estado_partes_unidad
        await pool.query(
          `INSERT INTO estado_partes_unidad (unidad_id, configuracion_parte_id, ultimo_mantenimiento_km, ultimo_mantenimiento_fecha)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (unidad_id, configuracion_parte_id)
           DO UPDATE SET ultimo_mantenimiento_km = EXCLUDED.ultimo_mantenimiento_km, ultimo_mantenimiento_fecha = NOW()`,
          [unidad_id, configuracion_parte_id, kmIntervencion]
        );

        // Resolver alertas activas de esta parte
        await pool.query(
          `UPDATE alertas_mantenimiento SET estado = 'RESUELTO' WHERE unidad_id = $1 AND parte_id = $2`,
          [unidad_id, configuracion_parte_id]
        );

        trabajosCampo++;
      }
    }

    // 6. MOTOR DE LÓGICA PREDICTIVA (corre con contadores ya actualizados).
    //    Lógica compartida con updateUnit (admin corrige km manual) — ver
    //    src/services/predictive-engine.js
    const motor = await evaluarMotorPredictivo(unidad_id, kilometraje);

    res.status(201).json({
      message: "Llegada registrada exitosamente",
      reporte: reporte.rows[0],
      alertasNuevas: motor.alertasGeneradas,
      trabajosCampo,
    });

  } catch (error) {
    console.error("Error al registrar llegada:", error);
    res.status(500).json({ error: "Error interno del servidor", detalle: error.message });
  }
};

// ===============================================================
//  ✅ Obtener rutas activas (para el dropdown del chofer)
//  La tabla `rutas` y su seed se crean en run-migrations.js.
// ===============================================================
const getRutas = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre FROM rutas WHERE activa = true ORDER BY orden ASC, nombre ASC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener rutas:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = {
  createDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  toggleDriverStatus,
  deleteDriver,
  getMiUnidad,
  crearReporteLlegada,
  getRutas,
};
    