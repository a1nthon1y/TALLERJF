const express = require("express");
const router = express.Router();
const maintenanceController = require("../controllers/maintenance.controller");
const { getMaterials, addMaterial, removeMaterial } = require("../controllers/maintenance-materials.controller");
const authenticate = require("../middlewares/auth.middleware");
const checkRole = require("../middlewares/role.middleware");

// Lectura para cualquier autenticado
router.get("/", authenticate, maintenanceController.getAllMaintenances);
// Trabajos asignados al técnico logueado (debe ir ANTES de /:id)
router.get("/my-jobs", authenticate, checkRole(["TECNICO"]), maintenanceController.getMyJobs);
// Mantenimientos por unidad (debe ir ANTES de /:id para no confundir rutas)
router.get("/unit/:unidadId", authenticate, maintenanceController.getMaintenancesByUnit);
router.get("/:id", authenticate, maintenanceController.getMaintenanceById);

// Creación: admin, encargado y chofer
router.post("/", authenticate, checkRole(["ADMIN", "ENCARGADO", "CHOFER"]), maintenanceController.createMaintenance);

// Actualización de estado general (admin/encargado) y técnico
router.put("/:id", authenticate, checkRole(["ADMIN", "ENCARGADO", "TECNICO"]), maintenanceController.updateMaintenanceStatus);

// Técnico actualiza su propio trabajo (EN_PROCESO o COMPLETADO)
router.put("/:id/my-status", authenticate, checkRole(["TECNICO"]), maintenanceController.updateMyJobStatus);

// Encargado cierra/aprueba el mantenimiento (COMPLETADO → CERRADO)
router.put("/:id/close", authenticate, checkRole(["ENCARGADO", "ADMIN"]), maintenanceController.closeMaintenance);

// Materiales usados en un mantenimiento
router.get("/:id/materials", authenticate, getMaterials);
router.post("/:id/materials", authenticate, checkRole(["ADMIN", "ENCARGADO"]), addMaterial);
router.delete("/:id/materials/:detalleId", authenticate, checkRole(["ADMIN", "ENCARGADO"]), removeMaterial);

module.exports = router;
