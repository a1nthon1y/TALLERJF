const express = require("express");
const router = express.Router();
const materialController = require("../controllers/material.controller");
const authenticate = require("../middlewares/auth.middleware"); // si deseas protegerlo

// Obtener todos los materiales
router.get("/", authenticate, materialController.getMaterials);

// Crear nuevo material
router.post("/", authenticate, materialController.createMaterial);

// Editar material
router.put("/:id", authenticate, materialController.updateMaterial);

// Eliminar material
router.delete("/:id", authenticate, materialController.deleteMaterial);

module.exports = router;
