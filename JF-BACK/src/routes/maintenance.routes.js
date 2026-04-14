const express = require("express");
const router = express.Router();
const maintenanceController = require("../controllers/maintenance.controller");
const authenticate = require("../middlewares/auth.middleware");

// Registrar un mantenimiento (preventivo o correctivo)
router.post("/", authenticate, maintenanceController.createMaintenance);

// Obtener todos los mantenimientos
router.get("/", authenticate, maintenanceController.getAllMaintenances);

// Obtener un mantenimiento por ID
router.get("/:id", authenticate, maintenanceController.getMaintenanceById);

// Actualizar estado de un mantenimiento (ejemplo: completado)
router.put("/:id", authenticate, maintenanceController.updateMaintenanceStatus);

module.exports = router;
