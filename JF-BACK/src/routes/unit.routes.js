const express = require("express");
const router = express.Router();
const unitController = require("../controllers/unit.controller");
const authenticate = require("../middlewares/auth.middleware");
const checkRole = require("../middlewares/role.middleware");

// Lectura para cualquier autenticado (choferes necesitan ver su unidad)
router.get("/owner/:duenoId", authenticate, checkRole(["ADMIN", "ENCARGADO"]), unitController.getUnitsByOwner);
router.get("/", authenticate, unitController.getAllUnits);
router.get("/:id", authenticate, unitController.getUnitById);

// Escritura solo ADMIN y ENCARGADO
router.post("/", authenticate, checkRole(["ADMIN", "ENCARGADO"]), unitController.createUnit);
router.put("/:id", authenticate, checkRole(["ADMIN", "ENCARGADO"]), unitController.updateUnit);
router.delete("/:id", authenticate, checkRole(["ADMIN"]), unitController.deleteUnit);

module.exports = router;
