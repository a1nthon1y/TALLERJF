const pool = require("./src/config/db");
const fs = require("fs");
const path = require("path");

async function run() {
  try {
    // 1. Verify if base tables exist
    let needsBaseImport = false;
    try {
      await pool.query("SELECT 1 FROM unidades LIMIT 1");
    } catch (err) {
      if (err.message.includes('relation "unidades" does not exist')) {
        needsBaseImport = true;
      } else {
        throw err;
      }
    }

    if (needsBaseImport) {
      console.log("Base tables not found. Importing gestion-flota.sql...");
      const sqlDump = fs.readFileSync(path.join(__dirname, "gestion-flota.sql"), "utf8");
      await pool.query(sqlDump);
      console.log("Base tables imported successfully!");
    } else {
      console.log("Base tables already exist.");
    }

    // 2. Run new schema migrations
    const customMigration = `
      CREATE TABLE IF NOT EXISTS configuracion_partes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        umbral_km INT NOT NULL,
        activo BOOLEAN DEFAULT TRUE,
        creado_en TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS estado_partes_unidad (
        id SERIAL PRIMARY KEY,
        unidad_id INT REFERENCES unidades(id) ON DELETE CASCADE,
        configuracion_parte_id INT REFERENCES configuracion_partes(id) ON DELETE CASCADE,
        ultimo_mantenimiento_km INT NOT NULL DEFAULT 0,
        ultimo_mantenimiento_fecha TIMESTAMP DEFAULT NOW(),
        UNIQUE(unidad_id, configuracion_parte_id)
      );

      CREATE TABLE IF NOT EXISTS reportes_llegada (
        id SERIAL PRIMARY KEY,
        chofer_id INT REFERENCES choferes(id) ON DELETE SET NULL,
        unidad_id INT REFERENCES unidades(id) ON DELETE CASCADE,
        kilometraje INT NOT NULL,
        origen VARCHAR(255),
        comentarios TEXT,
        creado_en TIMESTAMP DEFAULT NOW()
      );

      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mantenimientos' AND column_name='tecnico_id') THEN 
          ALTER TABLE mantenimientos ADD COLUMN tecnico_id INT REFERENCES tecnicos(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `;
    
    console.log("Applying custom migrations...");
    await pool.query(customMigration);
    console.log("Migrations applied successfully!");
    
    // Check missing parts in `configuracion_partes` and insert defaults if empty
    const { rowCount } = await pool.query("SELECT 1 FROM configuracion_partes LIMIT 1");
    if (rowCount === 0) {
       await pool.query(`
          INSERT INTO configuracion_partes (nombre, umbral_km) VALUES 
          ('Motor (Cambio de Aceite)', 5000),
          ('Frenos (Balatas)', 10000),
          ('Llantas', 30000),
          ('Batería', 50000)
       `);
       console.log("Inserted default configuration parts!");
    }
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}

run();
