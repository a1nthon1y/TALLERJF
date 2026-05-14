const express = require("express");
const router = express.Router();
const reportController = require("../controllers/report.controller");
const authenticate = require("../middlewares/auth.middleware");
const checkRole = require("../middlewares/role.middleware");

// Reporte de todos los mantenimientos (admin/encargado).
router.get("/maintenances", authenticate, checkRole(["ADMIN", "ENCARGADO"]), reportController.getMaintenanceReport);

// Reporte del OWNER autenticado: mantenimientos de todas sus unidades.
router.get("/my-units", authenticate, checkRole(["OWNER"]), reportController.getMyUnitsReport);

// Reporte del CHOFER autenticado: solo su unidad asignada.
router.get("/my-unit", authenticate, checkRole(["CHOFER"]), reportController.getMyUnitReports);

module.exports = router;
