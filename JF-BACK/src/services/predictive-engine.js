const pool = require("../config/db");

/**
 * Motor predictivo compartido. Dado un kilometraje nuevo de una unidad, evalúa
 * todas las reglas activas en `configuracion_partes` y emite/resuelve alertas.
 *
 *   km_recorridos = kmNuevo − epu.ultimo_mantenimiento_km
 *
 *   - km_recorridos ≥ umbral_km Y no existe alerta ACTIVO previa → INSERT alerta.
 *   - km_recorridos <  umbral_km Y existe alerta ACTIVO huérfana → marca RESUELTO.
 *
 * El segundo caso solo se materializa cuando un admin **corrige hacia atrás**
 * un kilometraje cargado por error (típico error humano del chofer). En el flujo
 * normal de llegadas el km solo crece, así que ese branch es no-op.
 *
 * Asume el invariante: toda combinación (unidad, regla activa) tiene fila en
 * `estado_partes_unidad` (lo garantizan createUnit, createPartConfig y la
 * migración de backfill). Si por algún motivo falta la fila, se inicializa
 * defensivamente con kmNuevo y se omite la evaluación de esta parte.
 *
 * @param {number} unidadId
 * @param {number} kmNuevo
 * @returns {Promise<{ alertasGeneradas: number, alertasResueltas: number }>}
 */
async function evaluarMotorPredictivo(unidadId, kmNuevo) {
  const result = { alertasGeneradas: 0, alertasResueltas: 0 };

  const configs = await pool.query(
    "SELECT id, nombre, umbral_km FROM configuracion_partes WHERE activo = TRUE"
  );

  for (const c of configs.rows) {
    const epu = await pool.query(
      "SELECT ultimo_mantenimiento_km FROM estado_partes_unidad WHERE unidad_id = $1 AND configuracion_parte_id = $2",
      [unidadId, c.id]
    );

    if (epu.rows.length === 0) {
      await pool.query(
        `INSERT INTO estado_partes_unidad (unidad_id, configuracion_parte_id, ultimo_mantenimiento_km)
         VALUES ($1, $2, $3)
         ON CONFLICT (unidad_id, configuracion_parte_id) DO NOTHING`,
        [unidadId, c.id, kmNuevo]
      );
      continue;
    }

    const ultimoMantenimientoKm = Number(epu.rows[0].ultimo_mantenimiento_km) || 0;
    const kmRecorridos = Number(kmNuevo) - ultimoMantenimientoKm;

    if (kmRecorridos >= c.umbral_km) {
      const existe = await pool.query(
        `SELECT 1 FROM alertas_mantenimiento
         WHERE unidad_id = $1 AND parte_id = $2 AND estado != 'RESUELTO' LIMIT 1`,
        [unidadId, c.id]
      );
      if (existe.rows.length === 0) {
        await pool.query(
          `INSERT INTO alertas_mantenimiento (unidad_id, parte_id, mensaje, estado)
           VALUES ($1, $2, $3, 'ACTIVO')`,
          [
            unidadId,
            c.id,
            `URGENTE Predictivo: [${c.nombre}] requiere mantenimiento inmediato. Límite superado.`,
          ]
        );
        result.alertasGeneradas++;
      }
    } else {
      const r = await pool.query(
        `UPDATE alertas_mantenimiento SET estado = 'RESUELTO'
         WHERE unidad_id = $1 AND parte_id = $2 AND estado = 'ACTIVO'`,
        [unidadId, c.id]
      );
      result.alertasResueltas += r.rowCount || 0;
    }
  }

  return result;
}

module.exports = { evaluarMotorPredictivo };
