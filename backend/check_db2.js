const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findUnique({
        where: { id: '4cb61e30-fce6-4960-83be-319abde7390a' }
    });
    console.log(users?.profileImage);
    await prisma.$disconnect();
}

main().catch(console.error);
