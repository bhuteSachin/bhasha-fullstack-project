import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Set Username
router.post('/username', authenticateToken, async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ detail: 'Username is required' });

        // Check availability
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ detail: 'Username already taken' });

        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ detail: 'User not found' });

        user.username = username;
        await user.save();

        res.json({ message: 'Username set successfully', username });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// Search Users
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        const users = await User.find({
            username: { $regex: q, $options: 'i' },
            _id: { $ne: req.user.userId } // Exclude self
        }).select('username email _id');

        res.json(users);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// Send Friend Request
router.post('/request/:id', authenticateToken, async (req, res) => {
    try {
        const targetId = req.params.id;
        const requesterId = req.user.userId;

        if (targetId === requesterId) return res.status(400).json({ detail: "Can't add yourself" });

        const targetUser = await User.findById(targetId);
        if (!targetUser) return res.status(404).json({ detail: 'User not found' });

        // Check if already friends
        if (targetUser.friends.includes(requesterId)) {
            return res.status(400).json({ detail: 'Already friends' });
        }

        // Check if request already sent
        const existingRequest = targetUser.friendRequests.find(r => r.from.toString() === requesterId);
        if (existingRequest) {
            return res.status(400).json({ detail: 'Request already sent' });
        }

        targetUser.friendRequests.push({ from: requesterId });
        await targetUser.save();

        res.json({ message: 'Friend request sent' });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// Get Pending Requests
router.get('/requests', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).populate('friendRequests.from', 'username email');
        res.json(user.friendRequests);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// Accept Friend Request
router.post('/request/:id/accept', authenticateToken, async (req, res) => {
    try {
        const requesterId = req.params.id;
        const userId = req.user.userId;

        const user = await User.findById(userId);
        const requester = await User.findById(requesterId);

        if (!requester) return res.status(404).json({ detail: 'User not found' });

        // Remove request
        user.friendRequests = user.friendRequests.filter(r => r.from.toString() !== requesterId);

        // Add to friends list (both ways)
        if (!user.friends.includes(requesterId)) user.friends.push(requesterId);
        if (!requester.friends.includes(userId)) requester.friends.push(userId);

        await user.save();
        await requester.save();

        res.json({ message: 'Friend request accepted' });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// Reject Friend Request
router.post('/request/:id/reject', authenticateToken, async (req, res) => {
    try {
        const requesterId = req.params.id;
        const userId = req.user.userId;

        const user = await User.findById(userId);
        user.friendRequests = user.friendRequests.filter(r => r.from.toString() !== requesterId);
        await user.save();

        res.json({ message: 'Friend request rejected' });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// Get Friends List
router.get('/friends', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).populate('friends', 'username email');
        res.json(user.friends);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
