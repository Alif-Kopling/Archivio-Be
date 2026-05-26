const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.document.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, title: true, status: true, approverIds: true, approvedByIds: true, createdBy: true, createdAt: true }
  });
  console.log('Latest 5 documents:');
  docs.forEach(d => console.log(
    `  id=${d.id} "${d.title}" status=${d.status} approverIds=${d.approverIds} approvedByIds=${d.approvedByIds} createdBy=${d.createdBy}`
  ));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); });
