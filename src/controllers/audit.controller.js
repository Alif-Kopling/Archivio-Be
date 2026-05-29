const prisma = require("../config/db");
const auditService = require("../services/audit.service");

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: safeLimit,
        select: {
          id: true,
          userId: true,
          action: true,
          documentId: true,
          detail: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.count(),
    ]);

    const userIds = [...new Set(data.map((d) => d.userId))];
    const documentIds = [...new Set(data.filter((d) => d.documentId).map((d) => d.documentId))];

    const [users, docs] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      }),
      documentIds.length > 0
        ? prisma.document.findMany({
            where: { id: { in: documentIds } },
            select: { id: true, title: true },
          })
        : [],
    ]);

    const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
    const docMap = Object.fromEntries(docs.map((d) => [d.id, d.title]));

    const enriched = data.map((d) => ({
      ...d,
      userName: userMap[d.userId] || "Unknown",
      documentTitle: d.documentId ? docMap[d.documentId] || "Deleted" : null,
    }));

    res.json({
      data: enriched,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    });
  } catch (err) {
    console.error("Audit Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.clearAll = async (req, res) => {
  try {
    const count = await auditService.deleteAll();
    res.json({ message: `Deleted ${count} audit log(s).`, count });
  } catch (err) {
    console.error("Audit Clear Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
