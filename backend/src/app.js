const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ── Middleware ──
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow any localhost port, ngrok domains, local network IPs, and VPS
    if (
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.startsWith('http://192.168.') ||
      origin.includes('ngrok') ||
      origin === 'http://103.150.195.133'
    ) {
      return callback(null, true);
    }
    
    // Fallback block
    console.error('Blocked by CORS. Origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

// ── Routes ──
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/documents', require('./routes/document.routes'));
app.use('/api/uploads', require('./routes/upload.routes'));
app.use('/api/inventory', require('./routes/inventory.routes'));
app.use('/api/inventory-requests', require('./routes/inventoryRequest.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/activity-logs', require('./routes/activityLog.routes'));
app.use('/api/public', require('./routes/public.routes'));
app.use('/api/telegram', require('./routes/telegram.routes'));
app.use('/api/settings', require('./routes/settings.routes'));

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error Handler ──
app.use(errorHandler);

module.exports = app;
