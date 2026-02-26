# Weekly Campaign Planner

Multi-client SaaS application for automated weekly campaign nominations. Reads live data from Google Sheets, uses OpenAI LLM as a controlled planning engine, and writes nominations back to the client's Google Sheet.

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **NextAuth v5** with Google OAuth
- **PostgreSQL** via Prisma ORM (Vercel Postgres / Neon)
- **Google Sheets API** (Service Account)
- **OpenAI** (GPT-4o / GPT-4o-mini)
- **Tailwind CSS + shadcn/ui**

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Google Cloud project with Sheets API enabled
- Google OAuth credentials (for user login)
- Google Service Account (for Sheets read/write)
- OpenAI API key

### Setup

1. Clone and install:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Fill in `.env` with your credentials.

4. Generate Prisma client and run migrations:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```

### Google Service Account Setup

1. Create a Service Account in Google Cloud Console
2. Download the JSON key file
3. Copy the `client_email` to `GOOGLE_SERVICE_ACCOUNT_EMAIL`
4. Copy the `private_key` to `GOOGLE_PRIVATE_KEY`
5. Share each client Google Sheet with the Service Account email (as Editor)

## Architecture

### LLM Pipeline (5 modules)

1. **Campaign Interpreter** — Parses MASTER sheet rows into structured campaign definitions
2. **Data Signal Synthesizer** — Aggregates product/brand sales into scoring signals
3. **Product Selector** — Assigns products to campaigns respecting hard rules and soft scoring
4. **Risk Auditor** — Audits nominations for risks (unknown stock, duplicates, fatigue)
5. **Nomination Writer** — Formats final rows for the NEXT WEEK sheet

### Run Modes

- **Dry Run** — Generates nomination preview without writing to Sheet
- **Generate & Write** — Full run with Sheet write + RUN_LOG audit entry

## Deployment

Deploy to Vercel:

```bash
vercel
```

Set all environment variables in the Vercel dashboard.
