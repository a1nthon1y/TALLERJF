const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const authenticate = require("../middlewares/auth.middleware");

// Obtener lista de usuarios (solo admin)
router.get("/", authenticate, userController.getUsers);

// Crear un usuario (solo admin)
router.post("/", authenticate, userController.createUser);

// Editar usuario (nombre, correo, rol)
router.put("/:id", authenticate, userController.updateUser);

// Activar o desactivar usuario
router.put("/:id/status", authenticate, userController.toggleUserStatus);

module.exports = router;
