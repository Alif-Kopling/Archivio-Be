const notificationService = require("../services/notification.service");

exports.getAll = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const notifications = await notificationService.getNotifications(userId);
    const unreadCount = await notificationService.getUnreadCount(userId);
    res.json({ data: notifications, unreadCount });
  } catch (err) {
    console.error("Notification Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const count = await notificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (err) {
    console.error("Notification Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;
    await notificationService.markAsRead(id, userId);
    res.json({ message: "Notification marked as read." });
  } catch (err) {
    console.error("Notification Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const { id: userId } = req.user;
    await notificationService.markAllAsRead(userId);
    res.json({ message: "All notifications marked as read." });
  } catch (err) {
    console.error("Notification Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteAll = async (req, res) => {
  try {
    const { id: userId } = req.user;
    await notificationService.deleteAll(userId);
    res.json({ message: "All notifications cleared." });
  } catch (err) {
    console.error("Notification Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
