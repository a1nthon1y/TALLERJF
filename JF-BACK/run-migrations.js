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
    //    Idempotente: cada bloque usa IF NOT EXISTS / DROP CONSTRAINT IF EXISTS
    //    para que correr este script múltiples veces sea seguro.
    const customMigration = `
      -- ── Tabla: tecnicos (no existe en el dump base) ────────────────────
      CREATE TABLE IF NOT EXISTS tecnicos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        dni VARCHAR(15),
        especialidad VARCHAR(100),
        activo BOOLEAN DEFAULT TRUE,
        usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
        creado_en TIMESTAMP DEFAULT NOW()
      );

      -- ── Tabla: configuracion_partes ────────────────────────────────────
      CREATE TABLE IF NOT EXISTS configuracion_partes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        umbral_km INT NOT NULL,
        activo BOOLEAN DEFAULT TRUE,
        creado_en TIMESTAMP DEFAULT NOW()
      );
      -- Garantiza la columna 'activo' aunque la tabla ya existiera sin ella
      ALTER TABLE configuracion_partes
        ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

      -- ── Tabla: estado_partes_unidad ────────────────────────────────────
      CREATE TABLE IF NOT EXISTS estado_partes_unidad (
        id SERIAL PRIMARY KEY,
        unidad_id INT REFERENCES unidades(id) ON DELETE CASCADE,
        configuracion_parte_id INT REFERENCES configuracion_partes(id) ON DELETE CASCADE,
        ultimo_mantenimiento_km INT NOT NULL DEFAULT 0,
        ultimo_mantenimiento_fecha TIMESTAMP DEFAULT NOW(),
        UNIQUE(unidad_id, configuracion_parte_id)
      );

      -- ── Tabla: reportes_llegada ────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS reportes_llegada (
        id SERIAL PRIMARY KEY,
        chofer_id INT REFERENCES choferes(id) ON DELETE SET NULL,
        unidad_id INT REFERENCES unidades(id) ON DELETE CASCADE,
        kilometraje INT NOT NULL,
        origen VARCHAR(255),
        comentarios TEXT,
        creado_en TIMESTAMP DEFAULT NOW()
      );

      -- ── mantenimientos: tecnico_id + partes_programadas ────────────────
      ALTER TABLE mantenimientos
        ADD COLUMN IF NOT EXISTS tecnico_id INT REFERENCES tecnicos(id) ON DELETE SET NULL;
      ALTER TABLE mantenimientos
        ADD COLUMN IF NOT EXISTS partes_programadas JSONB DEFAULT '[]'::jsonb;

      -- ── duenos: usuario_id (necesario para getMyUnits del owner) ──────
      ALTER TABLE duenos
        ADD COLUMN IF NOT EXISTS usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL;

      -- ── Relax CHECK de mantenimientos.estado ───────────────────────────
      --   El dump base solo permite ('PENDIENTE','REALIZADO'); el sistema
      --   también usa EN_PROCESO, COMPLETADO y CERRADO.
      ALTER TABLE mantenimientos DROP CONSTRAINT IF EXISTS mantenimientos_estado_check;
      ALTER TABLE mantenimientos ADD CONSTRAINT mantenimientos_estado_check
        CHECK (estado IN ('PENDIENTE','EN_PROCESO','COMPLETADO','CERRADO','REALIZADO'));

      -- ── Relax CHECK de usuarios.rol ────────────────────────────────────
      --   El dump solo permite ('ADMIN','CHOFER'); el RBAC real tiene 5 roles.
      ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
      ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
        CHECK (rol IN ('ADMIN','ENCARGADO','OWNER','CHOFER','TECNICO'));

      -- ── Relax CHECK de unidades.tipo ───────────────────────────────────
      --   Cubre tanto los valores legacy del dump (BUS/CARGA/MINIVAN) como
      --   los nuevos tipos usados por el bootstrap normalizer.
      ALTER TABLE unidades DROP CONSTRAINT IF EXISTS unidades_tipo_check;
      ALTER TABLE unidades ADD CONSTRAINT unidades_tipo_check
        CHECK (tipo IN ('BUS','CARGA','MINIVAN','VAN','CAMION','OTRO'));
    `;
    
    console.log("Applying custom migrations...");
    await pool.query(customMigration);
    console.log("Migrations applied successfully!");

    // 3. Sembrar el material especial "Servicio en Ruta" (idempotente).
    //    Este material lo usa `crearReporteLlegada` para registrar costos
    //    de trabajos hechos en ruta. Si no existe al momento de la llegada,
    //    el código tenía que crearlo en runtime (race condition + bug de
    //    columna `precio_unitario` que no existe). Lo sembramos acá para
    //    que el runtime solo necesite hacer SELECT.
    await pool.query(`
      INSERT INTO materiales (nombre, precio, stock)
      SELECT 'Servicio en Ruta', 0, 0
      WHERE NOT EXISTS (SELECT 1 FROM materiales WHERE nombre = 'Servicio en Ruta');
    `);
    console.log("🟢 Seed 'Servicio en Ruta' verificado");
    
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
