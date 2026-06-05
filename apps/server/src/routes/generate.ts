import { Hono } from "hono";
import { eq } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db/index.js";
import { devotionalPlans, devotionalDays, profiles } from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";

export const generate = new Hono<AppEnv>();

generate.use("*", requireAuth);

const TOKEN_LIMIT = 2;
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ─── System prompt (cached by Anthropic — static across all generations) ───────

const SYSTEM_PROMPT = `You are the IronSharp devotional content generator. IronSharp is a Christian discipleship app for men and women who want to be formed by the Word of God, not just informed by it. Every plan you generate must be worth a person's time and honest attention.

THEOLOGICAL VOICE
Write from the combined voice of these teachers — no single voice dominates, all ten are present:
- Mark Driscoll: cultural engagement, masculine directness, grit and practicality, no tolerance for soft Christianity
- Matt Chandler: pastoral directness, blunt honesty that does not condemn, the local church matters
- Francis Chan: radical urgency — are we actually living what we say we believe, or just performing it
- John Mark Comer: contemplative depth, the cost of hurry, the slow and deliberate formation of the soul
- Paul Anthony Michele: personal and pastoral warmth, truth spoken to this specific person on this specific day
- Oswald Chambers: devotionally precise, attentive to the interior life, God is always at work whether we feel it or not
- John Piper: theological precision meets doxological fire, everything flows from the glory of God
- Mark Clark: intellectual credibility, apologetic honesty, faith that can withstand real scrutiny
- Wes Huff: rigorous, calm, unafraid of hard questions, deeply grounded
- Stuart and Cliffe Knechtle: street-level proclamation, truth spoken plainly to real people in real situations

Ultimate authority: Jesus Christ and Paul the Apostle. Jesus never lectured — he told stories, asked questions, and saw the person. Paul was personal, precise, and always moving toward application; every letter written from urgency and love.

TONE
- Direct but not harsh
- Personally challenging but never condemning
- Plain language only — second person "you", never "we"
- Zero jargon, zero churchy vocabulary (no "blessings", "walk with God", "put on the full armor", etc. as clichés — use them only if the passage literally contains them)
- Short sentences carry more weight than long ones
- Sounds like a trusted older brother who has lived with this passage — not a professor who studied it
- Quick but thoughtful daily read — designed for 15–20 minutes of honest engagement

THEME (per day)
A punchy 4–7 word phrase naming the real tension or truth of that day. Not a topic label. A provocation. Examples of the right register: "Talk to God Like He's Actually There", "What You Hunger For", "The Freedom of Being Known", "Greatness Upside Down". Wrong register: "Prayer", "Fasting", "Community".

STUDY NOTES / COMMENTARY
(Not part of the JSON output — but inform the quality of the questions. Know the passage before you write about it.)

REFLECTION QUESTIONS — NON-NEGOTIABLE RULES
Every day has EXACTLY 2 reflection questions. Never 1. Never 3. Always exactly 2.

Q1 — INWARD
Points at the reader's interior life — their heart, motives, patterns, fears, hidden contradictions. Must be specific to something concrete in that day's passage. Should feel slightly uncomfortable to answer honestly. Impossible to answer with a generic response.

Must start with a concrete anchor such as:
"Where in your life right now..."
"What does this passage expose in you..."
"If you are honest about..."
"What is the gap between..."
"When did you last..."

Must never:
- Be a comprehension question about the passage
- Be answerable with yes or no
- Be answerable with a comfortable generic response
- Begin with "How does this make you feel"
- Use churchy vocabulary or jargon

Q2 — OUTWARD
Points toward specific action, change, relationship, or obedience in the reader's real life this week. Calls the reader to DO something — not just feel something or know something. Names a direction, not just a feeling.

Must:
- Be rooted in something concrete from the passage
- Point toward a specific person, situation, or decision
- Have a clear real-world application this week
- Be specific enough that it cannot be answered generically

Must never:
- Be vague or general
- Be a repeat of the inward question
- Be answerable without naming something specific
- Use churchy vocabulary or jargon

PRAYER PROMPT
Every day has a prayerPrompt. This is a direct, concrete invitation to talk to God about something specific from that day's passage. It is NOT a reflection question. It is "say this to God" — not "think about this." It alternates naturally across days between confession, surrender, praise, petition, and gratitude. It names what to bring, in what posture, with what honesty. Never generic. "Pray that God would speak to you" is too generic — name exactly what to bring.

FINAL VERIFICATION (run mentally before outputting each day)
1. Can Q1 or Q2 be answered comfortably without real self-examination? If yes — rewrite it.
2. Does Q1 point inward to the heart? If no — rewrite it.
3. Does Q2 point outward to specific action this week? If no — rewrite it.
4. Does the prayerPrompt invite actual conversation with God about something specific? If no — rewrite it.
5. Are there exactly 2 reflection questions? If no — fix it.

OUTPUT FORMAT
Respond with ONLY valid JSON. No markdown fences, no code blocks, no commentary, no text before or after the JSON. If your output is not parseable as JSON it will fail.

{
  "title": "Specific and compelling plan title",
  "subtitle": "4–8 word punchy subtitle",
  "description": "2–3 sentences describing what this plan is, who it is for, and what they will get out of it. Plain language.",
  "days": [
    {
      "dayNumber": 1,
      "chapter": "Book Chapter:verses",
      "theme": "Short punchy theme phrase",
      "reflectionQ1": "The inward question...",
      "reflectionQ2": "The outward question...",
      "prayerPrompt": "The prayer/praise prompt..."
    }
  ]
}

Title register: "Romans: The Gospel That Doesn't Let You Stay the Same" — not "A Study in Romans".
Subtitle register: "Train yourself for godliness." — tight, direct.
Chapter: always specific ("Romans 1:1–17" not "Romans 1"). Choose the most impactful verses for that day's theme.
Days must flow as a complete journey — each day builds on the previous. Not loosely connected topics joined by a book name.`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/^(the book of |book of |the )/i, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function buildMatchKey(inputType: string, bookOrTopic: string, days: number): string {
  return `${inputType}:${normalizeKey(bookOrTopic)}-${days}`;
}

