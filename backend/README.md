# PostPilot Backend

Multi-user, AI-powered LinkedIn auto-posting tool. Node.js + Express + MongoDB + Groq AI + LinkedIn Posts API. Each user signs up, connects their own LinkedIn account, and only ever sees their own posts.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `MONGO_URI` — MongoDB Atlas free tier connection string
   - `JWT_SECRET` — long random string, e.g. `openssl rand -hex 32`
   - `ADMIN_EMAIL` — optional; that LinkedIn email always becomes admin on first sign-in (the very first account ever created also becomes admin automatically, regardless of this setting)
   - `FRONTEND_URL` — your deployed frontend URL; LinkedIn's OAuth redirect lands on the backend, which then redirects the browser here with a session token
   - `GROQ_API_KEY` — free key from https://console.groq.com
   - `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` — from https://www.linkedin.com/developers/apps
     - Add the **"Share on LinkedIn"** product to your app (self-serve, no approval wait)
     - Redirect URL must exactly match `LINKEDIN_REDIRECT_URI`
3. `npm run dev` (or `npm start`)

## Accounts & LinkedIn connection

There's no separate signup form or password — **signing in with LinkedIn is the only way into the app**, and it's also how your account connects to LinkedIn at the same time. First-time sign-in creates the account automatically from your LinkedIn profile (name, email); every sign-in after that just logs you back in and refreshes your LinkedIn tokens. Nobody can see or post through anyone else's LinkedIn account — each user's tokens are matched to their own LinkedIn member ID.

The flow: `GET /api/auth/linkedin/login` (public, no token needed) redirects to LinkedIn's consent screen → LinkedIn redirects to `/api/auth/linkedin/callback` → the backend exchanges the code, finds-or-creates the User by LinkedIn member ID, and redirects the browser to `FRONTEND_URL/?token=<jwt>` → the frontend picks up that token and is logged in.

## Admin & bans

Whoever signs up first (or matches `ADMIN_EMAIL`) becomes an admin. Admins get an extra set of endpoints to list every user and ban/unban them:

| Endpoint | Method | What it does |
|---|---|---|
| `/api/admin/users` | GET | List all users, post counts, ban status |
| `/api/admin/users/:id/ban` | POST | Ban a user (optional `{ reason }` body) — they're immediately blocked from every authenticated route |
| `/api/admin/users/:id/unban` | POST | Restore access |

A banned user's LinkedIn sign-in still succeeds far enough to show them *why* they're banned (redirected with a reason), but every authenticated route rejects them with a 403 until an admin unbans them. Admins can't ban other admins or themselves.

## Core API (all require `Authorization: Bearer <token>` unless noted public)

| Endpoint | Method | What it does |
|---|---|---|
| `/api/auth/linkedin/login` | GET | Public. Redirects to LinkedIn's consent screen — this is the sign-in button's target |
| `/api/auth/linkedin/callback` | GET | Public. LinkedIn redirects here; finds-or-creates the user, then redirects to `FRONTEND_URL/?token=...` |
| `/api/users/me` | GET | Current user info |
| `/api/users/me/github` | PATCH | Save `{ username, token }` for weekly recap drafts |
| `/api/auth/linkedin/status` | GET | Whether the current user's LinkedIn is connected (effectively always true post-login, but token can expire) |
| `/api/posts/generate` | POST | Upload 0–9 images or one video + context/topic/link/tone + mode → AI generates caption, saves as draft (manual) or approved (auto) |
| `/api/posts/:id` | PATCH | Edit caption / link / status, or record manual `likes`/`comments` |
| `/api/posts/:id/regenerate` | POST | Re-run caption generation on the same inputs, optionally with a new `{ tone }` |
| `/api/posts/:id/schedule` | POST | Set `scheduledFor` datetime |
| `/api/posts/:id/post-now` | POST | Post immediately, skip scheduling |
| `/api/posts/:id/refresh-stats` | POST | Pull like/comment counts from LinkedIn (needs Community Management API access — see below) |
| `/api/posts` | GET | List the current user's posts (optional `?status=draft` filter) |
| `/api/posts/:id` | DELETE | Delete a post |
| `/api/posts/github-recap` | POST | Manually trigger a GitHub weekly-recap draft right now (for testing) |
| `/api/analytics/summary` | GET | Totals, best-performing post, and a likes-per-post series for charting |

