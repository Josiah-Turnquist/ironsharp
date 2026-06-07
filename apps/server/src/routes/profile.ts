import { Hono } from "hono";
import { eq, ilike, ne } from "drizzle-orm";
import { db } from "../db/index.js";
import { profiles } from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";

export const profile = new Hono<AppEnv>();

profile.use("*", requireAuth);

// GET /api/profile/search?q= → search users by display name (excludes self)
profile.get("/search", async (c) => {
  const userId = c.var.user.id;
  const q = c.req.query("q")?.trim() ?? "";
  if (q.length < 2) return c.json({ users: [] });

  const results = await db
    .select({
      userId: profiles.userId,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(ilike(profiles.displayName, `%${q}%`) && ne(profiles.userId, userId))
    .limit(10);

  return c.json({ users: results });
});

// GET /api/profile  → the current user's profile, created on first access.
// (Neon Auth owns the user record; we lazily materialize the app-side profile
// here instead of via a signup trigger.)
profile.get("/", async (c) => {
  const { id: userId, email, name } = c.var.user;

  const [existing] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  if (existing) return c.json({ profile: existing });

  const displayName = name?.trim() || email?.split("@")[0] || "Friend";
  const [created] = await db
    .insert(profiles)
    .values({ userId, displayName, primaryRole: "disciple" })
    .onConflictDoNothing()
    .returning();

  if (created) return c.json({ profile: created });

  // Lost a race — fetch the row the other request created.
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return c.json({ profile: row });
});

// POST /api/profile/redeem-promo → validate a promo code and upgrade membership
const PROMO_CODES: Record<string, string> = {
  IRONSHARP: "family",
  FOUNDING:  "family",
  SHARPEN:   "sharpen",
};

profile.post("/redeem-promo", async (c) => {
  const userId = c.var.user.id;
  const { code } = await c.req.json().catch(() => ({ code: "" }));
  const normalized = (code as string).trim().toUpperCase();
  const tier = PROMO_CODES[normalized];
  if (!tier) return c.json({ error: "Invalid promo code." }, 400);

  const [row] = await db
    .update(profiles)
    .set({ membershipTier: tier, updatedAt: new Date() })
    .where(eq(profiles.userId, userId))
    .returning();

  return c.json({ profile: row, tier });
});

// PATCH /api/profile  → update editable profile fields
profile.patch("/", async (c) => {
  const userId = c.var.user.id;
  const body = await c.req.json().catch(() => ({}));

  // Only allow a safe subset of fields to be written by the client.
  const updatable: Record<string, unknown> = {};
  const allow = [
    "displayName",
    "avatarUrl",
    "churchName",
    "primaryRole",
    "surveyName",
    "surveyAgeRange",
    "surveyState",
    "surveyCity",
    "surveyEducation",
    "surveyHasChurch",
    "surveyChurchName",
    "surveyDevotionalRating",
    "surveyFaithJourney",
    "surveyGoals",
    "surveyRelationshipStatus",
    "surveyHasKids",
  ] as const;
  for (const key of allow) {
    if (key in body) updatable[key] = body[key];
  }
  // Marking onboarding complete.
  if (body.surveyCompleted === true) {
    updatable.surveyCompletedAt = new Date();
  }
  updatable.updatedAt = new Date();

  // Try an update first; if no row exists yet (e.g. the GET lazily-create
  // never ran), fall back to an upsert so the client is never blocked.
  let [row] = await db
    .update(profiles)
    .set(updatable)
    .where(eq(profiles.userId, userId))
    .returning();

  if (!row) {
    const { email, name } = c.var.user;
    const displayName =
      (updatable.displayName as string | undefined) ??
      name?.trim() ??
      email?.split("@")[0] ??
      "Friend";
    [row] = await db
      .insert(profiles)
      .values({ userId, displayName, ...updatable })
      .onConflictDoUpdate({ target: profiles.userId, set: updatable })
      .returning();
  }

  return c.json({ profile: row });
});
