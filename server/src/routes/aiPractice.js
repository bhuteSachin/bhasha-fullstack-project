import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

// Supported languages with their names
const LANGUAGES = {
    en: 'English',
    hi: 'Hindi',
    mr: 'Marathi',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
    ar: 'Arabic',
    pt: 'Portuguese',
    ru: 'Russian',
    it: 'Italian'
};

// Chat with AI - POST /api/ai-practice/chat
router.post('/chat', verifyToken, requirePremium, async (req, res) => {
    try {
        const { message, language, conversationHistory } = req.body;

        if (!message || !language) {
            return res.status(400).json({ detail: 'Message and language are required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ detail: 'AI service not configured' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const languageName = LANGUAGES[language] || 'English';

        // Build conversation context from history
        let contextPrompt = '';
        if (conversationHistory && conversationHistory.length > 0) {
            const recentHistory = conversationHistory.slice(-6); // Last 6 messages for context
            contextPrompt = recentHistory.map(msg =>
                `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}`
            ).join('\n');
        }

        const systemPrompt = `You are a friendly and patient language tutor helping someone practice ${languageName}. 

IMPORTANT RULES:
1. ALWAYS respond in ${languageName} language only
2. Keep responses conversational and natural (2-4 sentences)
3. If the student makes grammar/spelling mistakes, gently correct them
4. Ask follow-up questions to keep the conversation going
5. Be encouraging and supportive
6. Adjust your vocabulary complexity based on student's level
7. If asked about something in a different language, still respond in ${languageName}

${contextPrompt ? `Previous conversation:\n${contextPrompt}\n\n` : ''}Student says: "${message}"

Respond naturally as a tutor, in ${languageName}:`;

        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        const aiMessage = response.text().trim();

        res.json({
            message: aiMessage,
            language: language,
            languageName: languageName
        });

    } catch (error) {
        console.error('AI Practice chat error:', error);
        res.status(500).json({ detail: 'Failed to get AI response' });
    }
});

// Get supported languages
router.get('/languages', verifyToken, (req, res) => {
    const languageList = Object.entries(LANGUAGES).map(([code, name]) => ({
        code,
        name
    }));
    res.json(languageList);
});

export default router;
