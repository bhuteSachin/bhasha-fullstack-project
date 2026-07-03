import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testConnection() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        const email = 'shubhamgayke9168@gmail.com';
        console.log(`Searching for user: ${email}`);
        const user = await User.findOne({ email });

        if (user) {
            console.log('User found:', user.email);
        } else {
            console.log('User not found.');
        }

    } catch (error) {
        console.error('Connection/Query Error Name:', error.name);
        console.error('Connection/Query Error Message:', error.message);
        console.error('Connection/Query Error Code:', error.code);
        if (error.cause) console.error('Connection/Query Error Cause:', error.cause);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

testConnection();
