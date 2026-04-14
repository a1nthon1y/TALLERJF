const express = require("express");
const router = express.Router();
const reportController = require("../controllers/report.controller");
const authenticate = require("../middlewares/auth.middleware");

// Reporte de todos los mantenimientos (con opción de filtrar por dueño)
router.get("/maintenances", authenticate, reportController.getMaintenanceReport);

// Reporte de materiales utilizados (con opción de filtrar por dueño)
router.get("/materials", authenticate, reportController.getMaterialUsageReport);

// Reporte de costos por unidad (con opción de filtrar por dueño)
router.get("/costs", authenticate, reportController.getCostReport);

// Reporte de unidades por dueño (nuevo)
router.get("/units/:duenoId", authenticate, reportController.getUnitsByOwnerReport);

module.exports = router;
