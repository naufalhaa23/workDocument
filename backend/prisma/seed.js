require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const bcrypt = require('bcryptjs');

const dbUrl = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: dbUrl.hostname, port: Number(dbUrl.port) || 3306,
  user: dbUrl.username, password: dbUrl.password,
  database: dbUrl.pathname.slice(1), connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const adminHash = await bcrypt.hash('admin123', 10);
  const superHash = await bcrypt.hash('super123', 10);
  const teknisiHash = await bcrypt.hash('teknisi123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', email: 'admin@company.com', password_hash: adminHash, role: 'admin' },
  });

  const superadmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: { username: 'superadmin', email: 'superadmin@company.com', password_hash: superHash, role: 'superadmin' },
  });

  const ahmad = await prisma.user.upsert({
    where: { username: 'ahmad' },
    update: {},
    create: { username: 'ahmad', email: 'ahmad@company.com', password_hash: teknisiHash, role: 'teknisi' },
  });

  const budi = await prisma.user.upsert({
    where: { username: 'budi' },
    update: {},
    create: { username: 'budi', email: 'budi@company.com', password_hash: teknisiHash, role: 'teknisi' },
  });

  console.log(`✅ Users: admin, superadmin, ahmad, budi`);

  // Create inventory items
  const items = [
    { item_code: 'EL-001', name: 'Kabel NYM 2x1.5', category: 'Elektrikal', unit: 'meter', stock_qty: 150, min_stock: 50 },
    { item_code: 'MC-001', name: 'Bearing 6205 ZZ', category: 'Mekanikal', unit: 'pcs', stock_qty: 12, min_stock: 10 },
    { item_code: 'EL-002', name: 'MCB 16A 1 Phase', category: 'Elektrikal', unit: 'pcs', stock_qty: 8, min_stock: 5 },
    { item_code: 'MC-002', name: 'V-Belt A68', category: 'Mekanikal', unit: 'pcs', stock_qty: 3, min_stock: 5 },
    { item_code: 'PB-001', name: 'Pipa PVC 3/4"', category: 'Plumbing', unit: 'batang', stock_qty: 20, min_stock: 10 },
    { item_code: 'MC-003', name: 'Oli Mesin SAE 40', category: 'Mekanikal', unit: 'liter', stock_qty: 45, min_stock: 20 },
    { item_code: 'SF-001', name: 'Sarung Tangan Kulit', category: 'Safety', unit: 'pasang', stock_qty: 25, min_stock: 15 },
  ];

  for (const item of items) {
    await prisma.inventoryItem.upsert({
      where: { item_code: item.item_code },
      update: {},
      create: item,
    });
  }
  console.log(`✅ Inventory: ${items.length} items`);

  // Create sample documents
  const docs = [
    { document_type: 'SP', document_number: 'SP-2026-0125', document_date: new Date('2026-04-17'), title: 'Laporan Inspeksi Mesin CNC #14', assigned_to: ahmad.id, created_by: admin.id },
    { document_type: 'SPMK', document_number: 'SPMK-26-0042', document_date: new Date('2026-04-16'), title: 'Checklist Mesin Milling #08', status: 'draft_sn', assigned_to: budi.id, created_by: admin.id, deadline_sn: new Date('2026-04-23') },
    { document_type: 'SP', document_number: 'SP-2026-0120', document_date: new Date('2026-04-15'), title: 'Report Inspeksi Bearing #23', status: 'assigned', assigned_to: ahmad.id, created_by: admin.id },
    { document_type: 'SPMK', document_number: 'SPMK-26-0039', document_date: new Date('2026-04-12'), title: 'Survey Lapangan #05', assigned_to: ahmad.id, created_by: admin.id },
    { document_type: 'SP', document_number: 'SP-2026-0115', document_date: new Date('2026-04-10'), title: 'Maintenance Mesin #17', status: 'menunggu_izin', assigned_to: budi.id, created_by: admin.id },
  ];

  for (const doc of docs) {
    const existing = await prisma.document.findUnique({ where: { document_number: doc.document_number } });
    if (!existing) {
      await prisma.document.create({ data: doc });
    }
  }
  console.log(`✅ Documents: ${docs.length} samples`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
