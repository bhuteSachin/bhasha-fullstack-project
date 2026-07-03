import express from 'express';
import User from '../models/User.js';
import SystemSetting from '../models/SystemSetting.js';

const router = express.Router();

// --- Settings Management ---

// Get Public Settings (Pricing)
router.get('/settings/pricing', async (req, res) => {
    try {
        const settings = await SystemSetting.find({
            key: { $in: ['monthly_price', 'yearly_price', 'monthly_discount', 'yearly_discount'] }
        });

        // Convert array to object
        const pricing = {
            monthly_price: 199,
            yearly_price: 799,
            monthly_discount: 0,
            yearly_discount: 0
        };

        settings.forEach(s => {
            pricing[s.key] = s.value;
        });

        res.json(pricing);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// Update Settings (Admin Only)
router.post('/settings', async (req, res) => {
    try {
        const { settings } = req.body; // { key: value, key2: value2 }

        for (const [key, value] of Object.entries(settings)) {
            await SystemSetting.findOneAndUpdate(
                { key },
                { key, value },
                { upsert: true, new: true }
            );
        }

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// --- User Management ---

// Get All Users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// Ban/Unban User
router.post('/users/:id/ban', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ detail: 'User not found' });

        user.isBanned = !user.isBanned;
        await user.save();

        res.json({ message: `User ${user.isBanned ? 'banned' : 'unbanned'} successfully`, isBanned: user.isBanned });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// Delete User
router.delete('/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
