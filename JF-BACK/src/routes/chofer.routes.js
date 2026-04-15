const express = require("express");
const router = express.Router();
const controller = require("../controllers/chofer.controller");
const authenticate = require("../middlewares/auth.middleware");
const checkRole = require("../middlewares/role.middleware");

// Rutas del chofer autenticado (deben ir ANTES de /:id para evitar conflictos)
router.get("/mi-unidad", authenticate, checkRole(["CHOFER"]), controller.getMiUnidad);
router.post("/llegada", authenticate, checkRole(["CHOFER"]), controller.crearReporteLlegada);

// CRUD de choferes — solo ADMIN o ENCARGADO
router.post("/", authenticate, checkRole(["ADMIN", "ENCARGADO"]), controller.createDriver);
router.get("/", authenticate, checkRole(["ADMIN", "ENCARGADO"]), controller.getAllDrivers);
router.get("/:id", authenticate, checkRole(["ADMIN", "ENCARGADO"]), controller.getDriverById);
router.put("/:id", authenticate, checkRole(["ADMIN", "ENCARGADO"]), controller.updateDriver);
router.delete("/:id", authenticate, checkRole(["ADMIN", "ENCARGADO"]), controller.deleteDriver);

module.exports = router;
