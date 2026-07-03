import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = 'gemini-2.5-flash';

    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello');
        const response = await result.response;
        fs.writeFileSync('error_log.txt', `SUCCESS: ${modelName}`);
    } catch (error) {
        fs.writeFileSync('error_log.txt', `FAILED: ${modelName}\n${error.message}\n${JSON.stringify(error, null, 2)}`);
    }
}

testModel();
