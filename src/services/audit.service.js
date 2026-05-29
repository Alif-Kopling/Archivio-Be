const prisma = require("../config/db");

const log = async ({ userId, action, documentId, detail }) => {
  return prisma.auditLog.create({
    data: {
      userId: Number(userId),
      action,
      documentId: documentId ? Number(documentId) : null,
      detail: detail || null,
    },
  });
};

const cleanOld = async () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const result = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  if (result.count > 0) {
    console.log(`[Audit] Cleaned ${result.count} log(s) older than 30 days`);
  }
  return result.count;
};

const deleteAll = async () => {
  const result = await prisma.auditLog.deleteMany();
  console.log(`[Audit] Deleted all ${result.count} log(s)`);
  return result.count;
};

module.exports = { log, cleanOld, deleteAll };
