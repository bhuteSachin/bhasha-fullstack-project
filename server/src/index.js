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

// Database Connection
mongoose.connect(process.env.MONGODB_URI, {
    tlsAllowInvalidCertificates: true
})
    .then(() => {
        console.log('Connected to MongoDB Atlas');
        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => console.error('MongoDB connection error:', err));
