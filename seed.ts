import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding dummy users...');

  const dummyUsers = [
    {
      username: 'John Doe',
      phone: '+919876543210',
      about: 'Available for a chat!',
      isOnline: true,
    },
    {
      username: 'Jane Smith',
      phone: '+14155552671',
      about: 'Busy',
      isOnline: false,
    },
    {
      username: 'Alice Wonderland',
      phone: '+447700900077',
      about: 'Exploring the world',
      isOnline: true,
    }
  ];

  for (const user of dummyUsers) {
    await prisma.user.upsert({
      where: { phone: user.phone },
      update: {},
      create: user,
    });
    console.log(`Added user: ${user.username} (${user.phone})`);
  }

  console.log('Seeding finished.');
}

async function run() {
  try {
    await main();
  } catch (e) {
    console.error(e);
  }
  await prisma.$disconnect();
}
run();
