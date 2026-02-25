const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { profileImage: { not: null } },
        take: 2,
        select: { profileImage: true, id: true, name: true }
    });
    console.log(users);
    await prisma.$disconnect();
}

main().catch(console.error);
