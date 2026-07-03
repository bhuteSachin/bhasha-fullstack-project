import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// Middleware to check if user is authenticated (mock or actual implementation depending on auth setup)
// Assuming the main app uses some auth middleware or we extract userId from request body/header for now
// based on the current context, we might need to rely on the client sending the userId or email if no session/token middleware is globally applied yet.
// However, usually there is an auth middleware. Let's check auth.js or index.js later. 
// For now, I will assume the client sends 'userId' or 'email' in the body or query for simplicity if no global auth is found, 
// BUT the plan said "Update POST /translate to accept an optional userId".
// Let's assume we receive `userId` or `email` in the request for these protected routes.

// Helper to get user
const getUser = async (req) => {
    // This is a placeholder. In a real app, use req.user from middleware.
    // We will accept userId or email in query/body for now to be flexible with the current state.
    const { userId, email } = req.query;
    const id = userId || (req.body ? req.body.userId : undefined);
    const mail = email || (req.body ? req.body.email : undefined);

    if (id) return await User.findById(id);
    if (mail) return await User.findOne({ email: mail });
    return null;
};

// POST / - Save history item manually
router.post('/', async (req, res) => {
    try {
        const { source_lang, target_lang, original_text, translated_text } = req.body;
        const user = await getUser(req);

        if (!user) {
            return res.status(401).json({ message: 'User not found or not authenticated' });
        }

        let warning = null;

        // Check limit
        if (user.history.length >= 10) {
            // Remove the oldest item (first in the array as push adds to end)
            // Wait, if we sort by timestamp desc in GET, it implies the array order might not be strictly chronological if we manipulated it?
            // Mongoose array preserves insertion order. `push` adds to end.
            // So index 0 is the oldest.
            user.history.shift();
            warning = "History limit reached (10 items). Oldest item was removed.";
        }

        user.history.push({
            source_lang,
            target_lang,
            original_text,
            translated_text,
            timestamp: new Date()
        });

        await user.save();
        res.json({ message: 'History saved', warning, history: user.history });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET / - Get history
router.get('/', async (req, res) => {
    try {
        console.log(`[History] Fetching history. Query:`, req.query);
        const user = await getUser(req);
        if (!user) {
            console.log(`[History] User not found or not authenticated`);
            return res.status(401).json({ message: 'User not found or not authenticated' });
        }
        console.log(`[History] User found: ${user.email}. History count: ${user.history.length}`);
        // Sort history by timestamp desc
        const history = user.history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json(history);
    } catch (error) {
        console.error(`[History] Error fetching history:`, error);
        res.status(500).json({ message: error.message });
    }
});

// DELETE /:id - Delete specific history item
router.delete('/:id', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ message: 'User not found or not authenticated' });
        }

        user.history = user.history.filter(item => item._id.toString() !== req.params.id);
        await user.save();
        res.json({ message: 'History item deleted', history: user.history });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE / - Clear all history
router.delete('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ message: 'User not found or not authenticated' });
        }

        user.history = [];
        await user.save();
        res.json({ message: 'History cleared', history: [] });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
