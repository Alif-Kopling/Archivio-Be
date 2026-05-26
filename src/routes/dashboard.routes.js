const express = require("express");

const router = express.Router();

const dashboardController = require("../controllers/dashboard.controller");
const auth = require("../middlewares/auth.middleware");
const { role } = require("../middlewares/role.middleware");

router.use(auth);
router.use(role(["admin", "staff"]));

router.get("/", dashboardController.getOverview);
router.post("/bulk-approve", dashboardController.bulkApprove);
router.post("/bulk-reject", dashboardController.bulkReject);

module.exports = router;
