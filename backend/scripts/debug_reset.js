const prisma = require('../db/prismaClient');
const bcrypt = require('bcryptjs');
const authController = require('../controllers/authController');

// Mock helpers
const mockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.data = null;
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function runDebug() {
    try {
        console.log('--- STARTING DEBUG SESSION ---');
        console.log('Connected to DB?');
        await prisma.$queryRaw`SELECT 1`;
        console.log('YES');

        const email = `debug_${Date.now()}@example.com`;
        const password = 'Password@123';
        const newPassword = 'NewPassword@123';

        console.log(`\n1. Creating Test Teacher: ${email}`);
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                name: 'Debug Teacher',
                passwordHash,
                role: 'TEACHER',
                forcePasswordReset: true, // Simulate exact condition
                status: 'ACTIVE'
            }
        });
        console.log('User created:', user.id);
        console.log('Initial forcePasswordReset:', user.forcePasswordReset);

        // 2. Simulate Login
        console.log('\n2. Simulating First Login...');
        const loginReq = { body: { email, password } };
        const loginRes = mockRes();
        await authController.login(loginReq, loginRes);

        console.log('Login Status:', loginRes.statusCode);
        console.log('Login Response forcePasswordReset:', loginRes.data?.user?.forcePasswordReset);

        if (!loginRes.data?.user?.forcePasswordReset) {
            console.error('ERROR: Expected forcePasswordReset to be true!');
            return;
        }

        // 3. Simulate Change Password
        console.log('\n3. Simulating Change Password...');
        // Mock req.user populated by middleware
        const changeReq = {
            user: { id: user.id },
            body: { currentPassword: password, newPassword }
        };
        const changeRes = mockRes();
        await authController.changePassword(changeReq, changeRes);

        console.log('Change Status:', changeRes.statusCode);
        if (changeRes.statusCode !== 200) {
            console.error('Change Password Failed:', changeRes.data);
            return;
        }
        console.log('Change Message:', changeRes.data?.message);

        // 4. Verify DB State Directly
        console.log('\n4. Verifying DB State directly...');
        const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
        console.log('Updated forcePasswordReset in DB:', updatedUser.forcePasswordReset);

        if (updatedUser.forcePasswordReset === true) {
            console.error('CRITICAL ERROR: DB field was NOT updated to false!');
        } else {
            console.log('SUCCESS: DB field updated correctly.');
        }

        // 5. Simulate Second Login
        console.log('\n5. Simulating Second Login...');
        const loginReq2 = { body: { email, password: newPassword } };
        const loginRes2 = mockRes();
        await authController.login(loginReq2, loginRes2);

        console.log('Second Login Status:', loginRes2.statusCode);
        console.log('Second Login forcePasswordReset:', loginRes2.data?.user?.forcePasswordReset);

        if (loginRes2.data?.user?.forcePasswordReset === true) {
            console.error('CRITICAL ERROR: Login still returns forcePasswordReset: true!');
        } else {
            console.log('SUCCESS: Login returns correct status.');
        }

        // Cleanup
        await prisma.user.delete({ where: { id: user.id } });
        console.log('\n--- CLEANUP COMPLETE ---');

    } catch (e) {
        console.error('EXCEPTION:', e);
    } finally {
        await prisma.$disconnect();
    }
}

runDebug();
