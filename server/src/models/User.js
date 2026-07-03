import mongoose from 'mongoose';

const translationHistorySchema = new mongoose.Schema({
    source_lang: String,
    target_lang: String,
    original_text: String,
    translated_text: String,
    timestamp: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpiry: { type: Date },
    isBanned: { type: Boolean, default: false },
    history: [translationHistorySchema],
    isPremium: { type: Boolean, default: false },
    subscriptionPlan: { type: String, enum: ['monthly', 'yearly', null], default: null },
    subscriptionExpiry: { type: Date, default: null },

    // Social Features
    username: { type: String, unique: true, sparse: true },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friendRequests: [{
        from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'rejected'], default: 'pending' }
    }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Status
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null },

    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
