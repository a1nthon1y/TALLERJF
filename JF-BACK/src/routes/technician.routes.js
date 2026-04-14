const express = require("express");
const router = express.Router();
const technicianController = require("../controllers/technician.controller");
const authenticate = require("../middlewares/auth.middleware");

// Obtener lista de técnicos
router.get("/", authenticate, technicianController.getTechnicians);

// Crear nuevo técnico
router.post("/", authenticate, technicianController.createTechnician);

// Editar técnico
router.put("/:id", authenticate, technicianController.updateTechnician);

// Activar o desactivar técnico
router.put("/:id/status", authenticate, technicianController.toggleTechnicianStatus);

module.exports = router;
