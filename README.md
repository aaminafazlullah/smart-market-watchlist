# 🚀 MarketWatch AI

### Track less. Understand more.

MarketWatch AI is an intelligent stock watchlist that helps users understand **what changed in the market and what deserves their attention**.

Instead of simply showing stock prices, MarketWatch AI analyzes multiple market signals and generates an **explainable Attention Score from 0–100**, helping users quickly identify meaningful changes across their watchlist.

🔗 **Live Demo:** https://smart-market-watchlist-eta.vercel.app

---

## 💡 The Problem

Traditional stock watchlists show users a lot of information, but they don't answer the most important question:

> **"What should I actually pay attention to?"**

A user may have several stocks in their watchlist and limited time to analyze each one. MarketWatch AI solves this by combining multiple signals into a simple, explainable score.

---

## 🧠 How It Works

Each stock receives an **Attention / Change Score from 0–100** based on four key signals:

| Signal | Weight |
|--------|--------|
| 📈 Price Movement | 40% |
| 📊 Trading Volume | 25% |
| 📰 News Activity | 20% |
| 📅 Earnings | 15% |

The score is then translated into an easy-to-understand severity level:

| Score | Severity |
|-------|----------|
| 0–29 | 🟢 LOW |
| 30–59 | 🟡 MEDIUM |
| 60–79 | 🟠 HIGH |
| 80–100 | 🔴 CRITICAL |

Rather than making predictions, the system focuses on **explaining why a stock deserves attention**.

For example:

> **Attention Score: 68 — HIGH**

Reasons might include:

- Unusual price movement compared with recent volatility
- Elevated trading volume
- Increased recent news activity
- Upcoming earnings event

---

## ✨ Features

### 📊 Intelligent Dashboard
Get a quick overview of your tracked stocks and identify which ones require attention.

### ⭐ Smart Watchlist
Create and manage a personal stock watchlist with live market information.

### 🔎 Stock Details
Dive deeper into an individual stock and understand the signals contributing to its Attention Score.

### 🧠 Explainable Scoring
Every score is accompanied by human-readable reasons instead of being a black-box prediction.

### 📰 Market News
Recent company news is incorporated into the attention calculation.

### 📅 Earnings Awareness
Upcoming earnings events can increase a stock's attention level.

### 👤 Authentication
Users have their own authenticated watchlists and account information.

### 🔄 Persistent State
The application stores watchlist and user state using Supabase.

---

## 🏗️ Architecture

```text
                    ┌──────────────────┐
                    │     User         │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   Next.js App    │
                    │  Dashboard/UI    │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       ┌────────────┐ ┌────────────┐ ┌────────────┐
       │  Supabase  │ │  Finnhub   │ │Alpha Vantage│
       │ Auth + DB  │ │Quotes/News │ │History/     │
       │            │ │            │ │Earnings     │
       └────────────┘ └────────────┘ └────────────┘
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                    ┌──────────────────┐
                    │ Change Score     │
                    │ Engine           │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Attention Score  │
                    │ 0 – 100          │
                    └──────────────────┘
🛠️ Tech Stack
Frontend
Next.js
React
TypeScript
Tailwind CSS
Backend & Data
Supabase
Finnhub API
Alpha Vantage API
Deployment
Vercel
Testing
Vitest
🔐 Data & Security

MarketWatch AI uses Supabase authentication and Row Level Security (RLS) to ensure users can only access their own watchlist data.

API keys are stored as environment variables and are never exposed in the client-side application.

Required environment variables:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
FINNHUB_API_KEY=
ALPHA_VANTAGE_API_KEY=

Never commit .env.local or API keys to GitHub.

🚀 Getting Started
1. Clone the repository
git clone https://github.com/aaminafazlullah/smart-market-watchlist.git
cd smart-market-watchlist
2. Install dependencies
npm install
3. Configure environment variables

Create a .env.local file:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
FINNHUB_API_KEY=your_finnhub_api_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key
4. Start the development server
npm run dev

Open:

http://localhost:3000
5. Build for production
npm run build
📁 Project Structure
smart-market-watchlist/
│
├── public/
│   ├── dashboard.html
│   ├── login.html
│   ├── watchlist.html
│   └── stock-detail.html
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── market/
│   │   │       ├── change-score/
│   │   │       ├── events/
│   │   │       ├── history/
│   │   │       ├── news/
│   │   │       └── quote/
│   │   │
│   │   ├── login/
│   │   ├── stock/
│   │   │   └── [symbol]/
│   │   ├── watchlist/
│   │   └── page.tsx
│   │
│   └── lib/
│
├── package.json
├── next.config.ts
└── README.md
🎯 What Makes MarketWatch AI Different?

MarketWatch AI is not a stock price prediction system.

It focuses on a different problem:

Helping users understand when something meaningful has changed.

The Attention Score combines price, volume, news, and earnings signals into a single interpretable number while still showing the underlying reasons.

This makes the system useful for users who want to monitor their portfolio efficiently without manually checking every signal for every stock.

🔮 Future Improvements

Potential future improvements include:

Personalized attention thresholds
Historical Attention Score tracking
Push/email alerts for critical changes
More market data providers
Sector-level market activity
Portfolio-level attention summaries
More advanced anomaly detection
👩‍💻 Built For

CODE 2026 Hackathon

Built with a focus on:

Explainability • Market Awareness • Simplicity • Actionable Insights

📜 License

This project is developed as a hackathon project.