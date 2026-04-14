const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/auth.middleware");
const alertsController = require("../controllers/alert.controller");

// 🔹 Obtener todas las alertas activas (requiere autenticación)
router.get("/", authenticate, alertsController.getActiveAlerts);

// 🔹 Resolver una alerta (requiere autenticación)
router.put("/:id", authenticate, alertsController.resolveAlert);

module.exports = router;

