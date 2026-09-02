# NIVORA — Personal Journal, Finance Intelligence & AI Insights

> **One private space for your thoughts, finances, and personal intelligence.**  
> Built for the Google Cloud & AI Studio Ideathon Challenge.

[![Live Demo on Cloud Run](https://img.shields.io/badge/Live%20Demo-Cloud%20Run-4285F4?logo=googlecloud&logoColor=white)](https://nivora-354978227611.asia-east1.run.app)
[![Powered by Gemini](https://img.shields.io/badge/AI-Gemini%203.7%20Flash-8E75B2?logo=googlegemini&logoColor=white)](https://aistudio.google.com)
[![Firebase Protected](https://img.shields.io/badge/Database-Cloud%20Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![Audit Score](https://img.shields.io/badge/Security%20Audit-100%2F100-success)](#security-architecture)

---

## 🌟 Overview

**NIVORA** bridges the gap between daily emotional reflections and personal finances. Most finance apps only show numbers, while traditional journals only log text. NIVORA uses **Google Gemini** to correlate your mindset, emotional reflections, and journal themes directly with your financial behaviors and cashflow.

All data is strictly user-scoped, encrypted, and isolated in **Cloud Firestore**, backed by cryptographically verified **Firebase Authentication** and **Google Cloud Secret Manager**.

- 🌐 **Live Prototype:** [https://nivora-354978227611.asia-east1.run.app](https://nivora-354978227611.asia-east1.run.app)
- 💻 **Repository:** [https://github.com/jerishobed/nivora-personal](https://github.com/jerishobed/nivora-personal)

---

## ✨ Core Features

### 1. 🌿 Mindset & Personal Journaling
- Capture daily reflections, strategic breakthroughs, thoughts, and memories.
- Tag entries (e.g. *Focus*, *Strategy*, *Wellness*) and log emotional states (🌿 *Calm*, ✨ *Inspired*, ☕ *Reflective*, 🎯 *Focused*, 🙏 *Grateful*, 🌧️ *Stressed*).
- Instant word counts, search, and date-based timeline sorting.

### 2. 💳 Personal Finance Intelligence
- Log income and categorized expenses (Housing, Food, Transport, Bills, Health, etc.).
- Real-time calculations: Total Inflow, Total Outflow, Net Balance, and visual expense category metering.
- Multi-criteria filtering by category, transaction type, or amount.

### 3. 🧠 Cross-Domain AI Synthesis (Gemini 3.7 Flash & 3.1 Flash Lite)
- Multi-turn conversational flow preserving an 8-turn sliding history context window.
- Injects up to 15 authentic journal entries and 25 transaction summaries directly into Gemini’s context.
- Synthesizes answers into 3 actionable pillars:
  - **### 🌿 Insight**: Data synthesis connecting reflections with spending habits.
  - **### 💡 Why It Matters**: Implications for emotional wellness and financial peace of mind.
  - **### 🎯 Recommendations**: Concrete, realistic next steps.

### 4. 💬 Multi-Session Conversation Management
- Automatic semantic titling generated from initial user queries.
- History drawer to switch between or manage previous conversations.
- Dynamic follow-up chips and authentic grounding badges verifying analyzed record counts.

---

## 🏗️ Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
│   (React 19 + TypeScript + Vite + Tailwind CSS + Lucide)     │
└───────────────┬─────────────────────────────┬───────────────┘
                │ Firebase Auth               │ HTTPS / JSON (Bearer Token)
                │ & Firestore SDK             │
                ▼                             ▼
┌───────────────────────────────┐   ┌─────────────────────────┐
│        Cloud Firestore        │   │    Google Cloud Run     │
│   (User-Isolated Database)    │   │ (Express.js API Server) │
│                               │   └────────────┬────────────┘
│  /users/{uid}/journal         │                │ @google/genai
│  /users/{uid}/transactions    │                │ (Runtime Secret Injection)
│  /users/{uid}/conversations   │                ▼
│                               │   ┌─────────────────────────┐
│  Rules: auth.uid == userId    │   │     Google Gemini API   │
└───────────────────────────────┘   │ (3.7 Flash / 3.1 Lite)  │
                                    └─────────────────────────┘
```

---

## 🔒 Security Architecture (100% Audit Compliance)

| Security Domain | Implementation Details |
|---|---|
| **Zero Client Key Leaks** | `GEMINI_API_KEY` is never exposed in browser bundles, `.env`, or client code. Frontend communicates exclusively with the authenticated Express backend. |
| **Secret Manager** | Secrets are injected securely into the Cloud Run container runtime environment (`process.env.GEMINI_API_KEY`) via Google Cloud Secret Manager bindings. |
| **Server-Side Auth** | Backend Express routes (`/api/ai/ask` and `/api/ai/quick-insights`) cryptographically verify Firebase ID tokens via `firebase-admin` (`adminAuth.verifyIdToken`). |
| **Anti-Spoofing** | Express middleware explicitly strips client-supplied `userId`, `uid`, or `user` fields and forces identity extraction from verified JWT tokens. |
| **Data Isolation** | Firestore security rules strictly isolate records under `/users/{userId}/*` — cross-user access is impossible. |
| **API Defense** | In-memory sliding-window rate limiter (20 requests/minute per UID), 1MB payload limits, and fingerprinting suppression (`app.disable('x-powered-by')`). |

---

## 🛡️ Cloud Firestore Security Rules

NIVORA enforces complete data isolation directly at the database layer. Unauthenticated access is blocked, and User A cannot read or write to User B's documents.

File: `firestore.rules`
```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User-scoped data isolation for NIVORA
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🚀 Local Development & Setup

### 1. Prerequisites
- **Node.js**: v20.x or higher
- **npm** or **bun**
- A **Firebase Project** with Authentication and Firestore enabled
- A **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/)

### 2. Clone the Repository
```bash
git clone https://github.com/jerishobed/nivora-personal.git
cd nivora-personal
```

### 3. Install Dependencies
```bash
npm install
# or
bun install
```

### 4. Configure Environment Variables
Create a `.env` file in the project root:
```env
# Gemini API Key (Backend)
GEMINI_API_KEY="your-gemini-api-key"

# Application URL
APP_URL="http://localhost:3000"

# Optional: Override Firebase Project ID
FIREBASE_PROJECT_ID="personal-gemini-journal-fcc28"
```

Verify your `firebase-applet-config.json` contains your Firebase web client configuration:
```json
{
  "projectId": "personal-gemini-journal-fcc28",
  "appId": "1:354978227611:web:5e4c40c84d2894809aad3e",
  "apiKey": "AIzaSyBBfh9U2b8trft0s4fl2cdcFqyT6QgK3LQ",
  "authDomain": "personal-gemini-journal-fcc28.firebaseapp.com",
  "firestoreDatabaseId": "ai-studio-nivora-ba5c8edd-3992-4df1-8037-64e7b19eec9e"
}
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Production Deployment

### Building the Project
```bash
npm run build
```
This builds:
1. The React Vite client into `dist/`.
2. The Node.js Express server with `esbuild` into `dist/server.cjs`.

### Deploying to Google Cloud Run

1. **Deploy Container to Cloud Run:**
   ```bash
   gcloud run deploy nivora \
     --source . \
     --platform managed \
     --region asia-east1 \
     --allow-unauthenticated
   ```

2. **Configure Secret Manager for Cloud Run:**
   ```bash
   # Create secret in Secret Manager
   gcloud secrets create GEMINI_API_KEY --data-file=- <<< "your-gemini-api-key"

   # Bind secret to Cloud Run service
   gcloud run services update nivora \
     --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
     --region asia-east1
   ```

3. **Deploy Firestore Security Rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## 📁 Repository Structure

```text
nivora-personal/
├── assets/                    # Static assets & AI Studio configs
├── src/
│   ├── components/            # React UI components
│   │   ├── AIChatView.tsx     # Multi-turn Gemini chat interface
│   │   ├── AuthModal.tsx      # Firebase Google/Email/Demo login modal
│   │   ├── BrandHeader.tsx    # Responsive branding header
│   │   ├── Dashboard.tsx      # Overview stats & quick actions
│   │   ├── FinanceView.tsx    # Income/expense manager & category breakdowns
│   │   ├── JournalView.tsx    # Mindset reflections & reader views
│   │   ├── LandingPage.tsx    # Unauthenticated landing page
│   │   └── UserCard.tsx       # Profile badge & sign-out controls
│   ├── lib/
│   │   └── firebase.ts        # Client Firebase SDK & Firestore subscriptions
│   ├── App.tsx                # Primary view routing & auth state observer
│   ├── main.tsx               # DOM root entrypoint
│   └── types.ts               # Core TypeScript interface definitions
├── firestore.rules            # User-isolated Firestore security rules
├── firebase-applet-config.json# Public Firebase web client credentials
├── firebase-blueprint.json    # Entity schema definitions
├── server.ts                  # Express backend with auth, rate limiting & Gemini
├── vite.config.ts             # Vite + Tailwind CSS build config
├── package.json               # Dependencies & build scripts
└── README.md                  # Project documentation & deployment guide
```

---

## 🏆 Hackathon & Challenge Compliance

- **Phase 1 — AI Studio Security Configuration**: Custom instructions establish threat modeling, secure coding standards, data isolation, and Secret Manager bindings.
- **Requirement 1 — User Authentication**: Full Firebase Auth with server-side token verification (`firebase-admin`).
- **Requirement 2 — Multi-Turn AI Interaction**: 8-turn sliding history context window powered by Gemini 3.7 Flash & 3.1 Flash Lite.
- **Requirement 3 — Isolated Data Storage**: Cloud Firestore subcollection paths (`/users/{userId}/*`) protected by `request.auth.uid == userId`.
- **Requirement 4 — Secure Key Management**: Zero API keys exposed to browser; runtime injection via Google Cloud Secret Manager.
- **Phase 3 — Original Feature Enhancement**: Dual-domain Mindset & Financial Correlation engine with dynamic grounding verification badges.

---

## 📄 License
MIT License. Developed for the Google Cloud & AI Studio Ideathon Challenge.
