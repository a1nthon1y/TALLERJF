const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/auth.middleware");
const partsController = require("../controllers/part.controller");

// 🔹 Registrar una parte para una unidad
router.post("/", authenticate, partsController.createPart);

// 🔹 Obtener todas las partes registradas
router.get("/", authenticate, partsController.getAllParts);

// 🔹 Obtener las partes de una unidad específica
router.get("/:unidadId", authenticate, partsController.getPartsByUnit);

module.exports = router;
