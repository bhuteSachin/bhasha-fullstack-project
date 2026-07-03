import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import translateRoutes from './routes/translate.js';
import historyRoutes from './routes/history.js';
import paymentRoutes from './routes/payment.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/users.js';
import chatRoutes from './routes/chat.js';
import aiPracticeRoutes from './routes/aiPractice.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeSocket } from './socket/chat.js';
import client from 'prom-client';

const app = express();
const PORT = process.env.PORT || 5000;

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        process.env.CLIENT_URL
    ].filter(Boolean),
    credentials: true
}));
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});
app.use(express.json());

// ==============================
// Prometheus Metrics Setup
// ==============================
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [register],
});

const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [register],
});

const activeConnections = new client.Gauge({
    name: 'socketio_active_connections',
    help: 'Number of active Socket.IO connections',
    registers: [register],
});

// Metrics middleware
app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const duration = Number(process.hrtime.bigint() - start) / 1e9;
        const route = req.route ? req.route.path : req.path;
        httpRequestDuration.observe({ method: req.method, route, status: res.statusCode }, duration);
        httpRequestsTotal.inc({ method: req.method, route, status: res.statusCode });
    });
    next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Export activeConnections gauge for socket.js to use
export { activeConnections };

// Routes
app.use('/auth', authRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai-practice', aiPracticeRoutes);
app.use('/', translateRoutes);

// Health Check Route
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Keep-alive mechanism for Render free tier
const SERVER_URL = process.env.SERVER_URL;
if (SERVER_URL) {
    // Ping every 9 minutes (9 * 60 * 1000 = 540000 ms)
    setInterval(() => {
        fetch(`${SERVER_URL}/health`)
            .then(res => {
                if (res.ok) console.log(`[${new Date().toISOString()}] Keep-alive ping successful`);
                else console.log(`[${new Date().toISOString()}] Keep-alive ping failed: ${res.statusText}`);
            })
            .catch(err => console.error(`[${new Date().toISOString()}] Keep-alive ping error:`, err.message));
    }, 540000);
}

// Serve uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve static files from the React app
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
    cors: {
        origin: [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
            process.env.CLIENT_URL
        ].filter(Boolean),
        methods: ["GET", "POST"]
    }
});

initializeSocket(io);

// ==============================
// Startup Diagnostics
// ==============================
console.log('=== Server Startup Diagnostics ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI defined:', !!process.env.MONGODB_URI);
console.log('MONGODB_URI length:', (process.env.MONGODB_URI || '').length);
console.log('MONGODB_URI starts with:', (process.env.MONGODB_URI || '').substring(0, 20));
console.log('==================================');

// Strip leading/trailing quotes that might be injected by Kubernetes secrets
const MONGODB_URI = (process.env.MONGODB_URI || '').replace(/^["']|["']$/g, '');

if (!MONGODB_URI || !MONGODB_URI.startsWith('mongodb')) {
    console.error('FATAL: MONGODB_URI is missing or invalid. Value starts with:', MONGODB_URI.substring(0, 20));
    console.error('Available env vars:', Object.keys(process.env).filter(k => !k.startsWith('npm_')).sort().join(', '));
    process.exit(1);
}

// Start HTTP server first so Kubernetes probes pass during DB connection
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
    tlsAllowInvalidCertificates: true,
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
})
    .then(() => {
        console.log('Connected to MongoDB Atlas');
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    });
