import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import User from './src/models/User.js';

const uri = process.env.MONGODB_URI;

mongoose.connect(uri)
    .then(async () => {
        console.log('Connected to DB');
        const email = 'shubhamgayke9168@gmail.com';
        const user = await User.findOne({ email });

        if (user) {
            user.isVerified = true;
            user.isPremium = true; // Grant premium access
            user.password = await bcrypt.hash('Shubham@9860', 10);
            await user.save();
            console.log(`User ${email} verified and password reset to 'Shubham@9860'`);
        } else {
            console.log('User not found');
        }
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
