const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: 'http://localhost:5173',
      credentials: true,
    },
  });

  // Auth middleware for Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const isPublic = socket.handshake.query?.public === 'true';

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_ACC_SECRET);
        socket.user = decoded;
        return next();
      } catch (err) {
        return next(new Error('Invalid token'));
      }
    } else if (isPublic) {
      socket.isPublic = true;
      return next();
    }
    
    return next(new Error('Authentication required'));
  });

  io.on('connection', (socket) => {
    if (socket.isPublic) {
      console.log(`🔌 Public user connected for Kanban Live Updates`);
      socket.join('public_board');
      
      socket.on('disconnect', () => {
        console.log(`❌ Public user disconnected`);
      });
      return;
    }

    const { user } = socket;
    console.log(`🔌 User connected: ${user.username} (${user.role})`);

    // Auto-join rooms based on user
    socket.join(`user:${user.id}`);
    socket.join(`role:${user.role}`);

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${user.username}`);
    });
  });

  return io;
}

function getIO() {
  return io || null;
}

module.exports = { initSocket, getIO };
