const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const saltRounds = 12;

async function createSuperAdmin() {
  try {
    const superAdminData = {
      email: 'Jamia.official@khanqahsaifia.com',
      password: 'Khanqah$555', 
      name: 'Jamia Head Officer',
      phone: '+923217677062',
      role: 'SUPER_ADMIN'
    };

    console.log('Attempting to create super admin...');

    // Check if super admin already exists
    const existingSuperAdmin = await prisma.user.findFirst({
      where: {
        role: 'SUPER_ADMIN'
      }
    });

    if (existingSuperAdmin) {
      console.log('Super admin already exists:', existingSuperAdmin.email);
      return;
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: superAdminData.email
      }
    });

    if (existingUser) {
      console.log('User with this email already exists:', superAdminData.email);
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(superAdminData.password, saltRounds);

    // Create super admin
    const superAdmin = await prisma.user.create({
      data: {
        email: superAdminData.email,
        passwordHash,
        name: superAdminData.name,
        phone: superAdminData.phone,
        role: 'SUPER_ADMIN'
      }
    });

    console.log('✅ Super admin created successfully!');
    console.log('📧 Email:', superAdmin.email);
    console.log('🔑 Password:', superAdminData.password);
    console.log('👤 Name:', superAdmin.name);
    console.log('🆔 User ID:', superAdmin.id);
    console.log('\n⚠️  IMPORTANT: Change the default password immediately after first login!');

  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  createSuperAdmin();
}

module.exports = createSuperAdmin;