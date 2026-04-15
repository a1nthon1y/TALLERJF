const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/auth.middleware");
const checkRole = require("../middlewares/role.middleware");
const partsController = require("../controllers/part.controller");

// Lectura para cualquier autenticado
router.get("/", authenticate, partsController.getAllParts);
router.get("/:unidadId", authenticate, partsController.getPartsByUnit);

// Escritura solo ADMIN y ENCARGADO
router.post("/", authenticate, checkRole(["ADMIN", "ENCARGADO"]), partsController.createPart);

module.exports = router;
