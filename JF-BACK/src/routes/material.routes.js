const express = require("express");
const router = express.Router();
const materialController = require("../controllers/material.controller");
const authenticate = require("../middlewares/auth.middleware");
const checkRole = require("../middlewares/role.middleware");

// Lectura para cualquier autenticado (choferes pueden ver materiales)
router.get("/", authenticate, materialController.getMaterials);
router.get("/:id/usage", authenticate, materialController.getMaterialUsage);
router.patch("/:id/status", authenticate, checkRole(["ADMIN", "ENCARGADO"]), materialController.toggleMaterialStatus);

// Escritura solo ADMIN y ENCARGADO
router.post("/", authenticate, checkRole(["ADMIN", "ENCARGADO"]), materialController.createMaterial);
router.put("/:id", authenticate, checkRole(["ADMIN", "ENCARGADO"]), materialController.updateMaterial);
router.delete("/:id", authenticate, checkRole(["ADMIN"]), materialController.deleteMaterial);

module.exports = router;
