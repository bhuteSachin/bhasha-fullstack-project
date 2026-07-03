import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    manualTransactionId: { type: String, sparse: true }, // For UPI manual payments
    razorpayOrderId: { type: String, unique: true, sparse: true }, // For Razorpay payments
    razorpayPaymentId: { type: String, unique: true, sparse: true }, // For Razorpay payments
    paymentMethod: { type: String, enum: ['upi_manual', 'razorpay'], default: 'upi_manual' },
    plan: { type: String, enum: ['monthly', 'yearly'], required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    processedAt: { type: Date }
});

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
