const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const MONTH_COUNTS = [50, 44, 35, 33, 47, 46]; // Jan-Jun
const YEAR = 2026;

(async () => {
  const docs = await p.document.findMany({
    where: { type: 'sertifikat' },
    orderBy: { id: 'asc' },
    select: { id: true, documentDate: true },
  });

  // Fix docs that are null or were backfilled to June 2026 (from createdAt)
  const toFix = docs.filter(d => {
    if (!d.documentDate) return true;
    const m = d.documentDate.getMonth();
    const y = d.documentDate.getFullYear();
    return y === 2026 && m === 5; // backfilled = June
  });

  // Use ID ordering to assign approximate month
  let monthIdx = 0;
  let countInMonth = 0;

  for (const d of toFix) {
    const month = monthIdx + 1; // 1-6
    const day = Math.min((countInMonth % 28) + 1, 28);
    const date = new Date(YEAR, monthIdx, day, 10, 0, 0);
    await p.document.update({ where: { id: d.id }, data: { documentDate: date } });
    countInMonth++;
    if (countInMonth >= MONTH_COUNTS[monthIdx] && monthIdx < MONTH_COUNTS.length - 1) {
      monthIdx++;
      countInMonth = 0;
    }
  }

  console.log(`Fixed ${toFix.length} sertifikat`);
  await p.$disconnect();
})();
