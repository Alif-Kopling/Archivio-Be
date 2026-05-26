const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const auth = require("../middlewares/auth.middleware");

router.use(auth);

router.get("/", notificationController.getAll);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/:id/read", notificationController.markRead);
router.post("/mark-all-read", notificationController.markAllRead);
router.delete("/", notificationController.deleteAll);

module.exports = router;
