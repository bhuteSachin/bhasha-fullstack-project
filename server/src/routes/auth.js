import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import crypto from 'crypto';

const router = express.Router();

// OTP Storage (In-memory for simplicity, use Redis in production)
// OTP Storage moved to Database

// Email Sending Helper (Brevo API)
const sendEmail = async (to, subject, text) => {
    if (!process.env.BREVO_API_KEY) {
        console.error("❌ BREVO_API_KEY is missing in environment variables.");
        throw new Error("Server configuration error: Missing Email API Key");
    }

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { email: process.env.MAIL_FROM || 'noreply@linguistai.com' },
                to: [{ email: to }],
                subject: subject,
                textContent: text
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Brevo API Error: ${JSON.stringify(errorData)}`);
        }
        console.log(`✅ Email sent successfully to ${to}`);
    } catch (error) {
        console.error("❌ Failed to send email:", error.message);
        throw error;
    }
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Step 1: Initiate Signup (Email -> OTP)
router.post('/signup-step1', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ detail: 'Email is required' });

        let user = await User.findOne({ email });

        if (user && user.isVerified) {
            return res.status(400).json({ detail: 'Email already registered. Please login.' });
        }

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        if (!user) {
            // Create temporary user
            user = new User({
                email,
                password: await bcrypt.hash(crypto.randomUUID(), 10), // Temporary random password
                otp,
                otpExpiry,
                isVerified: false
            });
        } else {
            // Update existing unverified user
            user.otp = otp;
            user.otpExpiry = otpExpiry;
        }

        await user.save();

        // Send OTP via Email
        try {
            await sendEmail(email, 'LinguistAI - Signup OTP', `Your OTP for signup is: ${otp}`);
        } catch (emailError) {
            console.error("Email sending failed:", emailError);
            return res.status(500).json({ detail: `Email Error: ${emailError.message}` });
        }

        res.json({ message: 'OTP sent to email' });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ detail: error.message });
    }
});

// Step 2: Verify OTP (OTP -> Setup Token)
router.post('/signup-step2', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ detail: 'User not found' });
        if (user.isVerified) return res.status(400).json({ detail: 'User already verified. Please login.' });

        if (user.otp !== otp) return res.status(400).json({ detail: 'Invalid OTP' });
        if (user.otpExpiry < Date.now()) return res.status(400).json({ detail: 'OTP expired' });

        // Generate a temporary token for the next step (valid for 15 mins)
        const setupToken = jwt.sign({ sub: user.email, userId: user._id, scope: 'setup' }, process.env.JWT_SECRET || 'secret', { expiresIn: '15m' });

        res.json({ message: 'OTP verified', setup_token: setupToken });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// Step 3: Complete Signup (Username + Password)
router.post('/signup-step3', async (req, res) => {
    try {
        const { setup_token, username, password } = req.body;

        if (!setup_token) return res.status(401).json({ detail: 'Missing setup token' });

        let decoded;
        try {
            decoded = jwt.verify(setup_token, process.env.JWT_SECRET || 'secret');
            if (decoded.scope !== 'setup') throw new Error('Invalid token scope');
        } catch (e) {
            return res.status(401).json({ detail: 'Invalid or expired setup token' });
        }

        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ detail: 'User not found' });

        // Check username availability
        const existingUsername = await User.findOne({ username });
        if (existingUsername) return res.status(400).json({ detail: 'Username already taken' });

        user.username = username;
        user.password = await bcrypt.hash(password, 10);
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;

        await user.save();

        // Generate final login token
        const token = jwt.sign({ sub: user.email, userId: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30m' });

        res.json({ message: 'Account created successfully', access_token: token, token_type: 'bearer' });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ detail: 'User not found' });

        if (user.otp !== otp) {
            return res.status(400).json({ detail: 'Invalid OTP' });
        }

        if (user.otpExpiry < Date.now()) {
            return res.status(400).json({ detail: 'OTP expired' });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        const token = jwt.sign({ sub: user.email, userId: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30m' });
        res.json({ message: 'Email verified successfully', access_token: token, token_type: 'bearer' });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const email = username || req.body.email;

        const user = await User.findOne({ email });
        if (!user) {
            console.log(`[LOGIN FAILED] User not found: ${email}`);
            return res.status(401).json({ detail: 'Incorrect email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`[LOGIN FAILED] Password mismatch for: ${email}`);
            return res.status(401).json({ detail: 'Incorrect email or password' });
        }

        if (user.isBanned) {
            return res.status(403).json({ detail: 'Your account has been banned. Contact support.' });
        }

        if (!user.isVerified) {
            // Optional: Allow login but restrict access, or force verification.
            // For now, let's just warn or allow. 
            // If we want to enforce verification:
            // return res.status(403).json({ detail: 'Please verify your email first' });
        }

        const token = jwt.sign({ sub: user.email, userId: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30m' });
        res.json({ access_token: token, token_type: 'bearer' });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ detail: 'User not found' });

        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
        await user.save();

        console.error(`[DEBUG] Reset OTP for ${email}: ${otp}`);

        try {
            await sendEmail(email, 'LinguistAI - Password Reset', `Your password reset code is: ${otp}`);
        } catch (emailError) {
            console.error("Email sending failed:", emailError);
            return res.status(500).json({ detail: 'Failed to send email' });
        }

        res.json({ message: 'OTP sent to email' });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ detail: 'User not found' });

        if (user.otp !== otp) {
            return res.status(400).json({ detail: 'Invalid OTP' });
        }

        if (user.otpExpiry < Date.now()) {
            return res.status(400).json({ detail: 'OTP expired' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ detail: 'Missing authorization header' });

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const user = await User.findOne({ email: decoded.sub });

        if (!user) return res.status(404).json({ detail: 'User not found' });

        res.json({
            id: user._id,
            email: user.email,
            is_verified: user.isVerified,
            isPremium: user.isPremium,
            subscriptionPlan: user.subscriptionPlan
        });
    } catch (error) {
        res.status(401).json({ detail: 'Invalid or expired token' });
    }
});

export default router;
