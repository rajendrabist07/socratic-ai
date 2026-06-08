# SocraticAI

An AI-powered Socratic tutor built with Next.js 15, tRPC, Prisma, Clerk, and Groq.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
Edit `.env.local` and fill in your keys:
- **DATABASE_URL** — PostgreSQL connection string (use [Neon](https://neon.tech) for free)
- **CLERK_*** — From [Clerk Dashboard](https://dashboard.clerk.com)
- **GROQ_API_KEY** — From [Groq Console](https://console.groq.com)

### 3. Push the database schema
```bash
npx prisma db push
```

### 4. Run the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
socratic-ai/
├── middleware.ts                        ← Clerk auth middleware
├── prisma/
│   └── schema.prisma                    ← DB schema (User, Session, Message)
└── src/
    ├── env.ts                           ← Zod-validated env vars
    ├── app/
    │   ├── layout.tsx                   ← Root layout (Clerk + tRPC providers)
    │   ├── dashboard/page.tsx           ← Protected dashboard
    │   ├── session/[id]/page.tsx        ← Protected session page
    │   └── api/trpc/[trpc]/route.ts     ← tRPC API handler
    ├── components/
    │   ├── chat/
    │   │   ├── ChatInput.tsx
    │   │   └── ChatMessageList.tsx
    │   └── thinking-map/
    │       └── ThinkingMap.tsx
    ├── server/
    │   ├── ai/groq-client.ts            ← Groq client + Socratic prompt
    │   ├── db/client.ts                 ← Prisma singleton
    │   ├── trpc.ts                      ← tRPC context + procedures
    │   └── routers/
    │       ├── _app.ts                  ← Root router
    │       ├── session.ts               ← Session CRUD
    │       └── chat.ts                  ← sendMessage mutation
    └── lib/
        ├── trpc.ts                      ← tRPC React client
        └── providers.tsx                ← QueryClient + tRPC provider
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run db:studio` | Open Prisma Studio |
