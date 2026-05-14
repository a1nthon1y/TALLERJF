const express = require("express");
const router = express.Router();
const reportController = require("../controllers/report.controller");
const authenticate = require("../middlewares/auth.middleware");
const checkRole = require("../middlewares/role.middleware");

// Convención: todos los reportes aceptan ?formato=json|xlsx|pdf
// y filtros vía query string (ver report.controller.js para cada uno).

// ── Reportes administrativos ───────────────────────────────────────────────
// Mantenimientos por período (con filtros: desde, hasta, tipo, estado, dueno_id, unidad_id, tecnico_id)
router.get(
  "/maintenances",
  authenticate,
  checkRole(["ADMIN", "ENCARGADO"]),
  reportController.getMaintenanceReport
);

// Productividad por técnico (filtros: desde, hasta, tecnico_id)
router.get(
  "/technician-productivity",
  authenticate,
  checkRole(["ADMIN", "ENCARGADO"]),
  reportController.getTechnicianProductivity
);

// ── Reportes para owner (estado de cuenta de SUS unidades) ─────────────────
router.get(
  "/owner-statement",
  authenticate,
  checkRole(["OWNER"]),
  reportController.getOwnerStatement
);

// ── Reporte para chofer (su unidad asignada) ───────────────────────────────
router.get(
  "/my-unit",
  authenticate,
  checkRole(["CHOFER"]),
  reportController.getDriverUnitReport
);

module.exports = router;
