const prisma = require("../config/db");

const createNotifications = async ({ documentId, title, approverIds, type }) => {
  if (!approverIds || approverIds.length === 0) return { count: 0 };

  const typeLabel = { masuk: "Incoming Mail", keluar: "Outgoing Mail", sertifikat: "Certificate" };
  const label = typeLabel[type] || "Document";

  const notifications = approverIds.map((userId) => ({
    userId: Number(userId),
    documentId,
    message: `Ada file "${title}" (${label}) yang harus anda approve`,
  }));

  await prisma.notification.createMany({ data: notifications });

  return { count: notifications.length };
};

const getNotifications = async (userId) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
};

const getUnreadCount = async (userId) => {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
};

const markAsRead = async (id, userId) => {
  return prisma.notification.updateMany({
    where: { id: Number(id), userId },
    data: { isRead: true },
  });
};

const markAllAsRead = async (userId) => {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};

const deleteAll = async (userId) => {
  return prisma.notification.deleteMany({
    where: { userId },
  });
};

module.exports = {
  createNotifications,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteAll,
};
