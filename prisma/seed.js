const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@archivio.com' },
    update: {},
    create: {
      email: 'admin@archivio.com',
      name: 'Administrator',
      password: password,
      role: 'admin',
    },
  });
  
  console.log('Admin user created:', admin.email, '- password: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
