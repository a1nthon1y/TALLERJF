const express = require("express");
const router = express.Router();
const maintenanceController = require("../controllers/maintenance.controller");
const authenticate = require("../middlewares/auth.middleware");
const checkRole = require("../middlewares/role.middleware");

// Lectura para cualquier autenticado
router.get("/", authenticate, maintenanceController.getAllMaintenances);
router.get("/:id", authenticate, maintenanceController.getMaintenanceById);

// Escritura solo ADMIN y ENCARGADO
router.post("/", authenticate, checkRole(["ADMIN", "ENCARGADO"]), maintenanceController.createMaintenance);
router.put("/:id", authenticate, checkRole(["ADMIN", "ENCARGADO"]), maintenanceController.updateMaintenanceStatus);

module.exports = router;
