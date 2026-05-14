const pool = require("./src/config/db");
const fs = require("fs");
const path = require("path");

async function run() {
  try {
    // 1. Verificar si las tablas base existen
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
      const dumpPath = path.join(__dirname, "gestion-flota.sql");
      if (!fs.existsSync(dumpPath)) {
        console.error("🔴 Las tablas base no existen y `gestion-flota.sql` no está en el repo.");
        console.error("   Ubica el dump inicial en:", dumpPath);
        console.error("   o crea las tablas base manualmente en tu base de datos antes de migrar.");
        process.exit(1);
      }
      console.log("Tablas base no encontradas. Importando gestion-flota.sql...");
      const sqlDump = fs.readFileSync(dumpPath, "utf8");
      await pool.query(sqlDump);
      console.log("Tablas base importadas correctamente.");
    } else {
      console.log("Tablas base ya existen.");
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

      -- ── unidades: columna activo para soft-disable ─────────────────────
      ALTER TABLE unidades
        ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

      -- ── choferes: columna activo para soft-disable ───────────────────────
      ALTER TABLE choferes
        ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

      -- ── materiales: columna activo para soft-disable ─────────────────────
      ALTER TABLE materiales
        ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

      -- ── materiales: flag es_externo para compras puntuales fuera del stock ──
      --   Cuando un tecnico necesita una pieza urgente que no esta en el
      --   inventario, la registra como "compra externa" desde el dialog del
      --   mantenimiento. Se crea (o reutiliza) un material con es_externo=true,
      --   el sobrante (cantidad_comprada - cantidad_usada) entra al stock.
      --   Diferencia visual en frontend: badge "Externo" en catalogo y detalles.
      ALTER TABLE materiales
        ADD COLUMN IF NOT EXISTS es_externo BOOLEAN DEFAULT FALSE;

      -- ── usuarios: datos de contacto centralizados ───────────────────────
      --   Antes:  choferes.telefono y tecnicos.dni vivian dispersos por tabla.
      --   Ahora:  todo dato personal (telefono, dni) vive en usuarios.
      --           Single source of truth. Los perfiles (chofer/tecnico/dueno)
      --           solo se vinculan al usuario y leen estos datos por JOIN.
      ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS telefono VARCHAR(15);
      ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS dni VARCHAR(15);

      -- Backfill: mover datos legacy de choferes.telefono a usuarios.telefono
      --   Sólo si la columna aún existe (idempotente entre ejecuciones).
      DO $mig$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'choferes' AND column_name = 'telefono'
        ) THEN
          UPDATE usuarios u
          SET    telefono = c.telefono
          FROM   choferes c
          WHERE  c.usuario_id = u.id
            AND  c.telefono IS NOT NULL
            AND  c.telefono <> ''
            AND  (u.telefono IS NULL OR u.telefono = '');
        END IF;
      END $mig$;

      -- Backfill: mover datos legacy de tecnicos.dni a usuarios.dni
      DO $mig2$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tecnicos' AND column_name = 'dni'
        ) THEN
          UPDATE usuarios u
          SET    dni = t.dni
          FROM   tecnicos t
          WHERE  t.usuario_id = u.id
            AND  t.dni IS NOT NULL
            AND  t.dni <> ''
            AND  (u.dni IS NULL OR u.dni = '');
        END IF;
      END $mig2$;

      -- DROP de columnas legacy (single source of truth en usuarios)
      ALTER TABLE choferes DROP COLUMN IF EXISTS telefono;
      ALTER TABLE tecnicos DROP COLUMN IF EXISTS dni;

      -- ── especialidades: catálogo administrable de especialidades ──────────
      CREATE TABLE IF NOT EXISTS especialidades (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        activo BOOLEAN DEFAULT TRUE,
        creado_en TIMESTAMP DEFAULT NOW()
      );
      INSERT INTO especialidades (nombre) VALUES
        ('Mecánica General'),
        ('Electricidad Automotriz'),
        ('Frenos y Suspensión'),
        ('Motor y Transmisión'),
        ('Diagnóstico Electrónico')
      ON CONFLICT (nombre) DO NOTHING;

      -- ── mantenimientos: columna codigo (anteriormente en db.js) ──────────
      ALTER TABLE mantenimientos
        ADD COLUMN IF NOT EXISTS codigo VARCHAR(20) UNIQUE;

      -- ── rutas: catálogo de rutas para reportes de llegada del chofer ────
      --   Anteriormente esta tabla se creaba "lazy" en chofer.controller y
      --   rutas.controller, lo que producía DDL duplicado en cada request.
      CREATE TABLE IF NOT EXISTS rutas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL,
        activa BOOLEAN DEFAULT true,
        orden INT DEFAULT 0
      );
      INSERT INTO rutas (nombre, orden)
      SELECT v.nombre, v.orden FROM (VALUES
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
      ) AS v(nombre, orden)
      WHERE NOT EXISTS (SELECT 1 FROM rutas WHERE LOWER(rutas.nombre) = LOWER(v.nombre));
    `;
    
    console.log("Applying custom migrations...");
    await pool.query(customMigration);
    console.log("Migrations applied successfully!");

    // 2.b. Backfill: generar `codigo` para mantenimientos antiguos sin código
    //      (anteriormente vivía en db.js como side-effect del primer connect).
    const codigoBackfill = await pool.query(`
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
      WHERE codigo IS NULL
      RETURNING id
    `);
    if (codigoBackfill.rowCount > 0) {
      console.log(`🟢 Backfill codigo: ${codigoBackfill.rowCount} mantenimiento(s) actualizado(s)`);
    }

    // 2.c. Normalizar tipo de unidades a mayúsculas (anteriormente en db.js)
    const tipoNorm = await pool.query(
      `UPDATE unidades SET tipo = UPPER(tipo) WHERE tipo != UPPER(tipo) RETURNING id`
    );
    if (tipoNorm.rowCount > 0) {
      console.log(`🟢 Normalización tipo unidades: ${tipoNorm.rowCount} fila(s)`);
    }

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

    // 4. Backfill one-time de estado_partes_unidad: para cada (unidad, regla activa)
    //    sin fila previa, crear baseline con ultimo_mantenimiento_km = km actual de la unidad.
    //    Esto corrige el bug donde COALESCE(epu.ultimo_mantenimiento_km, 0) producía
    //    "Vencido +X km" falso en /partes-unidades para unidades sin historial registrado.
    //    A partir de ahora createUnit y createPartConfig hacen el INSERT al momento,
    //    pero esta migración cubre la base instalada.
    const baseline = await pool.query(`
      INSERT INTO estado_partes_unidad
        (unidad_id, configuracion_parte_id, ultimo_mantenimiento_km, ultimo_mantenimiento_fecha)
      SELECT u.id, cp.id, COALESCE(u.kilometraje, 0), NOW()
      FROM unidades u
      CROSS JOIN configuracion_partes cp
      WHERE cp.activo = TRUE
      ON CONFLICT (unidad_id, configuracion_parte_id) DO NOTHING
      RETURNING id
    `);
    if (baseline.rowCount > 0) {
      console.log(`🟢 Backfill estado_partes_unidad: ${baseline.rowCount} fila(s) inicializadas con km actual de cada unidad`);
    }
  } catch (err) {
    console.error("🔴 Migration failed:", err.message);
    if (err.stack) console.error(err.stack);
    await pool.end().catch(() => {});
    process.exit(1);
  } finally {
    await pool.end().catch(() => {});
  }
}

run();
