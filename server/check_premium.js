import mongoose from 'mongoose';
import 'dotenv/config';
import User from './src/models/User.js';

const uri = process.env.MONGODB_URI;

mongoose.connect(uri)
    .then(async () => {
        console.log('Connected to DB');
        const user = await User.findOne({ email: 'shubhamgayke9168@gmail.com' });
        console.log(`User: ${user.email}`);
        console.log(`isPremium: ${user.isPremium}`);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
