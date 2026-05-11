const pool = require("../config/db");
const { generarCodigo } = require("./maintenance.controller");

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
        c.creado_en,

        u.id AS usuario_id,
        u.nombre AS usuario_nombre,
        u.correo AS usuario_correo

      FROM choferes c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      ORDER BY c.creado_en DESC
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
//  🗑 Eliminar chofer
// ===============================================================
const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM choferes WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Chofer no encontrado" });
    }

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
      return res.status(400).json({ error: "El kilometraje ingresado no puede ser menor al actual registrado (" + kilometrajeActual + " km)." });
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
      // Obtener o crear material especial "Servicio en Ruta"
      let materialCampoId;
      const matExistente = await pool.query("SELECT id FROM materiales WHERE nombre = 'Servicio en Ruta' LIMIT 1");
      if (matExistente.rows.length > 0) {
        materialCampoId = matExistente.rows[0].id;
      } else {
        const matNuevo = await pool.query(
          "INSERT INTO materiales (nombre, precio_unitario) VALUES ('Servicio en Ruta', 1) RETURNING id"
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

    // 6. MOTOR DE LÓGICA PREDICTIVA (corre con contadores ya actualizados)
    const configs = await pool.query("SELECT * FROM configuracion_partes WHERE activo = TRUE");
    let alertasGeneradas = 0;

    for (let c of configs.rows) {
      let estadoParte = await pool.query(
        "SELECT * FROM estado_partes_unidad WHERE unidad_id = $1 AND configuracion_parte_id = $2",
        [unidad_id, c.id]
      );

      let ultimoMantenimientoKm = 0;
      if (estadoParte.rows.length > 0) {
        ultimoMantenimientoKm = estadoParte.rows[0].ultimo_mantenimiento_km;
      } else {
        await pool.query(
          "INSERT INTO estado_partes_unidad (unidad_id, configuracion_parte_id, ultimo_mantenimiento_km) VALUES ($1, $2, $3)",
          [unidad_id, c.id, kilometrajeActual]
        );
        continue;
      }

      const kmRecorridos = kilometraje - ultimoMantenimientoKm;

      if (kmRecorridos >= c.umbral_km) {
        const alertaExistente = await pool.query(
          `SELECT 1 FROM alertas_mantenimiento WHERE unidad_id = $1 AND parte_id = $2 AND estado != 'RESUELTO' LIMIT 1`,
          [unidad_id, c.id]
        );
        if (alertaExistente.rows.length === 0) {
          await pool.query(
            `INSERT INTO alertas_mantenimiento (unidad_id, parte_id, mensaje, estado) VALUES ($1, $2, $3, 'ACTIVO')`,
            [unidad_id, c.id, `URGENTE Predictivo: [${c.nombre}] requiere mantenimiento inmediato. Límite superado.`]
          );
          alertasGeneradas++;
        }
      }
    }

    res.status(201).json({
      message: "Llegada registrada exitosamente",
      reporte: reporte.rows[0],
      alertasNuevas: alertasGeneradas,
      trabajosCampo,
    });

  } catch (error) {
    console.error("Error al registrar llegada:", error);
    res.status(500).json({ error: "Error interno del servidor", detalle: error.message });
  }
};

// ===============================================================
//  ✅ Obtener rutas disponibles
// ===============================================================
const getRutas = async (req, res) => {
  try {
    // Crear tabla si no existe y sembrar datos iniciales
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rutas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL,
        activa BOOLEAN DEFAULT true,
        orden INT DEFAULT 0
      )
    `);

    const count = await pool.query("SELECT COUNT(*) FROM rutas");
    if (parseInt(count.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO rutas (nombre, orden) VALUES
          ('Lima - Arequipa', 1),
          ('Lima - Cusco', 2),
          ('Lima - Trujillo', 3),
          ('Lima - Chiclayo', 4),
          ('Lima - Piura', 5),
          ('Lima - Puno', 6),
          ('Lima - Tacna', 7),
          ('Lima - Ica', 8),
          ('Lima - Nazca', 9),
          ('Lima - Huancayo', 10),
          ('Lima - Huánuco', 11),
          ('Lima - Pucallpa', 12),
          ('Lima - Tarapoto', 13),
          ('Lima - Chimbote', 14),
          ('Lima - Cajamarca', 15),
          ('Arequipa - Cusco', 16),
          ('Arequipa - Puno', 17),
          ('Arequipa - Tacna', 18),
          ('Cusco - Puno', 19),
          ('Trujillo - Chiclayo', 20)
      `);
    }

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
  deleteDriver,
  getMiUnidad,
  crearReporteLlegada,
  getRutas,
};
    