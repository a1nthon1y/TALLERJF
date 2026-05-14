const express = require("express");
const router = express.Router();
const reportController = require("../controllers/report.controller");
const authenticate = require("../middlewares/auth.middleware");
const checkRole = require("../middlewares/role.middleware");

// Convención: todos los reportes aceptan ?formato=json|xlsx|pdf
// y filtros vía query string (ver report.controller.js para cada uno).

const adminOnly = checkRole(["ADMIN", "ENCARGADO"]);

// ── Reportes administrativos (admin / encargado) ───────────────────────────
router.get("/maintenances",            authenticate, adminOnly, reportController.getMaintenanceReport);
router.get("/technician-productivity", authenticate, adminOnly, reportController.getTechnicianProductivity);
router.get("/cost-by-owner",           authenticate, adminOnly, reportController.getCostByOwner);
router.get("/materials-consumption",   authenticate, adminOnly, reportController.getMaterialsConsumption);
router.get("/top-units",               authenticate, adminOnly, reportController.getTopUnits);
router.get("/predictive-compliance",   authenticate, adminOnly, reportController.getPredictiveCompliance);
router.get("/arrivals-log",            authenticate, adminOnly, reportController.getArrivalsLog);

// ── Reportes para owner ────────────────────────────────────────────────────
// /my-units    → array crudo (vista funcional /dueno/mantenimientos)
// /owner-*     → wrapper para PDF/Excel (vista /dueno/reportes)
router.get("/my-units",         authenticate, checkRole(["OWNER"]), reportController.getMyUnitsReport);
router.get("/owner-statement",  authenticate, checkRole(["OWNER"]), reportController.getOwnerStatement);
router.get("/owner-upcoming",   authenticate, checkRole(["OWNER"]), reportController.getOwnerUpcomingMaintenance);

// ── Reporte para chofer (su unidad asignada) ───────────────────────────────
router.get("/my-unit",          authenticate, checkRole(["CHOFER"]),  reportController.getDriverUnitReport);

// ── Reporte para técnico (sus trabajos) ────────────────────────────────────
router.get("/my-jobs",          authenticate, checkRole(["TECNICO"]), reportController.getTechnicianMyJobs);

module.exports = router;
