/* eslint-disable */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (email) {
    console.log(`Updating ${email} to ADMIN...`);
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
    });
    console.log(`Successfully elevated ${user.email} to ADMIN.`);
  } else {
    console.log('No email provided. Updating ALL users to ADMIN...');
    const result = await prisma.user.updateMany({
      data: { role: 'ADMIN' },
    });
    console.log(`Successfully elevated ${result.count} users to ADMIN.`);
  }
}

main()
  .catch((e) => {
    if (e.code === 'P2025') {
      console.error('User not found.');
    } else {
      console.error('Error updating user roles:', e.message);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
