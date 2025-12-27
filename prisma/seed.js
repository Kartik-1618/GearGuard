const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create sample teams
  const maintenanceTeam = await prisma.team.create({
    data: {
      name: 'Maintenance Team A',
    },
  });

  const facilitiesTeam = await prisma.team.create({
    data: {
      name: 'Facilities Team B',
    },
  });

  // Create sample admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@gearguard.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  // Create sample manager
  const managerUser = await prisma.user.create({
    data: {
      name: 'John Manager',
      email: 'manager@gearguard.com',
      password: await bcrypt.hash('manager123', 12),
      role: 'MANAGER',
      teamId: maintenanceTeam.id,
    },
  });

  // Create sample technician
  const technicianUser = await prisma.user.create({
    data: {
      name: 'Jane Technician',
      email: 'technician@gearguard.com',
      password: await bcrypt.hash('tech123', 12),
      role: 'TECHNICIAN',
      teamId: maintenanceTeam.id,
    },
  });

  console.log('Database seeding completed successfully!');
  console.log('Created users:', { adminUser: adminUser.email, managerUser: managerUser.email, technicianUser: technicianUser.email });
  console.log('Created teams:', { maintenanceTeam: maintenanceTeam.name, facilitiesTeam: facilitiesTeam.name });
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });