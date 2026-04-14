require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Importar rutas
const authRoutes = require("./routes/auth.routes");
const unitRoutes = require("./routes/unit.routes");
const choferRoutes = require("./routes/chofer.routes");
const maintenanceRoutes = require("./routes/maintenance.routes");
const reportRoutes = require("./routes/report.routes");
const partRoutes = require("./routes/part.routes");
const alertRoutes = require("./routes/alert.routes");
const ownerRoutes = require("./routes/owner.routes");
const userRoutes = require("./routes/user.routes");
const technicianRoutes = require("./routes/technician.routes");
const materialRoutes = require("./routes/material.routes");
// Inicializar servidor
const app = express();
app.use(cors());
app.use(express.json());

// Configurar rutas
app.use("/api/auth", authRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/choferes", choferRoutes);
app.use("/api/maintenances", maintenanceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/parts", partRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/owners", ownerRoutes);
app.use("/api/users", userRoutes);
app.use("/api/technicians", technicianRoutes);
app.use("/api/materials", materialRoutes);
// Iniciar servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🟢 Servidor corriendo en http://localhost:${PORT}`);
});
