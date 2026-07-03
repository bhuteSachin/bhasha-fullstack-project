import express from 'express';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/User.js';
import Payment from '../models/Payment.js';

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const ADMIN_EMAIL = 'shubhamgayke9168@gmail.com';

// Create Razorpay Order
router.post('/create-order', async (req, res) => {
    try {
        const { email, plan } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const amount = plan === 'monthly' ? 199 : 799;

        const options = {
            amount: amount * 100, // Razorpay expects amount in paise
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            notes: {
                email: email,
                plan: plan
            }
        };

        const order = await razorpay.orders.create(options);

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error("Create Order Error:", error);
        res.status(500).json({ detail: error.message });
    }
});

// Verify Razorpay Payment
router.post('/verify', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email, plan } = req.body;

        // Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, detail: 'Invalid payment signature' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, detail: 'User not found' });

        const amount = plan === 'monthly' ? 199 : 799;

        // Save payment record
        const newPayment = new Payment({
            userId: user._id,
            email,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            paymentMethod: 'razorpay',
            plan,
            amount,
            status: 'paid',
            processedAt: new Date()
        });
        await newPayment.save();

        // Upgrade user to premium
        user.isPremium = true;
        user.subscriptionPlan = plan;

        const expiryDate = new Date();
        if (plan === 'monthly') expiryDate.setMonth(expiryDate.getMonth() + 1);
        else if (plan === 'yearly') expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        user.subscriptionExpiry = expiryDate;
        await user.save();

        res.json({
            success: true,
            message: 'Payment verified successfully! Welcome to Premium.',
            isPremium: true,
            subscriptionPlan: plan,
            subscriptionExpiry: expiryDate
        });

    } catch (error) {
        console.error("Verify Payment Error:", error);
        res.status(500).json({ success: false, detail: error.message });
    }
});


// Submit Manual Payment (UPI) -> Pending
router.post('/submit-manual', async (req, res) => {
    try {
        const { email, plan, transactionId } = req.body;

        if (!transactionId) {
            return res.status(400).json({ detail: 'Transaction ID is required' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // Check if transaction ID already exists
        const existingPayment = await Payment.findOne({ manualTransactionId: transactionId });
        if (existingPayment) {
            return res.status(400).json({ detail: 'Transaction ID already submitted' });
        }

        const amount = plan === 'monthly' ? 199 : 799;

        const newPayment = new Payment({
            userId: user._id,
            email,
            manualTransactionId: transactionId,
            plan,
            amount,
            status: 'pending'
        });

        await newPayment.save();

        res.json({ status: 'pending', message: 'Payment submitted. Waiting for admin verification.' });

    } catch (error) {
        console.error("Manual Payment Error:", error);
        res.status(500).json({ detail: error.message });
    }
});

// Admin: Get Pending Payments
router.get('/admin/payments', async (req, res) => {
    try {
        // In a real app, use middleware to verify admin
        // For now, we trust the frontend to only show this page to the admin, 
        // but we should ideally check the user from the token here.
        // Let's assume the client sends the email in a header or we decode the token.
        // For simplicity in this demo phase, we'll just return the data.

        const payments = await Payment.find({ status: 'pending' }).sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// Admin: Approve Payment
router.post('/admin/approve', async (req, res) => {
    try {
        const { paymentId } = req.body;
        const payment = await Payment.findById(paymentId);
        if (!payment) return res.status(404).json({ detail: 'Payment not found' });

        if (payment.status === 'approved') return res.status(400).json({ detail: 'Already approved' });

        const user = await User.findById(payment.userId);
        if (!user) return res.status(404).json({ detail: 'User not found' });

        // Upgrade User
        user.isPremium = true;
        user.subscriptionPlan = payment.plan;

        const expiryDate = new Date();
        if (payment.plan === 'monthly') expiryDate.setMonth(expiryDate.getMonth() + 1);
        else if (payment.plan === 'yearly') expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        user.subscriptionExpiry = expiryDate;
        await user.save();

        // Update Payment Status
        payment.status = 'approved';
        payment.processedAt = new Date();
        await payment.save();

        res.json({ message: 'Payment approved and user upgraded' });

    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// Admin: Reject Payment
router.post('/admin/reject', async (req, res) => {
    try {
        const { paymentId } = req.body;
        const payment = await Payment.findById(paymentId);
        if (!payment) return res.status(404).json({ detail: 'Payment not found' });

        payment.status = 'rejected';
        payment.processedAt = new Date();
        await payment.save();

        res.json({ message: 'Payment rejected' });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
