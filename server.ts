import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

dotenv.config();

// Initialize Firebase Admin SDK for server-side token validation
let firebaseProjectId = 'personal-gemini-journal-fcc28';
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed?.projectId) {
      firebaseProjectId = parsed.projectId;
    }
  }
} catch (e) {
  // fallback to environment or default
}

const adminApp: App = !getApps().length
  ? initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || firebaseProjectId
    })
  : getApps()[0];

const adminAuth = getAuth(adminApp);

// Strongly typed authenticated request
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    isAnonymous?: boolean;
  };
}

/**
 * High-performance, in-memory sliding window rate limiter
 * Tracks request counts strictly indexed by the verified Firebase UID.
 */
interface RateLimitRecord {
  timestamps: number[];
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 20; // 20 requests per user per minute
const userRateLimits = new Map<string, RateLimitRecord>();

// Periodic garbage collection to prevent memory leaks from inactive sessions (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [uid, record] of userRateLimits.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    if (record.timestamps.length === 0) {
      userRateLimits.delete(uid);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate Limiting Middleware for AI Endpoints
 * Enforces per-user rate limit (20 req/min) using the verified Firebase UID.
 */
export function rateLimitAiRequests(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = (req as AuthenticatedRequest).user;
  const uid = user?.uid;

  if (!uid) {
    res.status(401).json({
      error: 'Unauthorized: Valid authentication required for rate limit evaluation.'
    });
    return;
  }

  const now = Date.now();
  let record = userRateLimits.get(uid);

  if (!record) {
    record = { timestamps: [] };
    userRateLimits.set(uid, record);
  }

  // Filter timestamps within the current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (record.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    res.status(429).json({
      error: 'Too many AI requests. Please try again shortly.'
    });
    return;
  }

  // Record this valid request timestamp
  record.timestamps.push(now);
  next();
}

/**
 * Server-side Firebase Authentication Middleware
 * Validates the Authorization Bearer ID token with Firebase Admin before allowing access.
 */
export async function requireFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized: Missing or malformed Authorization header. Expected Bearer <Firebase ID Token>.'
    });
    return;
  }

  const idToken = authHeader.substring(7).trim();
  if (!idToken) {
    res.status(401).json({
      error: 'Unauthorized: Missing token in Authorization header.'
    });
    return;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    if (!decodedToken || !decodedToken.uid) {
      res.status(401).json({
        error: 'Unauthorized: Invalid token payload.'
      });
      return;
    }

    // Attach verified user identity strictly from Firebase Auth token (never trust client request body)
    (req as AuthenticatedRequest).user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      isAnonymous: decodedToken.firebase?.sign_in_provider === 'anonymous'
    };

    next();
  } catch (err: any) {
    // Safe error response without leaking internal crypto stack traces
    const isExpired = err?.code === 'auth/id-token-expired' || err?.message?.includes('expired');
    res.status(401).json({
      error: isExpired
        ? 'Unauthorized: Authentication token has expired. Please refresh your session.'
        : 'Unauthorized: Invalid authentication token.'
    });
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security Hardening: Disable X-Powered-By header to prevent fingerprinting
app.disable('x-powered-by');

// Security Hardening: Enforce 1MB request body limit on incoming payloads
app.use(express.json({ limit: '1mb' }));

/**
 * Helper to sanitize and clamp string fields safely
 */
function sanitizeString(val: any, maxLen: number, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  return val.trim().slice(0, maxLen);
}

/**
 * Validates, clamps, and sanitizes payload for POST /api/ai/ask
 */
export function validateAiAskPayload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'Invalid request payload: Expected JSON object body.' });
    return;
  }

  // 1. Validate prompt
  if (!body.prompt || typeof body.prompt !== 'string') {
    res.status(400).json({ error: 'Invalid request: "prompt" must be a non-empty string.' });
    return;
  }

  const trimmedPrompt = body.prompt.trim();
  if (trimmedPrompt.length === 0) {
    res.status(400).json({ error: 'Invalid request: "prompt" cannot be empty.' });
    return;
  }

  if (trimmedPrompt.length > 10000) {
    res.status(400).json({ error: 'Invalid request: "prompt" exceeds maximum allowable length.' });
    return;
  }

  // Clamp prompt to 3,000 characters for Gemini token safety
  req.body.prompt = trimmedPrompt.slice(0, 3000);

  // 2. Validate and sanitize journalEntries
  if (body.journalEntries !== undefined) {
    if (!Array.isArray(body.journalEntries)) {
      res.status(400).json({ error: 'Invalid request: "journalEntries" must be an array.' });
      return;
    }
    // Clamp to maximum 50 entries
    const rawEntries = body.journalEntries.slice(0, 50);
    req.body.journalEntries = rawEntries.map((j: any) => ({
      title: sanitizeString(j?.title, 200, 'Untitled'),
      content: sanitizeString(j?.content, 5000, ''),
      mood: sanitizeString(j?.mood, 50, 'neutral'),
      date: sanitizeString(j?.date, 50, '')
    }));
  } else {
    req.body.journalEntries = [];
  }

  // 3. Validate and sanitize transactions
  if (body.transactions !== undefined) {
    if (!Array.isArray(body.transactions)) {
      res.status(400).json({ error: 'Invalid request: "transactions" must be an array.' });
      return;
    }
    // Clamp to maximum 100 transactions
    const rawTx = body.transactions.slice(0, 100);
    req.body.transactions = rawTx.map((t: any) => {
      const rawAmt = Number(t?.amount);
      const amount = isFinite(rawAmt) && Math.abs(rawAmt) <= 1000000000 ? Math.abs(rawAmt) : 0;
      const type = t?.type === 'income' ? 'income' : 'expense';
      return {
        description: sanitizeString(t?.description, 200, 'Transaction'),
        category: sanitizeString(t?.category, 50, 'Other'),
        amount,
        type,
        date: sanitizeString(t?.date, 50, '')
      };
    });
  } else {
    req.body.transactions = [];
  }

  // 4. Validate and sanitize conversationHistory
  if (body.conversationHistory !== undefined) {
    if (!Array.isArray(body.conversationHistory)) {
      res.status(400).json({ error: 'Invalid request: "conversationHistory" must be an array.' });
      return;
    }
    // Clamp to last 20 messages
    const rawHistory = body.conversationHistory.slice(-20);
    req.body.conversationHistory = rawHistory.map((m: any) => ({
      sender: m?.sender === 'user' ? 'user' : 'assistant',
      text: sanitizeString(m?.text, 2000, '')
    }));
  } else {
    req.body.conversationHistory = [];
  }

  // 5. Strictly remove any client-supplied spoofing identifiers
  delete req.body.userId;
  delete req.body.uid;
  delete req.body.user;

  next();
}

