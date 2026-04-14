const express = require("express");
const router = express.Router();
const controller = require("../controllers/chofer.controller");
const authenticate = require("../middlewares/auth.middleware");
const checkRole = require("../middlewares/role.middleware");

router.post("/", controller.createDriver);
router.get("/", controller.getAllDrivers);
router.get("/:id", controller.getDriverById);
router.put("/:id", controller.updateDriver);
router.delete("/:id", controller.deleteDriver);

// Registrar Reporte de Llegada / Actualización Predictiva (Requiere ser Chofer Logueado)
router.post("/llegada", authenticate, checkRole(["CHOFER"]), controller.crearReporteLlegada);

module.exports = router;
