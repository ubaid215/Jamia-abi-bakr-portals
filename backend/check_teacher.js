const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const teacher = await prisma.teacher.findFirst({
        where: { userId: 'a25ad391-ddb8-4202-9271-f2513622e64f' },
        select: { id: true, userId: true }
    });
    console.log('Teacher details:', teacher);

    const user = await prisma.user.findUnique({
        where: { id: 'a25ad391-ddb8-4202-9271-f2513622e64f' }
    });
    console.log('User details:', user ? 'Found' : 'Not found');

    await prisma.$disconnect();
}

main().catch(console.error);
