const express = require("express");
const router = express.Router();
const ownerController = require("../controllers/owner.controller");
const authenticate = require("../middlewares/auth.middleware"); // Protegemos las rutas

router.post("/", authenticate, ownerController.createOwner);
router.get("/", authenticate, ownerController.getAllOwners);
router.get("/:id", authenticate, ownerController.getOwnerById);
router.put("/:id", authenticate, ownerController.updateOwner);
router.delete("/:id", authenticate, ownerController.deleteOwner);

module.exports = router;
