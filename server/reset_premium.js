import mongoose from 'mongoose';
import User from './src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const resetPremium = async () => {
    console.log("Starting reset script...");
    if (!process.env.MONGODB_URI) {
        console.error("MONGODB_URI is missing!");
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const result = await User.updateMany({}, {
            $set: {
                isPremium: false,
                subscriptionPlan: null,
                subscriptionExpiry: null
            }
        });

        console.log(`Reset complete. Modified ${result.modifiedCount} users.`);
        process.exit(0);
    } catch (error) {
        console.error("Script Error:", error);
        process.exit(1);
    }
};

resetPremium();