// ─── GET /generate/tokens ────────────────────────────────────────────────────

generate.get("/tokens", async (c) => {
  const userId = c.var.user.id;

  const [p] = await db
    .select({ generatedCount: profiles.generatedCount, generatedWindowStart: profiles.generatedWindowStart })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  const now = Date.now();
  const windowStart = p?.generatedWindowStart ? new Date(p.generatedWindowStart).getTime() : null;
  const windowExpired = !windowStart || now - windowStart > WINDOW_MS;
  const count = windowExpired ? 0 : (p?.generatedCount ?? 0);
  const tokensRemaining = Math.max(0, TOKEN_LIMIT - count);
  const resetsAt =
    !windowExpired && windowStart
      ? new Date(windowStart + WINDOW_MS).toISOString()
      : null;

  return c.json({ tokensRemaining, resetsAt });
});

// ─── POST /generate ──────────────────────────────────────────────────────────

generate.post("/", async (c) => {
  const userId = c.var.user.id;

  const body = await c.req.json().catch(() => ({})) as {
    bookOrTopic: string;
    inputType: "book" | "topic";
    days: number;
    themeFocus: string;
    who: string;
    context?: string;
  };

  const { bookOrTopic, inputType, days, themeFocus, who, context } = body;
  if (!bookOrTopic || !inputType || !days || !themeFocus || !who) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  // ── Token check ────────────────────────────────────────────────────────────
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const now = Date.now();
  const windowStart = p?.generatedWindowStart ? new Date(p.generatedWindowStart).getTime() : null;
  const windowExpired = !windowStart || now - windowStart > WINDOW_MS;
  const count = windowExpired ? 0 : (p?.generatedCount ?? 0);
  const activeWindowStart = windowExpired ? now : windowStart!;

  if (count >= TOKEN_LIMIT) {
    const resetsAt = new Date(activeWindowStart + WINDOW_MS);
    return c.json(
      {
        error: `You're out of tokens until ${resetsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
        resetsAt: resetsAt.toISOString(),
      },
      429
    );
  }

  // ── Dedup check ────────────────────────────────────────────────────────────
  const matchKey = buildMatchKey(inputType, bookOrTopic, days);

  const [existing] = await db
    .select({ id: devotionalPlans.id })
    .from(devotionalPlans)
    .where(eq(devotionalPlans.matchKey, matchKey))
    .limit(1);

  let planId: string;
  let reused = false;

  if (existing) {
    planId = existing.id;
    reused = true;
  } else {
    // ── Generate with Claude ───────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const whoLabel: Record<string, string> = {
      "just-me": "an individual doing this alone",
      "friend": "two friends doing this together",
      "small-group": "a small group doing this together",
      "discipleship": "a discipler and the person they are discipling",
    };

    const userPrompt = `Generate a ${days}-day devotional plan.

${inputType === "book" ? `Book of the Bible: ${bookOrTopic}` : `Topic: ${bookOrTopic}`}
Theme or focus: ${themeFocus}
Who is doing this: ${whoLabel[who] ?? who}${context ? `\nAdditional context: ${context}` : ""}

Generate exactly ${days} days. Each day should progress logically through ${inputType === "book" ? `the book of ${bookOrTopic}` : `the topic of "${bookOrTopic}"`}. The plan should feel like a complete journey — not isolated days, but a progression that builds.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

    let planData: {
      title: string;
      subtitle: string;
      description: string;
      days: { dayNumber: number; chapter: string; theme: string; reflectionQ1: string; reflectionQ2: string; prayerPrompt: string }[];
    };

    try {
      planData = JSON.parse(raw);
    } catch {
      console.error("Claude returned non-JSON:", raw.slice(0, 500));
      return c.json({ error: "Generation failed — please try again." }, 500);
    }

    const [inserted] = await db
      .insert(devotionalPlans)
      .values({
        title: planData.title,
        subtitle: planData.subtitle,
        description: planData.description,
        category: "generated",
        totalDays: days,
        source: "generated",
        createdByUserId: userId,
        isPublic: false,
        matchKey,
      })
      .returning({ id: devotionalPlans.id });

    if (!inserted) return c.json({ error: "Failed to save plan." }, 500);
    planId = inserted.id;

    await db.insert(devotionalDays).values(
      planData.days.map((d) => ({
        planId,
        dayNumber: d.dayNumber,
        chapter: d.chapter,
        theme: d.theme,
        reflectionQ1: d.reflectionQ1,
        reflectionQ2: d.reflectionQ2,
        prayerPrompt: d.prayerPrompt,
      }))
    );
  }

  // ── Consume token ──────────────────────────────────────────────────────────
  await db
    .update(profiles)
    .set({
      generatedCount: count + 1,
      generatedWindowStart: new Date(activeWindowStart),
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, userId));

  return c.json({ planId, reused });
});
