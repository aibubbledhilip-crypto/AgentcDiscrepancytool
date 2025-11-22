import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dataqualitychecker.com' },
    update: {},
    create: {
      email: 'admin@dataqualitychecker.com',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`Admin user created: ${admin.email}`);

  // Create demo user
  const userPassword = await bcrypt.hash('User@123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@dataqualitychecker.com' },
    update: {},
    create: {
      email: 'user@dataqualitychecker.com',
      password: userPassword,
      firstName: 'Demo',
      lastName: 'User',
      role: 'USER',
      isActive: true,
    },
  });
  console.log(`Demo user created: ${user.email}`);

  console.log('Seeding completed successfully!');
  console.log('\nDefault credentials:');
  console.log('Admin: admin@dataqualitychecker.com / Admin@123');
  console.log('User: user@dataqualitychecker.com / User@123');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
