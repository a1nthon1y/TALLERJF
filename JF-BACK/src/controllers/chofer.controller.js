const pool = require("../config/db");
const { generarCodigo } = require("./maintenance.controller");
const { evaluarMotorPredictivo } = require("../services/predictive-engine");

// ───────────────────────────────────────────────────────────────────────
// Helper: valida que el usuario candidato pueda vincularse a un perfil
//   - debe existir
//   - debe tener el rol esperado
//   - debe estar activo (sin sentido vincular cuentas apagadas)
//   - no debe estar ya vinculado a otro registro de la misma tabla
//     (excludeId permite saltarse esta verificación al editar el mismo perfil)
// ───────────────────────────────────────────────────────────────────────
async function validarUsuarioVinculable({ usuario_id, rolEsperado, tabla, excludeId = null }) {
  const userQ = await pool.query(
    "SELECT id, nombre, rol, activo FROM usuarios WHERE id = $1",
    [usuario_id]
  );
  if (userQ.rows.length === 0) {
    return { ok: false, status: 404, message: `El usuario seleccionado (id ${usuario_id}) no existe.` };
  }
  const u = userQ.rows[0];
  if (u.rol !== rolEsperado) {
    return {
      ok: false,
      status: 400,
      message: `El usuario "${u.nombre}" tiene rol ${u.rol}, no ${rolEsperado}. Crea uno con el rol correcto desde Usuarios.`,
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
  // Verificar que no esté ya vinculado a otro registro de la misma tabla
  const params = excludeId ? [usuario_id, excludeId] : [usuario_id];
  const dupQ = await pool.query(
    `SELECT id FROM ${tabla} WHERE usuario_id = $1 ${excludeId ? "AND id != $2" : ""}`,
    params
  );
  if (dupQ.rows.length > 0) {
    return {
      ok: false,
      status: 409,
      code: "USUARIO_YA_VINCULADO",
      message: `El usuario "${u.nombre}" ya está vinculado a otro registro de ${tabla}. Un usuario solo puede tener un perfil del mismo tipo.`,
    };
  }
  return { ok: true, usuario: u };
}

// ===============================================================
//  ✅ Crear chofer
// ===============================================================
const createDriver = async (req, res) => {
  try {
    const { usuario_id, licencia } = req.body;
    // NOTA: `telefono` ya no se acepta aquí. El teléfono vive en `usuarios`
    // — se gestiona desde la página de Usuarios, no desde Choferes.

    if (!usuario_id || !licencia) {
      return res.status(400).json({ message: "usuario_id y licencia son obligatorios" });
    }

    const v = await validarUsuarioVinculable({ usuario_id, rolEsperado: "CHOFER", tabla: "choferes" });
    if (!v.ok) return res.status(v.status).json({ code: v.code, message: v.message });

    const result = await pool.query(
      `
      INSERT INTO choferes (usuario_id, licencia)
      VALUES ($1, $2)
      RETURNING *
      `,
      [usuario_id, licencia]
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
        c.activo,
        c.creado_en,

        u.id AS usuario_id,
        u.nombre AS usuario_nombre,
        u.correo AS usuario_correo,
        u.telefono AS usuario_telefono,
        u.dni AS usuario_dni

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
        c.creado_en,

        u.id AS usuario_id,
        u.nombre AS usuario_nombre,
        u.correo AS usuario_correo,
        u.telefono AS usuario_telefono,
        u.dni AS usuario_dni

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
    const { usuario_id, licencia } = req.body;
    // NOTA: `telefono` ya no se acepta aquí. El teléfono vive en `usuarios`.

    if (usuario_id) {
      const v = await validarUsuarioVinculable({
        usuario_id,
        rolEsperado: "CHOFER",
        tabla: "choferes",
        excludeId: id,
      });
      if (!v.ok) return res.status(v.status).json({ code: v.code, message: v.message });
    }

    const result = await pool.query(
      `
      UPDATE choferes
      SET usuario_id = $1, licencia = $2
      WHERE id = $3
      RETURNING *
      `,
      [usuario_id, licencia, id]
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

    // Advertencias informativas al desactivar (no bloquean): la asignación
    // chofer↔unidad se conserva para no perder relaciones, pero el chofer
    // dejará de poder operar (ver chofer.getMiUnidad y crearReporteLlegada).
    const advertencias = [];
    if (activo) {
      const u = await pool.query(
        "SELECT COUNT(*)::int AS total FROM unidades WHERE chofer_id = $1 AND activo = TRUE",
        [id]
      );
      if (u.rows[0].total > 0) {
        advertencias.push(
          `Tiene ${u.rows[0].total} unidad(es) activa(s) asignada(s). Mientras esté desactivado no podrá registrar llegadas ni reportar fallas. La asignación se mantiene.`
        );
      }
    }

    const result = await pool.query(
      "UPDATE choferes SET activo = $1 WHERE id = $2 RETURNING activo",
      [!activo, id]
    );

    const nuevoEstado = result.rows[0].activo ? "activado" : "desactivado";
    res.json({
      message: `Chofer ${nombre} ${nuevoEstado} correctamente`,
      activo: result.rows[0].activo,
      advertencias,
    });
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
    // Solo entregamos al chofer las unidades activas (operativas). Las
    // desactivadas se reportan por separado para que el frontend pueda
    // mostrar un mensaje claro ("tu bus está fuera de servicio") en vez
    // de un 404 genérico o, peor, datos como si nada hubiera cambiado.
    const unidadQuery = await pool.query(
      `SELECT id, placa, modelo, año, tipo, kilometraje, activo
         FROM unidades
        WHERE chofer_id = $1
        ORDER BY activo DESC, id ASC`,
      [chofer_id]
    );

    const activas = unidadQuery.rows.filter((u) => u.activo);
    const desactivadas = unidadQuery.rows.filter((u) => !u.activo);

    if (activas.length === 0) {
      if (desactivadas.length > 0) {
        return res.status(409).json({
          code: "UNIDADES_DESACTIVADAS",
          message:
            desactivadas.length === 1
              ? `La unidad ${desactivadas[0].placa} a la que estás asignado está desactivada. Contacta al administrador para reactivarla.`
              : `Tus ${desactivadas.length} unidades asignadas (${desactivadas.map((u) => u.placa).join(", ")}) están desactivadas. Contacta al administrador.`,
          unidades_desactivadas: desactivadas,
        });
      }
      return res.status(404).json({ message: "No tienes una unidad asignada actualmente" });
    }

    res.json({ unidades: activas, unidades_desactivadas: desactivadas });
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
    const unidadQuery = await pool.query(
      "SELECT placa, kilometraje, activo FROM unidades WHERE id = $1",
      [unidad_id]
    );
    if (unidadQuery.rows.length === 0) return res.status(404).json({ message: "Unidad no encontrada" });
    if (!unidadQuery.rows[0].activo) {
      return res.status(409).json({
        code: "UNIDAD_DESACTIVADA",
        message: `La unidad ${unidadQuery.rows[0].placa} está desactivada — no se puede registrar movimiento. Contacta al administrador para reactivarla.`,
      });
    }
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
//
//  Orden personalizado por chofer:
//    1. Rutas que el chofer ya usó antes → más frecuentes primero
//       (desempate: la última usada más recientemente)
//    2. Rutas nunca usadas por este chofer → alfabético
//
//  La unión es por nombre porque `reportes_llegada.origen` guarda el nombre
//  de la ruta (string libre); no hay FK a rutas.id. Esto permite que rutas
//  renombradas/eliminadas sigan funcionando sin perder histórico.
// ===============================================================
const getRutas = async (req, res) => {
  try {
    const usuario_id = req.user?.id;

    // Resolver chofer_id desde el JWT (CHOFER → tabla choferes)
    let chofer_id = null;
    if (usuario_id) {
      const c = await pool.query("SELECT id FROM choferes WHERE usuario_id = $1", [usuario_id]);
      chofer_id = c.rows[0]?.id ?? null;
    }

    // Si por alguna razón no hay chofer_id (admin probando), fallback alfabético
    if (!chofer_id) {
      const fallback = await pool.query(
        "SELECT id, nombre FROM rutas WHERE activa = true ORDER BY nombre ASC"
      );
      return res.json(fallback.rows);
    }

    const result = await pool.query(
      `SELECT
         r.id,
         r.nombre,
         COALESCE(uso.veces, 0)        AS veces_usada,
         uso.ultimo_uso                AS ultimo_uso
       FROM rutas r
       LEFT JOIN (
         SELECT origen, COUNT(*) AS veces, MAX(creado_en) AS ultimo_uso
         FROM reportes_llegada
         WHERE chofer_id = $1 AND origen IS NOT NULL
         GROUP BY origen
       ) uso ON uso.origen = r.nombre
       WHERE r.activa = true
       ORDER BY
         COALESCE(uso.veces, 0) DESC,
         uso.ultimo_uso         DESC NULLS LAST,
         r.nombre               ASC`,
      [chofer_id]
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
    