require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Importar rutas
const authRoutes = require("./routes/auth.routes");
const unitRoutes = require("./routes/unit.routes");
const choferRoutes = require("./routes/chofer.routes");
const maintenanceRoutes = require("./routes/maintenance.routes");
const reportRoutes = require("./routes/report.routes");
const alertRoutes = require("./routes/alert.routes");
const ownerRoutes = require("./routes/owner.routes");
const userRoutes = require("./routes/user.routes");
const technicianRoutes = require("./routes/technician.routes");
const materialRoutes = require("./routes/material.routes");
const configRoutes = require("./routes/config.routes");
const rutasRoutes = require("./routes/rutas.routes");
const especialidadRoutes = require("./routes/especialidad.routes");

// Validación temprana de configuración crítica.
// Detectar secretos faltantes al arranque, no en el primer request.
if (!process.env.JWT_SECRET) {
  console.error("🔴 Falta JWT_SECRET en el entorno. Define la variable antes de iniciar el servidor.");
  process.exit(1);
}

// Inicializar servidor
const app = express();

// CORS: si se define CORS_ORIGINS en .env (lista separada por comas), restringe
// a esos orígenes. En desarrollo (sin variable) permite todos.
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : null;
app.use(cors(corsOrigins ? { origin: corsOrigins, credentials: true } : undefined));

app.use(express.json());

// Configurar rutas
app.use("/api/auth", authRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/choferes", choferRoutes);
app.use("/api/maintenances", maintenanceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/owners", ownerRoutes);
app.use("/api/users", userRoutes);
app.use("/api/technicians", technicianRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/config", configRoutes);
app.use("/api/rutas", rutasRoutes);
app.use("/api/especialidades", especialidadRoutes);

// Iniciar servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🟢 Servidor corriendo en http://localhost:${PORT}`);
});
