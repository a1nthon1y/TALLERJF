const express = require("express");
const router = express.Router();
const technicianController = require("../controllers/technician.controller");
const authenticate = require("../middlewares/auth.middleware");
const checkRole = require("../middlewares/role.middleware");

// Lectura disponible para ADMIN y ENCARGADO
router.get("/", authenticate, checkRole(["ADMIN", "ENCARGADO"]), technicianController.getTechnicians);

// Escritura solo ADMIN y ENCARGADO
router.post("/", authenticate, checkRole(["ADMIN", "ENCARGADO"]), technicianController.createTechnician);
router.put("/:id", authenticate, checkRole(["ADMIN", "ENCARGADO"]), technicianController.updateTechnician);
router.put("/:id/status", authenticate, checkRole(["ADMIN", "ENCARGADO"]), technicianController.toggleTechnicianStatus);

module.exports = router;
