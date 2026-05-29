const express = require("express");
const router = express.Router();
const auditController = require("../controllers/audit.controller");
const auth = require("../middlewares/auth.middleware");
const { role } = require("../middlewares/role.middleware");

router.use(auth);
router.use(role(["admin"]));

router.get("/", auditController.getAll);
router.delete("/", auditController.clearAll);

module.exports = router;
