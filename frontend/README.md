# PostPilot Frontend

Control-tower dashboard for the PostPilot backend — generate LinkedIn captions from an image, review or auto-approve them, schedule, and track their status.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and point it at your backend:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```
3. `npm run dev`

## Views

- **Compose** — drop/select an image, add context and a topic, choose Review or Auto mode, generate a caption.
- **Drafts** — edit generated captions, approve, schedule, or post immediately.
- **Scheduled** — posts waiting for their `scheduledFor` time (handled by the backend's cron).
- **Posted** — history of what's gone live.
- **Failed** — posts that errored, with the reason shown; you can edit and retry with Post now.

The top bar shows whether a LinkedIn account is connected; if not, "Connect LinkedIn" opens the backend's OAuth flow in a new tab.

## Deploying to Vercel

```
npm i -g vercel
vercel
```

Set `VITE_API_URL` as an environment variable in the Vercel project settings to your deployed backend URL. A `vercel.json` rewrite is included so client-side routing (if added later) doesn't 404 on refresh.
