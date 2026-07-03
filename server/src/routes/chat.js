import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ detail: 'Access denied' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ detail: 'Invalid token' });
    }
};

// Middleware to require premium subscription
const requirePremium = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ detail: 'User not found' });
        }

        if (!user.isPremium) {
            return res.status(403).json({
                detail: 'Premium subscription required',
                code: 'PREMIUM_REQUIRED'
            });
        }

        next();
    } catch (err) {
        console.error('Premium check error:', err);
        res.status(500).json({ detail: 'Failed to verify premium status' });
    }
};

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

// Get chat history with a specific user
router.get('/history/:friendId', verifyToken, requirePremium, async (req, res) => {
    try {
        const { friendId } = req.params;
        const userId = req.user.userId;

        // Find conversation between these two users
        const conversation = await Conversation.findOne({
            participants: { $all: [userId, friendId] }
        });

        if (!conversation) {
            return res.json([]);
        }

        // Fetch messages
        const messages = await Message.find({ conversationId: conversation._id })
            .sort({ createdAt: 1 })
            .populate('sender', 'email username');

        // Format messages for frontend
        const formattedMessages = messages.map(msg => ({
            id: msg._id,
            text: msg.text,
            author: msg.sender.email,
            time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            lang: 'en', // Default, can be improved if we store lang
            type: msg.type,
            fileUrl: msg.fileUrl,
            fileName: msg.fileName,
            translations: msg.translations ? Object.fromEntries(msg.translations) : undefined
        }));

        res.json(formattedMessages);
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ detail: 'Failed to fetch chat history' });
    }
});

// Upload file
router.post('/upload', verifyToken, requirePremium, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ detail: 'No file uploaded' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
            fileUrl: fileUrl,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype
        });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ detail: 'File upload failed' });
    }
});

export default router;
