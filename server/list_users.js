import mongoose from 'mongoose';
import 'dotenv/config';
import User from './src/models/User.js';

const uri = process.env.MONGODB_URI;

mongoose.connect(uri)
    .then(async () => {
        console.log('Connected to DB');
        const users = await User.find({}, 'email username isVerified');
        console.log('Users found:', users.length);
        users.forEach(u => console.log(`- ${u.email} (${u.username}) [Verified: ${u.isVerified}]`));
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
