const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/rutas.controller");
const authenticate = require("../middlewares/auth.middleware");
const checkRole = require("../middlewares/role.middleware");

const adminOnly = [authenticate, checkRole(["ADMIN", "ENCARGADO"])];

router.get("/",      ...adminOnly, ctrl.getAll);
router.post("/",     ...adminOnly, ctrl.create);
router.put("/:id",   ...adminOnly, ctrl.update);
router.delete("/:id",...adminOnly, ctrl.remove);

module.exports = router;
