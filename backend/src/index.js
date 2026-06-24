require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./config/socket');
const { initDeadlineCron } = require('./cron/deadline.cron');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);

// Start Background Jobs (Cron)
initDeadlineCron();

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.io ready`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});
