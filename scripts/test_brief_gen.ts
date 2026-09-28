import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('API key found:', !!apiKey);
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
You are PreSync AI, an expert enterprise AI project architect.
Generate a structured executive project brief for:
- Title: Full Stack Web APp
- Category: Full-Stack Development
- Tech Stack: Python, React, FastAPI, Docker, TypeScript
- Scope Note: need breif

Respond with ONLY valid JSON:
{
  "title": "Synthesized Project Title",
  "description": "Comprehensive multi-paragraph scope...",
  "keyRisks": ["Risk 1 with mitigation", "Risk 2 with mitigation"],
  "recommendedSkills": ["Python", "React", "FastAPI"]
}
`;

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });
    console.log('BRIEF GENERATED:\n', res.text);
  } catch (e: any) {
    console.error('ERROR:', e.message);
  }
}
test();
