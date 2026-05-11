const { Pool } = require("pg");
require("dotenv").config();

let poolConfig = {};

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
  };
} else {
  poolConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  };
  if (process.env.DB_SSL === "true") {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
}

const pool = new Pool(poolConfig);

pool.on('error', (err, client) => {
  console.error('🔴 Error inesperado en el pool de PostgreSQL:', err.message);
});

pool.connect()
  .then(async client => {
    console.log("🟢 Conectado a PostgreSQL");
    try {
      // Agregar columna codigo si no existe
      await client.query(`
        ALTER TABLE mantenimientos
        ADD COLUMN IF NOT EXISTS codigo VARCHAR(20) UNIQUE;
      `);

      // Backfill: generar código para registros que no lo tengan
      await client.query(`
        UPDATE mantenimientos
        SET codigo = CONCAT(
          CASE tipo
            WHEN 'PREVENTIVO' THEN 'PRV'
            WHEN 'CORRECTIVO' THEN
              CASE WHEN estado = 'REALIZADO' THEN 'CAM' ELSE 'CRR' END
            ELSE 'MNT'
          END,
          '-',
          TO_CHAR(COALESCE(fecha_solicitud, NOW()), 'YYMM'),
          '-',
          LPAD(id::text, 4, '0')
        )
        WHERE codigo IS NULL;
      `);

      console.log("🟢 Migración codigo completada");
    } catch (e) {
      console.error("🟡 Migración codigo:", e.message);
    }
    client.release();
  })
  .catch(err => console.error("🔴 Error de conexión:", err.message));

module.exports = pool;
