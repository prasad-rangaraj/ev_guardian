import { GoogleGenerativeAI } from '@google/generative-ai';
import asyncHandler from '../middleware/asyncHandler.js';
import prisma from '../services/prisma.service.js';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `
You are the Think360 Edge AI Assistant, an expert in Battery Management Systems (BMS), Lithium-ion batteries, and predictive maintenance.
Your goal is to help users understand their battery data, diagnose faults, and provide research insights.
Always respond in a professional, concise, and highly analytical tone.

If the user asks about the current state, use the context provided in their message (if any).
Use Markdown formatting extensively (tables, bullet points, bold text) to make your responses easy to read.
`;

export const handleChat = asyncHandler(async (req, res) => {
  const { message, history, contextData } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  // Use Gemini 1.5 Flash or Pro
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: SYSTEM_PROMPT });

  // Format history for Gemini
  const formattedHistory = (history || []).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({
    history: formattedHistory,
  });

  // Inject current context if provided
  let fullPrompt = message;
  if (contextData) {
    fullPrompt = `[SYSTEM: Current Battery Context]\n${JSON.stringify(contextData)}\n\n[USER]: ${message}`;
  }

  try {
    const result = await chat.sendMessage(fullPrompt);
    const responseText = result.response.text();

    res.json({
      success: true,
      data: {
        role: 'assistant',
        content: responseText
      }
    });
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate response from AI' });
  }
});
