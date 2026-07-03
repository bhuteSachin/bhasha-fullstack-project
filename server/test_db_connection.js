import mongoose from 'mongoose';
import 'dotenv/config';

const uri = process.env.MONGODB_URI;

console.log('Testing MongoDB Connection...');
console.log('URI:', uri ? uri.replace(/:([^:@]+)@/, ':****@') : 'undefined'); // Hide password in logs

if (!uri) {
    console.error('Error: MONGODB_URI is not defined in .env');
    process.exit(1);
}

mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000 // Fail fast after 5 seconds
})
    .then(() => {
        console.log('Successfully connected to MongoDB Atlas!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Connection Failed:', err);
        console.error('Error Name:', err.name);
        console.error('Error Message:', err.message);
        if (err.reason) console.error('Error Reason:', err.reason);
        process.exit(1);
    });
