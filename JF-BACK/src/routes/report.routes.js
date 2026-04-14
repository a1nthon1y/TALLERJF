const express = require("express");
const router = express.Router();
const reportController = require("../controllers/report.controller");
const authenticate = require("../middlewares/auth.middleware");
const checkRole = require("../middlewares/role.middleware");

// Reporte de todos los mantenimientos (solo para administración)
router.get("/maintenances", authenticate, checkRole(["ADMIN", "ENCARGADO"]), reportController.getMaintenanceReport);

// Reporte de materiales utilizados (solo admins)
router.get("/materials", authenticate, checkRole(["ADMIN", "ENCARGADO"]), reportController.getMaterialUsageReport);

// Reporte de costos por unidad (solo admins)
router.get("/costs", authenticate, checkRole(["ADMIN", "ENCARGADO"]), reportController.getCostReport);

// Reporte de unidades por dueño (solo admins)
router.get("/units/:duenoId", authenticate, checkRole(["ADMIN", "ENCARGADO"]), reportController.getUnitsByOwnerReport);

// ** NUEVO: Mis reportes ** (Sólo choferes)
router.get("/my-unit", authenticate, checkRole(["CHOFER"]), reportController.getMyUnitReports);

module.exports = router;
