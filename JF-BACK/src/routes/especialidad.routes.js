const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/especialidad.controller");
const authenticate = require("../middlewares/auth.middleware");
const checkRole = require("../middlewares/role.middleware");

router.get("/", authenticate, ctrl.getAll);
router.post("/", authenticate, checkRole(["ADMIN"]), ctrl.create);
router.put("/:id", authenticate, checkRole(["ADMIN"]), ctrl.update);
router.patch("/:id/status", authenticate, checkRole(["ADMIN"]), ctrl.toggleStatus);
router.delete("/:id", authenticate, checkRole(["ADMIN"]), ctrl.remove);

module.exports = router;
