const express = require("express");
const router = express.Router();
const controller = require("../controllers/config.controller");
const authenticate = require("../middlewares/auth.middleware");
const checkRole = require("../middlewares/role.middleware");

// Sólo Encargados y Admins pueden administrar el catálogo de reglas predictivas
router.get("/", authenticate, checkRole(["ADMIN", "ENCARGADO"]), controller.getPartConfigs);
router.post("/", authenticate, checkRole(["ADMIN", "ENCARGADO"]), controller.createPartConfig);
router.put("/:id", authenticate, checkRole(["ADMIN", "ENCARGADO"]), controller.updatePartConfig);
router.delete("/:id", authenticate, checkRole(["ADMIN", "ENCARGADO"]), controller.deletePartConfig);

module.exports = router;
