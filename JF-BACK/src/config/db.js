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
  .then(client => {
    console.log("🟢 Conectado a PostgreSQL");
    client.release();
  })
  .catch(err => console.error("🔴 Error de conexión:", err.message));

module.exports = pool;
