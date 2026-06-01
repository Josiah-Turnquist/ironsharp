# Deploying IronSharp (Neon + Railway)

This walks through standing up the database (Neon) and the API server (Railway),
then pointing the mobile app at it. ~15 minutes.

> 🔒 **Secrets:** never paste `DATABASE_URL` or `BETTER_AUTH_SECRET` into chat,
> commits, or screenshots. They live only in Railway variables / local `.env`
> files (both are git-ignored).

---

## 1. Neon — the database

1. Go to <https://console.neon.tech> → **New Project**.
   - Name: `ironsharp`. Pick a region close to where Railway runs (e.g. US East).
2. After it's created, open **Connection Details**.
3. Copy the **pooled** connection string (the host contains `-pooler`). It looks like:
   ```
   postgresql://user:password@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   Keep it handy — this is your `DATABASE_URL`.

That's all on Neon for now. Tables get created in step 3.

---

## 2. Railway — the API server

1. Go to <https://railway.app> → **New Project** → **Deploy from GitHub repo** →
   pick `Josiah-Turnquist/ironsharp`.
2. Open the service → **Settings**:
   - **Root Directory:** `apps/server`
     (this is the monorepo bit — Railway then builds only the server.)
   - Build/start are already defined in `apps/server/railway.json`, so leave
     "Custom Build/Start Command" empty.
3. Open **Variables** and add just these:

   | Variable             | Value                                                        |
   | -------------------- | ------------------------------------------------------------ |
   | `DATABASE_URL`       | the pooled Neon string from step 1                           |
   | `BETTER_AUTH_SECRET` | a long random secret (see below)                             |
   | `BETTER_AUTH_URL`    | _leave blank for now — set in step 4_                        |

   `PORT` is injected by Railway automatically — don't set it. The app's trusted
   origins (its `ironsharp://` / `exp://` schemes) are baked into the code, so
   there's nothing else to configure.

   `DATABASE_URL` and `BETTER_AUTH_SECRET` are the only two secrets. Generate the
   secret with:
   ```bash
   openssl rand -base64 32
   ```
4. Let it deploy. Then **Settings → Networking → Generate Domain**. You'll get a
   URL like `https://ironsharp-production.up.railway.app`.
   - Set `BETTER_AUTH_URL` to that exact URL and redeploy.
   - Visit `https://<that-domain>/health` — you should see `{"ok":true}`.

---

## 3. Create tables + load devotional content

Use the Railway CLI so these commands run with the deployed `DATABASE_URL`
(no copying secrets around):

```bash
npm i -g @railway/cli
railway login
railway link              # pick the ironsharp project + server service
railway run npm run db:push   # creates all tables in Neon
railway run npm run db:seed   # loads the 3 starter plans (21 days)
```

> Prefer to run locally instead? Put `DATABASE_URL` in `apps/server/.env` and run
> the same two npm scripts from `apps/server`.

---

## 4. Point the app at the server

In `apps/mobile/.env`:

```bash
EXPO_PUBLIC_API_URL="https://<your-railway-domain>"
```

Restart Expo (`npm start`) so it picks up the new value. Sign up — the request
goes to Railway, Better Auth writes to Neon, and your profile is created.

> For purely local development you can instead run `apps/server` on your machine
> (`npm run dev`) and set `EXPO_PUBLIC_API_URL` to `http://<your-LAN-IP>:8787`.

---

## 5. (Optional) Google / Apple sign-in

The social buttons stay inert until you add provider keys to the Railway
variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`,
`APPLE_CLIENT_SECRET`. The server detects them and enables each provider
automatically on the next deploy.
