const pool = require("../config/db");

// GET /maintenances/:id/materials — cualquier usuario autenticado puede ver los materiales
const getMaterials = async (req, res) => {
  try {
    const { id } = req.params;

    const mantCheck = await pool.query("SELECT id FROM mantenimientos WHERE id = $1", [id]);
    if (mantCheck.rows.length === 0) {
      return res.status(404).json({ message: "Mantenimiento no encontrado" });
    }

    const result = await pool.query(
      `SELECT dm.id, dm.material_id, dm.cantidad, dm.costo_total,
              mat.nombre, mat.precio AS precio_unitario, mat.es_externo
       FROM detalles_mantenimiento dm
       JOIN materiales mat ON dm.material_id = mat.id
       WHERE dm.mantenimiento_id = $1
       ORDER BY dm.id ASC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /maintenances/:id/materials — ADMIN/ENCARGADO/TECNICO registran material usado
const addMaterial = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { material_id, cantidad } = req.body;

    if (!material_id || !cantidad || Number(cantidad) <= 0) {
      return res.status(400).json({ message: "material_id y cantidad (> 0) son requeridos" });
    }

    await client.query("BEGIN");

    const mantCheck = await client.query("SELECT id, tecnico_id, estado FROM mantenimientos WHERE id = $1", [id]);
    if (mantCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Mantenimiento no encontrado" });
    }

    const mant = mantCheck.rows[0];

    // Nadie puede agregar materiales a un mantenimiento ya finalizado.
    // REALIZADO también está bloqueado: es un trabajo de campo cerrado al
    // momento de registrarse desde "reportar llegada".
    if (['COMPLETADO', 'CERRADO', 'REALIZADO'].includes(mant.estado)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `No se pueden agregar materiales a un mantenimiento en estado ${mant.estado}. El registro de materiales se cierra al completar el trabajo.`
      });
    }

    // Técnico solo puede agregar materiales a su propio trabajo
    if (req.user.rol === 'TECNICO') {
      const tecResult = await client.query("SELECT id FROM tecnicos WHERE usuario_id = $1", [req.user.id]);
      if (tecResult.rows.length === 0 || tecResult.rows[0].id !== mant.tecnico_id) {
        await client.query("ROLLBACK");
        return res.status(403).json({ message: "Solo puedes registrar materiales en tus propios trabajos" });
      }
    }

    const matResult = await client.query(
      "SELECT id, nombre, precio, stock FROM materiales WHERE id = $1",
      [material_id]
    );
    if (matResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Material no encontrado" });
    }

    const mat = matResult.rows[0];
    if (mat.stock < Number(cantidad)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: `Stock insuficiente. Disponible: ${mat.stock}` });
    }

    const costo_total = Number(mat.precio) * Number(cantidad);

    const inserted = await client.query(
      `INSERT INTO detalles_mantenimiento (mantenimiento_id, material_id, cantidad, costo_total)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, material_id, cantidad, costo_total]
    );

    await client.query(
      "UPDATE materiales SET stock = stock - $1 WHERE id = $2",
      [cantidad, material_id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      ...inserted.rows[0],
      nombre: mat.nombre,
      precio_unitario: mat.precio,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// DELETE /maintenances/:id/materials/:detalleId — ADMIN/ENCARGADO/TECNICO eliminan material y restauran stock
const removeMaterial = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id, detalleId } = req.params;

    await client.query("BEGIN");

    // Validar estado del mantenimiento (aplica a todos los roles)
    const mantCheck = await client.query("SELECT tecnico_id, estado FROM mantenimientos WHERE id = $1", [id]);
    if (mantCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Mantenimiento no encontrado" });
    }
    const mant = mantCheck.rows[0];

    // Nadie puede eliminar materiales de un mantenimiento ya finalizado
    // (incluye REALIZADO, que es trabajo de campo ya cerrado).
    if (['COMPLETADO', 'CERRADO', 'REALIZADO'].includes(mant.estado)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `No se pueden modificar materiales de un mantenimiento en estado ${mant.estado}.`
      });
    }

    // Técnico: validar ownership
    if (req.user.rol === 'TECNICO') {
      const tecResult = await client.query("SELECT id FROM tecnicos WHERE usuario_id = $1", [req.user.id]);
      if (tecResult.rows.length === 0 || tecResult.rows[0].id !== mant.tecnico_id) {
        await client.query("ROLLBACK");
        return res.status(403).json({ message: "Solo puedes eliminar materiales de tus propios trabajos" });
      }
    }

    const detalleResult = await client.query(
      "SELECT * FROM detalles_mantenimiento WHERE id = $1 AND mantenimiento_id = $2",
      [detalleId, id]
    );
    if (detalleResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Detalle no encontrado" });
    }

    const detalle = detalleResult.rows[0];

    await client.query("DELETE FROM detalles_mantenimiento WHERE id = $1", [detalleId]);

    await client.query(
      "UPDATE materiales SET stock = stock + $1 WHERE id = $2",
      [detalle.cantidad, detalle.material_id]
    );

    await client.query("COMMIT");

    res.json({ message: "Material eliminado y stock restaurado" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// POST /maintenances/:id/materials/external
//   Registra una "compra externa": pieza adquirida fuera del stock interno
//   (urgencia, no la teníamos). Acepta:
//     - nombre        : string (obligatorio)
//     - precio_unit   : number (obligatorio, costo unitario en S/.)
//     - cantidad_usada    : number (obligatorio, lo que se consumió en este trabajo)
//     - cantidad_comprada : number (opcional, default = cantidad_usada)
//     - descripcion   : string (opcional, notas/marca/proveedor)
//
//  Reglas:
//   - Crea o reutiliza un material `es_externo=true` con el mismo nombre
//     (case-insensitive) — evita duplicados si la misma pieza se compra
//     varias veces.
//   - El detalle del mantenimiento usa `cantidad_usada` y costo = precio*usada.
//   - El sobrante (comprada - usada) se acumula como stock del material para
//     futuros trabajos. Si ya existía y se agrega más sobrante, se suma.
//   - No descuenta stock interno (el material es externo).
//   - Mismas reglas de bloqueo que addMaterial (estado y ownership).
const addExternalMaterial = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { nombre, precio_unit, cantidad_usada, cantidad_comprada, descripcion } = req.body;

    const nombreLimpio = (nombre || "").trim();
    const precio = Number(precio_unit);
    const usada = Number(cantidad_usada);
    const comprada = cantidad_comprada == null ? usada : Number(cantidad_comprada);

    if (!nombreLimpio) {
      return res.status(400).json({ message: "El nombre de la pieza es obligatorio." });
    }
    if (!Number.isFinite(precio) || precio < 0) {
      return res.status(400).json({ message: "El costo unitario debe ser un número >= 0." });
    }
    if (!Number.isFinite(usada) || usada <= 0) {
      return res.status(400).json({ message: "La cantidad usada debe ser mayor a 0." });
    }
    if (!Number.isFinite(comprada) || comprada < usada) {
      return res.status(400).json({ message: "La cantidad comprada debe ser mayor o igual a la usada." });
    }

    await client.query("BEGIN");

    const mantCheck = await client.query(
      "SELECT id, tecnico_id, estado FROM mantenimientos WHERE id = $1",
      [id]
    );
    if (mantCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Mantenimiento no encontrado" });
    }
    const mant = mantCheck.rows[0];

    if (['COMPLETADO', 'CERRADO', 'REALIZADO'].includes(mant.estado)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `No se pueden agregar materiales a un mantenimiento en estado ${mant.estado}.`
      });
    }

    // Técnico solo en sus propios trabajos
    if (req.user.rol === 'TECNICO') {
      const tecResult = await client.query("SELECT id FROM tecnicos WHERE usuario_id = $1", [req.user.id]);
      if (tecResult.rows.length === 0 || tecResult.rows[0].id !== mant.tecnico_id) {
        await client.query("ROLLBACK");
        return res.status(403).json({ message: "Solo puedes registrar materiales en tus propios trabajos" });
      }
    }

    // Buscar material externo existente con el mismo nombre (case-insensitive).
    // Si existe → reutilizar. Si no → crear con stock = sobrante.
    const sobrante = comprada - usada;
    const existing = await client.query(
      `SELECT id, stock FROM materiales
        WHERE es_externo = TRUE AND LOWER(nombre) = LOWER($1)
        LIMIT 1`,
      [nombreLimpio]
    );

    let material_id;
    if (existing.rows.length > 0) {
      material_id = existing.rows[0].id;
      if (sobrante > 0) {
        await client.query(
          "UPDATE materiales SET stock = stock + $1, precio = $2 WHERE id = $3",
          [sobrante, precio, material_id]
        );
      } else {
        await client.query(
          "UPDATE materiales SET precio = $1 WHERE id = $2",
          [precio, material_id]
        );
      }
    } else {
      const created = await client.query(
        `INSERT INTO materiales (nombre, descripcion, stock, precio, activo, es_externo, creado_en)
         VALUES ($1, $2, $3, $4, TRUE, TRUE, NOW())
         RETURNING id`,
        [nombreLimpio, descripcion || null, sobrante, precio]
      );
      material_id = created.rows[0].id;
    }

    const costo_total = precio * usada;
    const inserted = await client.query(
      `INSERT INTO detalles_mantenimiento (mantenimiento_id, material_id, cantidad, costo_total)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, material_id, usada, costo_total]
    );

    await client.query("COMMIT");

    res.status(201).json({
      ...inserted.rows[0],
      nombre: nombreLimpio,
      precio_unitario: precio,
      es_externo: true,
      sobrante_a_stock: sobrante,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

module.exports = { getMaterials, addMaterial, removeMaterial, addExternalMaterial };
