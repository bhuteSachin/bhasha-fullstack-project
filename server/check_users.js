import mongoose from 'mongoose';
import User from './src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const checkUsers = async () => {
    console.log("Starting script...");
    if (!process.env.MONGODB_URI) {
        console.error("MONGODB_URI is missing!");
        process.exit(1);
    }

    try {
        console.log("Connecting to DB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const users = await User.find({}, 'email isPremium subscriptionPlan');
        console.log("Users found:", users.length);
        const fs = await import('fs');
        let output = '';
        users.forEach(u => {
            output += `Email: ${u.email}, Premium: ${u.isPremium}, Plan: ${u.subscriptionPlan}\n`;
        });
        fs.writeFileSync('users_dump.txt', output);
        console.log("Written to users_dump.txt");

        console.log("Done.");
        process.exit(0);
    } catch (error) {
        console.error("Script Error:", error);
        process.exit(1);
    }
};

checkUsers();