## New features

**Caption regenerate + tone.** Every generate/regenerate call takes a `tone` (`authentic`, `casual`, `professional`, `technical`, `celebratory`) that changes the writing style instruction sent to the model. Regenerating re-uses the original image description/context/topic/link — it doesn't need the image re-uploaded.

**Analytics.** `getPostStats()` in `linkedinService.js` calls LinkedIn's `/rest/socialActions/{postUrn}` endpoint for like/comment counts. **This requires LinkedIn's separate Community Management API product**, which is an approval-gated application on LinkedIn's developer portal — it is *not* included in the self-serve "Share on LinkedIn" product this app otherwise uses, and approval isn't guaranteed for personal/hobby apps. If your app doesn't have it, `refresh-stats` returns a 403 with `accessDenied: true`, and the frontend falls back to a manual likes/comments entry field so analytics still works without that approval — you just type in what you see on LinkedIn yourself.

**Weekly GitHub recap.** Set a GitHub username (and optionally a personal access token, for higher rate limits or private-repo activity) under Settings. Every Sunday at 8pm server time, `processWeeklyRecaps()` in `scheduler.js` pulls each connected user's public push events since their last recap via GitHub's `/users/{username}/events/public` endpoint, summarizes the commit messages, and has the AI turn that into a draft LinkedIn post — landing in Drafts for review, never auto-published. Use "Generate recap now" in Settings to test it immediately instead of waiting for Sunday.

## Content types sent to LinkedIn

LinkedIn's `/rest/posts` schema allows exactly **one** attachment type per post. Priority when several are attached to the same draft: **link > video > images**.
- **Link attachment** (demo URL, GitHub repo, etc.) — if `linkUrl` is set on a post, it publishes as a link/article post. Any uploaded images/video stay attached in your dashboard for your own reference but are **not** sent to LinkedIn in this case (LinkedIn doesn't support combining a link preview with media in one post).
- **Video** — if a video is attached (and no link), it publishes as a native video post. Uploaded via LinkedIn's chunked Videos API (`/rest/videos`), capped at 200MB in this app (LinkedIn itself allows up to 500MB / ~10 min).
- **No link/video, 1 image** — single-image post.
- **No link/video, 2+ images** — multi-image carousel (LinkedIn supports up to 20; the UI caps uploads at 9).
- **GIF** — treated as an image by LinkedIn's API, goes through the same image upload path automatically.

LinkedIn does not support PDF/document carousels or polls via the public API, and doesn't support multiple separate links in one post — only one rich attachment slot exists.

## Modes

- **manual (Review Mode)**: AI generates a draft → sits until you approve/edit → then schedule or post-now
- **auto (Auto Mode)**: AI generates and is marked "approved" immediately → still needs a `scheduledFor` time to actually go out (safety: nothing posts without a time being set)

## Deploying to Render

1. Push this repo to GitHub
2. Render → New → Web Service → connect repo
3. Build command: `npm install` — Start command: `npm start`
4. Add all `.env` values as environment variables in Render's dashboard
5. **Note:** Render's free tier sleeps after ~15 min of inactivity. While asleep, the `node-cron` scheduler pauses too, so scheduled posts fire late (whenever the next request wakes the service). Fine for testing; if you need reliable on-time posting later, either upgrade the Render plan or switch to the external-cron approach using the `/api/check-scheduled-posts` endpoint (already built in, just needs an external pinger like cron-job.org hitting it every minute with the `x-cron-secret` header).

## LinkedIn API limits (as of 2026)

- ~100 posting calls/day per member — applies per connected LinkedIn account, not per app
- Access token expires in 60 days, refresh token in 365 days — refresh-token logic isn't automated yet, each user will need to manually reconnect via `/api/auth/linkedin/url` periodically
- No native scheduling on LinkedIn's side — this is why we handle it ourselves via cron + MongoDB
