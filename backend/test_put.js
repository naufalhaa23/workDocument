const prisma = require('./src/config/database');

async function checkUsers() {
    const users = await prisma.user.findMany({ select: { id: true, username: true } });
    console.log("Users:", users);

    const doc = await prisma.document.findFirst();
    if (doc) {
        try {
            await prisma.document.update({
                where: { id: doc.id },
                data: {
                    assignees: {
                        deleteMany: {},
                        create: [{ user_id: 2 }]
                    }
                }
            });
            console.log("Update assignees successful");
        } catch (err) {
            console.error("Update assignees failed:", err.message);
        }

        try {
            await prisma.document.update({
                where: { id: doc.id },
                data: { status: 'draft_sn', deadline_sn: undefined }
            });
            console.log("Update status with undefined deadline successful");
        } catch (err) {
            console.error("Update status failed with undefined:", err.message);
        }

        try {
            await prisma.document.update({
                where: { id: doc.id },
                data: { status: 'draft_sn', deadline_sn: null }
            });
            console.log("Update status with null deadline successful");
        } catch (err) {
            console.error("Update status failed with null:", err.message);
        }
    }
}

checkUsers().finally(() => prisma.$disconnect());
