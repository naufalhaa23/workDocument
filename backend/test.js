const prisma = require('./src/config/database');

async function main() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const docs = await prisma.document.findMany({
    select: { document_number: true, status: true, deadline_sn: true, assignees: true }
  });

  for (const doc of docs) {
    if (doc.deadline_sn) {
      const docDeadline = new Date(doc.deadline_sn);
      docDeadline.setHours(0, 0, 0, 0);
      const diffTime = docDeadline.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      console.log(`Doc ${doc.document_number}: status=${doc.status}, diffDays=${diffDays}, assignees=${doc.assignees.length}`);
    }
  }
}

main().finally(() => process.exit(0));
