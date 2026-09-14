# PostPilot

Multi-user, AI-powered LinkedIn auto-posting tool. Each person signs up, connects their own LinkedIn account, and manages their own queue. The first account (or one matching `ADMIN_EMAIL`) becomes an admin who can ban/unban other users. Two separate apps in one repo — deploy each on its own (backend to Render, frontend to Vercel).

```
postpilot/
├── backend/   Node/Express + MongoDB + Groq AI + LinkedIn API + cron scheduler
└── frontend/  React + Vite + Tailwind dashboard
```

## Backend

```
cd backend
npm install
cp .env.example .env   # fill in MONGO_URI, GROQ_API_KEY, LINKEDIN_*, CRON_SECRET
npm run dev
```

Deploy to Render: see `backend/README.md`.

## Frontend

```
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL to your backend URL
npm run dev
```

Deploy to Vercel: see `frontend/README.md`.

## Local dev

Run both at once from the `postpilot/` root in two terminals:

```
cd backend && npm run dev     # http://localhost:5000
cd frontend && npm run dev    # http://localhost:5173, VITE_API_URL=http://localhost:5000
```
# PostPilot
# PostPilot
# PostPilot
