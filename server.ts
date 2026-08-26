import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy Google Gen AI client helper
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Health check endpoints for production & preview verification
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'nivora-api' });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AI Chat & Insights Endpoint
app.post('/api/ai/ask', async (req: Request, res: Response) => {
  try {
    const { prompt, journalEntries = [], transactions = [], conversationHistory = [] } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'A prompt string is required.' });
      return;
    }

    const ai = getAiClient();

    // Summarize finances for context
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals: Record<string, number> = {};

    transactions.forEach((t: any) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        totalIncome += amt;
      } else {
        totalExpense += amt;
        const cat = t.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      }
    });

    const netBalance = totalIncome - totalExpense;

    // Build context prompt
    const journalContext = journalEntries.length > 0
      ? journalEntries.slice(0, 15).map((j: any, i: number) =>
          `[Entry ${i + 1}] Date: ${j.date} | Title: "${j.title || 'Untitled'}" | Mood: ${j.mood || 'unspecified'}\nContent: ${j.content}`
        ).join('\n---\n')
      : 'No journal entries recorded yet.';

    const financeContext = transactions.length > 0
      ? `Financial Summary:
- Total Income: $${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Total Expenses: $${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Current Net Balance: $${netBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Expense Category Breakdown:
${Object.entries(categoryTotals).map(([cat, amt]) => `  • ${cat}: $${amt.toFixed(2)}`).join('\n')}

Recent Transactions (last 25):
${transactions.slice(0, 25).map((t: any) => `• [${t.date}] ${t.type.toUpperCase()}: $${Number(t.amount).toFixed(2)} (${t.category}) - ${t.description}`).join('\n')}`
      : 'No financial transactions recorded yet.';

    const systemInstruction = `You are NIVORA AI, the dedicated, private personal intelligence assistant built into NIVORA (Personal Journal, Finance Intelligence & AI Insights).

YOUR CORE RESPONSIBILITIES:
1. Provide thoughtful, intelligent, empathetic, and analytical answers connecting the user's reflections, mindset, and financial decisions.
2. Ground all insights strictly in the user's authentic data provided in the context. Never fabricate journal entries or transactions.
3. If the user asks a question but has limited or zero data in that area, politely inform them and provide warm guidance on how logging their thoughts or transactions will unlock deeper intelligence.

RESPONSE FORMATTING GUIDELINES:
- Structure your response cleanly using Markdown.
- Use intuitive, scannable sections:
  ### 🌿 Insight
  A clear, focused synthesis of what the data shows.
  ### 💡 Why It Matters
  The implications for their financial peace of mind, routine, emotional well-being, or goals.
  ### 🎯 Recommendations
  Actionable, realistic, bullet-pointed suggestions.
- Keep the tone calm, premium, respectful, encouraging, and razor-sharp. Avoid generic fluff or cliches.`;

    const conversationContext = Array.isArray(conversationHistory) && conversationHistory.length > 0
      ? conversationHistory
          .slice(-8)
          .map((msg: any) => `${msg.sender === 'user' ? 'USER' : 'NIVORA AI'}: ${msg.text}`)
          .join('\n\n')
      : '';

    const userMessage = `User's Data Context:
===============================
JOURNAL ENTRIES (${journalEntries.length} total):
${journalContext}

===============================
FINANCIAL DATA (${transactions.length} transactions):
${financeContext}

${conversationContext ? `===============================\nPREVIOUS CONVERSATION HISTORY:\n${conversationContext}\n` : ''}===============================
CURRENT USER QUESTION / FOLLOW-UP:
"${prompt}"

Please directly answer the current user question or follow-up in the context of the previous conversation and their authentic records.`;

    // Call Gemini with current official models (Fast / Lite / Flash)
    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.7-flash',
      'gemini-flash-latest'
    ];

    let response: any = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [{ text: userMessage }]
            }
          ],
          config: {
            systemInstruction,
            temperature: 0.4,
            maxOutputTokens: 1500
          }
        });
        if (response?.text) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[NIVORA AI] Attempt with ${modelName} failed:`, err?.message || err);
      }
    }

    if (!response?.text) {
      throw lastError || new Error('No response generated by AI model.');
    }

    const aiText = response.text;

    res.json({
      text: aiText,
      sources: {
        journalCount: journalEntries.length,
        transactionCount: transactions.length
      }
    });
  } catch (error: any) {
    console.error('NIVORA AI Error:', error);
    res.status(500).json({
      error: error.message || 'Unable to generate your insight right now. Please try again.',
      fallback: 'Unable to generate your insight right now. Please verify your connection or try again in a few moments.'
    });
  }
});

// Quick Insights generator endpoint
app.post('/api/ai/quick-insights', async (req: Request, res: Response) => {
  try {
    const { journalEntries = [], transactions = [] } = req.body;
    const ai = getAiClient();

    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach((t: any) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') totalIncome += amt;
      else totalExpense += amt;
    });

    const prompt = `Based on the following data:
- Journal Entries count: ${journalEntries.length}
- Recent entries excerpt: ${JSON.stringify(journalEntries.slice(0, 5).map((j: any) => ({ title: j.title, mood: j.mood, date: j.date, snippet: (j.content || '').slice(0, 100) })))}
- Total Income: $${totalIncome}, Total Expense: $${totalExpense}, Transactions count: ${transactions.length}
- Recent transactions excerpt: ${JSON.stringify(transactions.slice(0, 8).map((t: any) => ({ desc: t.description, amt: t.amount, type: t.type, cat: t.category })))}

Provide exactly 3 concise, high-value personal intelligence cards in JSON format.
Output strictly valid JSON matching this schema:
{
  "insights": [
    {
      "category": "Mindset" | "Finance" | "Balance",
      "headline": "Short punchy headline (max 7 words)",
      "summary": "1-2 sentence actionable observation",
      "metric": "Key figure or tag (e.g. '+$1,450 Net' or '3 Reflections' or '68% Savings Rate')"
    }
  ]
}`;

    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.7-flash',
      'gemini-flash-latest'
    ];

    let response: any = null;
    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3
          }
        });
        if (response?.text) break;
      } catch (e: any) {
        console.warn(`[NIVORA AI Quick Insights] ${modelName} attempt:`, e?.message || e);
      }
    }

    const parsed = JSON.parse(response?.text || '{"insights":[]}');
    res.json(parsed);
  } catch (err: any) {
    console.error('Quick insights error:', err);
    res.json({
      insights: [
        {
          category: 'Mindset',
          headline: 'Reflections Anchor Clarity',
          summary: 'Regular journaling helps maintain intentionality across your weekly financial decisions.',
          metric: 'Daily Practice'
        },
        {
          category: 'Finance',
          headline: 'Cashflow Rhythm',
          summary: 'Keep monitoring category breakdowns to safeguard savings and invest in long-term peace of mind.',
          metric: 'Active Tracking'
        },
        {
          category: 'Balance',
          headline: 'Holistic Intelligence',
          summary: 'Connecting thoughts with spending habits provides a complete picture of your lifestyle.',
          metric: 'NIVORA AI'
        }
      ]
    });
  }
});

// Vite Development or Production Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NIVORA] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
