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

pool.on("error", (err) => {
  console.error("🔴 Error inesperado en el pool de PostgreSQL:", err.message);
});

// IMPORTANTE: este módulo solo expone el pool de conexión.
// Toda evolución de schema (ALTER, UPDATE, INSERT seed) vive en
// `run-migrations.js`. NO ejecutar DDL aquí — esa duplicación causa que el
// estado del schema dependa de "si reiniciaste el server", no de "si corriste
// las migraciones". Ejecuta `npm run migrate` en cada despliegue.
pool.connect()
  .then((client) => {
    console.log("🟢 Conectado a PostgreSQL");
    client.release();
  })
  .catch((err) => console.error("🔴 Error de conexión:", err.message));

module.exports = pool;
