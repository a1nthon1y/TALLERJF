const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const authenticate = require("../middlewares/auth.middleware");
const checkRole = require("../middlewares/role.middleware");

// Solo ADMIN puede gestionar usuarios
router.get("/suggest-username", authenticate, checkRole(["ADMIN"]), userController.suggestUsername);
router.get("/", authenticate, checkRole(["ADMIN"]), userController.getUsers);
router.post("/", authenticate, checkRole(["ADMIN"]), userController.createUser);
router.put("/:id", authenticate, checkRole(["ADMIN"]), userController.updateUser);
router.put("/:id/status", authenticate, checkRole(["ADMIN"]), userController.toggleUserStatus);

module.exports = router;
