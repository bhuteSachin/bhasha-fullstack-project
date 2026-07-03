import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import User from '../models/User.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.get('/', (req, res) => {
    res.json({ message: 'Regional Language Translator API is running' });
});

router.get('/languages', (req, res) => {
    res.json({
        supported_languages: [
            { code: 'en', name: 'English' },
            { code: 'hi', name: 'Hindi' },
            { code: 'mr', name: 'Marathi' }
        ],
        dialects: [
            'Standard',
            'Formal',
            'Informal',
            'Rural (Varhadi - Marathi)',
            'Urban (Mumbaiya - Hindi/Marathi)',
            'Pure/Shuddh'
        ]
    });
});

router.post('/translate', async (req, res) => {
    try {
        const { text, source_lang, target_lang, dialect = 'Standard', userId, email } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.json({
                translated_text: `[MOCK] Translated '${text}' to ${target_lang} (${dialect})`,
                note: 'API Key missing. Please configure GEMINI_API_KEY.'
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
    Act as a professional translator.
    Translate the following text from ${source_lang} to ${target_lang}.
    
    Important: Adapt the translation to the following dialect/style: ${dialect}.
    
    Text: "${text}"
    
    Output ONLY the translated text, nothing else.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const translatedText = response.text().trim();

        // Auto-save removed. History is now manually saved by the user.

        res.json({ translated_text: translatedText });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// Helper to file to GenerativePart
function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: fs.readFileSync(path).toString('base64'),
            mimeType
        },
    };
}

router.post('/translate/document', upload.single('file'), async (req, res) => {
    try {
        const { source_lang, target_lang, dialect = 'Standard', userId, email } = req.body;

        // Auth Check
        if (!userId && !email) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(401).json({ detail: 'Authentication required for document translation' });
        }

        const file = req.file;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) return res.status(500).json({ detail: 'API Key missing' });
        if (!file) return res.status(400).json({ detail: 'No file uploaded' });

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        let prompt = `
    Act as a professional translator.
    Translate the content of this file from ${source_lang} to ${target_lang}.
    
    Important: Adapt the translation to the following dialect/style: ${dialect}.
    
    Output ONLY the translated text, nothing else.
    `;

        let result;
        // Handle different file types
        // Note: Gemini API supports images and PDF directly.
        // For text files, we read content.

        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            const imagePart = fileToGenerativePart(file.path, file.mimetype);
            result = await model.generateContent([prompt, imagePart]);
        } else if (file.mimetype === 'text/plain') {
            const content = fs.readFileSync(file.path, 'utf-8');
            prompt += `\n\nText Content:\n${content.substring(0, 30000)}`; // Limit
            result = await model.generateContent(prompt);
        } else {
            fs.unlinkSync(file.path);
            return res.status(400).json({ detail: 'Unsupported file type' });
        }

        const response = await result.response;
        const translatedText = response.text().trim();

        // Auto-save removed. History is now manually saved by the user.

        // Cleanup
        fs.unlinkSync(file.path);

        res.json({ translated_text: translatedText });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ detail: error.message });
    }
});

export default router;
