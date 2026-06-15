require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const total = await p.document.count();
  const local = await p.document.count({ where: { storageType: "local" } });
  const gdrive = await p.document.count({ where: { storageType: "gdrive" } });
  console.log("Total:", total, "| Local:", local, "| GDrive:", gdrive);
})().finally(() => p.$disconnect());
