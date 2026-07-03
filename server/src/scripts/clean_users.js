import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const ADMIN_EMAIL = 'shubhamgayke9168@gmail.com';

async function cleanUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const result = await User.deleteMany({ email: { $ne: ADMIN_EMAIL } });
        console.log(`Deleted ${result.deletedCount} users.`);

        const admin = await User.findOne({ email: ADMIN_EMAIL });
        if (admin) {
            console.log('Admin account preserved:', admin.email);
        } else {
            console.log('Admin account not found (it might not exist yet).');
        }

    } catch (error) {
        console.error('Error cleaning users:', error);
    } finally {
        await mongoose.disconnect();
    }
}

cleanUsers();
