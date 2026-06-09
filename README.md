# SocraticAI

SocraticAI is a chat-first learning assistant that uses Socratic questioning to help you think more deeply and learn through dialogue. It is designed to feel like a modern AI study partner: ask a question, receive a guided response, and continue the conversation.

## What This App Is

SocraticAI is not just another chatbot. It is a guided reasoning platform built for questions, follow-up reflections, and step-by-step learning.

### Key capabilities

- Chat-based sessions for asking questions and receiving AI-guided replies.
- Socratic-style responses that encourage deeper thinking instead of simply giving direct answers.
- Persisted sessions and messages using MongoDB.
- Secure authentication using Clerk.
- A polished frontend built with Next.js and Tailwind CSS.

## Technologies

- `Next.js 15` (App Router)
- `TypeScript`
- `Tailwind CSS`
- `tRPC`
- `Prisma` + `MongoDB`
- `Clerk` for auth
- `Groq AI SDK` for conversational reasoning

## How It Works

1. The user creates a new session with a title and topic.
2. The app stores the session in MongoDB.
3. The user asks questions inside the session chat.
4. Each message is saved to the session history.
5. The backend sends chat history to the Groq AI engine for a Socratic-style response.
6. The assistant reply is stored and shown in the chat.

## Live Chat Experience

This app now includes a real chat workflow for each session. When you open a session, you can:

- type questions in the chat box,
- submit them as part of the same conversation,
- see AI replies rendered like chat bubbles,
- continue asking follow-up questions.

That means the app behaves more like a world-class AI chat assistant, not just a static session viewer.

## Getting Started

### Install dependencies

```bash
npm install
```

### Configure environment

Copy the example file and add your keys:

```bash
cp .env.example .env.local
```

Then set the following values in `.env.local`:

- `DATABASE_URL` — your MongoDB connection string
- `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` — from Clerk
- `GROQ_API_KEY` — from Groq AI
- `GROQ_MODEL` — set to a supported Groq model such as `gemma-7b-it`

> Make sure `GROQ_API_KEY` is not a placeholder. If it is still `gsk_REPLACE_ME`, the AI chat will fail with 401 invalid API key.
> Also make sure `GROQ_MODEL` is not set to the decommissioned `llama3-8b-8192` or `mixtral-8x7b-32768` model.

### Run locally

```bash
npm run dev
```

Open the app at:

`http://localhost:3000`

### Build for production

```bash
npm run build
npm run start
```

## Project Structure

```
socratic-ai/
├── README.md
├── middleware.ts
├── next.config.ts
├── prisma/
│   └── schema.prisma
├── public/
│   ├── favicon.svg
│   └── socraticai-logo.svg
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── session/new/page.tsx
│   │   ├── session/[id]/page.tsx
│   │   └── api/trpc/[trpc]/route.ts
│   ├── components/
│   │   ├── Nav.tsx
│   │   └── chat/
│   │       ├── ChatInput.tsx
│   │       ├── ChatMessageList.tsx
│   │       └── SessionChat.tsx
│   ├── lib/
│   │   ├── providers.tsx
│   │   └── trpc.ts
│   └── server/
│       ├── db/client.ts
│       ├── trpc.ts
│       ├── ai/groq-client.ts
│       └── routers/
│           ├── _app.ts
│           ├── session.ts
│           ├── chat.ts
│           └── message.ts
```

## Backend Architecture

- `src/server/ai/groq-client.ts` constructs the Socratic prompt and sends conversation history to the Groq AI model.
- `src/server/routers/chat.ts` saves user messages and assistant replies.
- `src/server/routers/session.ts` creates sessions and returns full session chat history.
- `src/lib/trpc.ts` exposes tRPC procedures on the client side.

## GitHub and Export Notes

This project is ready to publish on GitHub. Use the `README.md` as the main project documentation for reviewers and collaborators.

### Basic git workflow

```bash
git init
git add .
git commit -m "Initial SocraticAI project"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### Why this README matters

A strong README helps engineers, product owners, and peers understand:

- what the app does,
- how the chat flow works,
- what technologies are used,
- how to run it locally,
- and how to deploy it successfully.

## Recommended Improvements

- Add a secondary AI response mode that provides both direct answers and Socratic guidance.
- Show session progress metrics and message counts in the dashboard.
- Improve localization for Nepali and English.
- Add tests for the chat flow and API procedures.

## Summary

SocraticAI is a professional, world-class AI study assistant built around chat sessions. It is designed to deliver a polished chat interface, clean project structure, and strong GitHub documentation for export and collaboration.
