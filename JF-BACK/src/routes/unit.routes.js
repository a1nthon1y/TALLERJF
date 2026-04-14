const express = require("express");
const router = express.Router();
const unitController = require("../controllers/unit.controller");
const authenticate = require("../middlewares/auth.middleware"); // Protegemos rutas

router.post("/", authenticate, unitController.createUnit);
router.get("/", authenticate, unitController.getAllUnits);
router.get("/:id", authenticate, unitController.getUnitById);
router.get("/owner/:duenoId", authenticate, unitController.getUnitsByOwner); // Nueva ruta
router.put("/:id", authenticate, unitController.updateUnit);
router.delete("/:id", authenticate, unitController.deleteUnit);

module.exports = router;
