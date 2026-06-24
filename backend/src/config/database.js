require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

// Parse DATABASE_URL for Prisma 7 adapter
// Format: mysql://USER:PASSWORD@HOST:PORT/DATABASE
const dbUrl = new URL(process.env.DATABASE_URL);

const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: Number(dbUrl.port) || 3306,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1), // remove leading "/"
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

module.exports = prisma;
