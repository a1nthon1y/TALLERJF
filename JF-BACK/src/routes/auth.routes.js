const express = require("express");
const { login } = require("../controllers/auth.controller");
const router = express.Router();

// La creación de usuarios la realiza el ADMIN vía POST /api/users
// (con el formulario de Usuarios). No exponemos /register público.
router.post("/login", login);

module.exports = router;
