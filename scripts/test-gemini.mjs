import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

try {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: 'Explain in one short sentence what SyncSphere is.',
  });
  console.log('Gemini 3.6 Flash SUCCESS:\n', response.text);
} catch (e) {
  console.log('Gemini ERROR:', e.message);
}