/**
 * Validates, clamps, and sanitizes payload for POST /api/ai/quick-insights
 */
export function validateQuickInsightsPayload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'Invalid request payload: Expected JSON object body.' });
    return;
  }

  // Validate and sanitize journalEntries
  if (body.journalEntries !== undefined) {
    if (!Array.isArray(body.journalEntries)) {
      res.status(400).json({ error: 'Invalid request: "journalEntries" must be an array.' });
      return;
    }
    const rawEntries = body.journalEntries.slice(0, 50);
    req.body.journalEntries = rawEntries.map((j: any) => ({
      title: sanitizeString(j?.title, 200, 'Untitled'),
      content: sanitizeString(j?.content, 5000, ''),
      mood: sanitizeString(j?.mood, 50, 'neutral'),
      date: sanitizeString(j?.date, 50, '')
    }));
  } else {
    req.body.journalEntries = [];
  }

  // Validate and sanitize transactions
  if (body.transactions !== undefined) {
    if (!Array.isArray(body.transactions)) {
      res.status(400).json({ error: 'Invalid request: "transactions" must be an array.' });
      return;
    }
    const rawTx = body.transactions.slice(0, 100);
    req.body.transactions = rawTx.map((t: any) => {
      const rawAmt = Number(t?.amount);
      const amount = isFinite(rawAmt) && Math.abs(rawAmt) <= 1000000000 ? Math.abs(rawAmt) : 0;
      const type = t?.type === 'income' ? 'income' : 'expense';
      return {
        description: sanitizeString(t?.description, 200, 'Transaction'),
        category: sanitizeString(t?.category, 50, 'Other'),
        amount,
        type,
        date: sanitizeString(t?.date, 50, '')
      };
    });
  } else {
    req.body.transactions = [];
  }

  // Strictly remove any client-supplied spoofing identifiers
  delete req.body.userId;
  delete req.body.uid;
  delete req.body.user;

  next();
}

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

// AI Chat & Insights Endpoint (Protected with Firebase Authentication, User-scoped Rate Limiting, and Payload Validation)
app.post(
  '/api/ai/ask',
  requireFirebaseAuth,
  rateLimitAiRequests,
  validateAiAskPayload,
  async (req: Request, res: Response) => {
    try {
      const authenticatedUser = (req as AuthenticatedRequest).user;
      const { prompt, journalEntries = [], transactions = [], conversationHistory = [] } = req.body;

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
    // Keep raw error details in server logs only
    console.error('[NIVORA Server Error /api/ai/ask]:', error?.message || error);
    res.status(500).json({
      error: 'Unable to generate AI response. Please try again later.',
      fallback: 'Unable to generate your insight right now. Please verify your connection or try again in a few moments.'
    });
  }
});

// Quick Insights generator endpoint (Protected with Firebase Authentication, User-scoped Rate Limiting, and Payload Validation)
app.post(
  '/api/ai/quick-insights',
  requireFirebaseAuth,
  rateLimitAiRequests,
  validateQuickInsightsPayload,
  async (req: Request, res: Response) => {
    try {
      const authenticatedUser = (req as AuthenticatedRequest).user;
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
    console.error('[NIVORA Server Error /api/ai/quick-insights]:', err?.message || err);
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

// Safe 404 handler for undefined /api routes
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Centralized production error handler (No stack traces, internal paths, or secrets leaked)
app.use((err: any, _req: Request, res: Response, _next: NextFunction): void => {
  if (res.headersSent) {
    return _next(err);
  }
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Invalid request: Malformed JSON payload.' });
    return;
  }
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    res.status(413).json({ error: 'Invalid request: Payload exceeds size limit.' });
    return;
  }
  console.error('[NIVORA Server Unhandled Error]:', err?.message || err);
  res.status(500).json({ error: 'Internal server error. Please try again later.' });
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
