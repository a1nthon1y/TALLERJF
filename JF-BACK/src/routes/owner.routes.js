const express = require("express");
const router = express.Router();
const ownerController = require("../controllers/owner.controller");
const authenticate = require("../middlewares/auth.middleware");
const checkRole = require("../middlewares/role.middleware");

// Perfil propio del dueño autenticado (debe ir ANTES de /:id)
router.get("/me", authenticate, checkRole(["OWNER"]), ownerController.getMyProfile);

// Solo ADMIN y ENCARGADO gestionan dueños
router.get("/", authenticate, checkRole(["ADMIN", "ENCARGADO"]), ownerController.getAllOwners);
router.get("/:id", authenticate, checkRole(["ADMIN", "ENCARGADO"]), ownerController.getOwnerById);
router.post("/", authenticate, checkRole(["ADMIN"]), ownerController.createOwner);
router.put("/:id", authenticate, checkRole(["ADMIN"]), ownerController.updateOwner);
router.delete("/:id", authenticate, checkRole(["ADMIN"]), ownerController.deleteOwner);

module.exports = router;
