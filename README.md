# Personality Matrix

A **daily check-in** app that uses the [Personality Matrix](https://www.walkerjacob.com/blog/personality-matrix-design) design (3D atom-style core + orbitals) to track how you’re feeling, set goals, keep a diary, and see progress over time.

## What it does

- **Morning check-in** — Set a focus or intention, add today’s goals, rate how you feel on 8 dimensions (1–5), log sleep quality, and add an optional note.
- **Evening check-in** — Rate the same 8 dimensions again, mark goals done, rate day satisfaction (1–5), and add an evening note.
- **8 dimensions** — Energy, Mood, Focus, Calm, Motivation, Gratitude, Connection, Balance. Same for morning and evening so you can compare start vs end of day.
- **Goals** — Add goals in the morning; check them off in the evening. Progress view shows completion over the last 14 days.
- **Diary** — Freeform daily log: one text area per day for whatever you want to remember.
- **Progress** — Last 14 days: average ratings per dimension (morning vs evening), goal completion %, and **Stats** (sleep, readiness, steps).
- **Stats** — Per-day stats: Oura sleep score, readiness score, steps (and manual sleep quality from morning check-in).
- **Oura Ring** — In Progress, **Connect with Oura** (OAuth via Supabase) or paste a [Personal Access Token](https://cloud.ouraring.com/personal-access-tokens), then **Fetch last 14 days**. Best in the Electron app (avoids CORS).
- **3D matrix** — The atom visualization reflects whichever tab you’re on (morning or evening): core = focus, nodes = your ratings.

All data is stored in your browser (localStorage). No accounts, no backend. Oura token is stored locally and only sent to Oura when you click Fetch.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

**Oura OAuth:** Copy `.env.example` to `.env` and set `VITE_OURA_CLIENT_ID` and `VITE_OURA_OAUTH_CALLBACK_URL` (your Supabase Edge Function URL). Deploy the callback using the `supabase-oura` guide in the WalkerJacobBlog repo.

**Desktop (Electron):** `npm run electron:dev`  
**Build:** `npm run electron:build` → output in `dist-electron/`

## Tech

- **Vite** + **React** for the UI  
- **Three.js** + **React Three Fiber** for the 3D matrix  
- **Electron** for the desktop build  
- **localStorage** for all data  

Design inspired by the Personality Matrix blog post; this app is a daily reflection and progress tool.
