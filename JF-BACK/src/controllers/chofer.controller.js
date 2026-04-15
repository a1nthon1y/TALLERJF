const pool = require("../config/db");

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
//  🔍 Obtener la unidad asignada al chofer autenticado
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
      "SELECT id, placa, modelo, año, tipo, kilometraje FROM unidades WHERE chofer_id = $1",
      [chofer_id]
    );
    if (unidadQuery.rows.length === 0) {
      return res.status(404).json({ message: "No tienes una unidad asignada actualmente" });
    }
    res.json({ unidad: unidadQuery.rows[0] });
  } catch (error) {
    console.error("Error al obtener unidad del chofer:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


// ===============================================================
//  ✅ Crear Reporte de Llegada (con lógica predictiva e incidencias)
// ===============================================================
const crearReporteLlegada = async (req, res) => {
  try {
    const { unidad_id, kilometraje, origen, comentarios } = req.body;
    const usuario_id = req.user.id; 

    // 1. Obtener el chofer asociado al usuario
    const choferQuery = await pool.query("SELECT id FROM choferes WHERE usuario_id = $1", [usuario_id]);
    if (choferQuery.rows.length === 0) return res.status(403).json({ message: "Rol inválido o chofer no encontrado" });
    const chofer_id = choferQuery.rows[0].id;

    // 2. Verificar unidad y validar error humano en kilometraje (CASUÍSTICA 1)
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

    // 5. MOTOR DE LÓGICA PREDICTIVA
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
        // Validar si existe alerta previa NO RESUELTA para evitar SPAM (CASUÍSTICA 2)
        const alertaExistente = await pool.query(
           `SELECT 1 FROM alertas_mantenimiento 
            WHERE unidad_id = $1 AND parte_id = $2 AND estado != 'RESUELTO' LIMIT 1`,
           [unidad_id, c.id]
        );

        if (alertaExistente.rows.length === 0) {
           await pool.query(
              `INSERT INTO alertas_mantenimiento (unidad_id, parte_id, mensaje, estado)
               VALUES ($1, $2, $3, 'ACTIVO')`,
              [unidad_id, c.id, `URGENTE Predictivo: [${c.nombre}] requiere mantenimiento inmediato. Límite superado.`]
           );
           alertasGeneradas++;
        }
      }
    }

    res.status(201).json({
      message: "Llegada registrada exitosamente",
      reporte: reporte.rows[0],
      alertasNuevas: alertasGeneradas
    });

  } catch (error) {
    console.error("Error al registrar llegada:", error);
    res.status(500).json({ error: "Error interno del servidor", detalle: error.message });
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
};
    