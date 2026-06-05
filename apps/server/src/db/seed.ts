import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "./index.js";
import { devotionalPlans, devotionalDays } from "./schema.js";

type DaySeed = {
  dayNumber: number;
  chapter: string;
  theme?: string;
  reflectionQ1: string;
  reflectionQ2: string;
  prayerPrompt?: string;
};

type PlanSeed = {
  title: string;
  subtitle?: string;
  category: string;
  totalDays: number;
  description: string;
  days: DaySeed[];
};

const PLANS: PlanSeed[] = [
  {
    title: "Formed — 14 Days of Spiritual Discipline",
    subtitle: "Train yourself for godliness.",
    category: "general",
    totalDays: 14,
    description:
      "A 14-day plan through the core disciplines that shape the soul — not as rules to follow but as practices that position you to be changed by God. Each day targets one discipline, gives you the passage that grounds it, and asks the questions that make it personal.",
    days: [
      {
        dayNumber: 1,
        chapter: "Matthew 6:5–13",
        theme: "Talk to God like He's actually there",
        reflectionQ1:
          "Where in your life right now are you going through the motions of prayer without actually expecting God to respond?",
        reflectionQ2:
          "Set a timer for 10 minutes today — no requests, no lists — just sit with God using the structure of verses 9–13 and see what comes up.",
        prayerPrompt:
          "Pray through each line of the Lord's Prayer slowly — not as a recitation, but as a real conversation. Where do you get stuck? Tell God about that.",
      },
      {
        dayNumber: 2,
        chapter: "Psalm 119:9–16",
        theme: "The Word that changes you",
        reflectionQ1:
          "If you are honest about your relationship with Scripture right now — are you reading it to check a box or actually expecting it to say something to you?",
        reflectionQ2:
          "Pick one verse from this passage and carry it with you today — write it somewhere you will see it three times, and ask what it means for one specific decision you are facing this week.",
        prayerPrompt:
          "Ask God to make one verse from today's passage land differently than it ever has before. Then sit in silence long enough to hear if He answers.",
      },
      {
        dayNumber: 3,
        chapter: "Matthew 6:16–18",
        theme: "What you hunger for",
        reflectionQ1:
          "What is the thing you reach for first when you feel anxious, bored, or stressed — and what would it reveal about your actual god if you went without it for a day?",
        reflectionQ2:
          "Fast from something for 24 hours this week — food, social media, coffee, or whatever you would miss most — and when the craving hits, turn it into a prayer instead of giving in.",
        prayerPrompt:
          "Tell God specifically what you are hungry for today — not spiritually vague, but actually honest — and ask Him to be enough in that exact place.",
      },
      {
        dayNumber: 4,
        chapter: "John 4:19–24",
        theme: "Spirit and truth",
        reflectionQ1:
          "What does your worship look like when no one is watching — when there is no music, no crowd, no service — and does that private version match what you perform on Sunday?",
        reflectionQ2:
          "Before your next church service or worship time, spend five minutes beforehand being honest with God about exactly where you are — not where you want to appear to be.",
        prayerPrompt:
          "Worship God right now for one thing about His character that has nothing to do with what He has done for you lately — praise Him for who He is, not what He has given.",
      },
      {
        dayNumber: 5,
        chapter: "Mark 1:35–39",
        theme: "Before the day owns you",
        reflectionQ1:
          "Where in your schedule is there space for God to actually speak to you — or has your life become so full that the only time you are quiet is when you are asleep?",
        reflectionQ2:
          "Wake up 20 minutes earlier tomorrow and sit in silence before your phone — no podcast, no news, no plan — just be with God and see what he surfaces.",
        prayerPrompt:
          "Give God your schedule for today — not asking Him to bless it, but actually asking Him what He would change about it and being willing to hear the answer.",
      },
      {
        dayNumber: 6,
        chapter: "Psalm 46:10",
        theme: "Be still and know",
        reflectionQ1:
          "What are you afraid would surface if you actually stopped the noise and sat in silence — and what does that fear tell you about what you are using activity to avoid?",
        reflectionQ2:
          "Identify one recurring source of noise in your life — a habit, a screen, a background sound — and remove it for the rest of today, paying attention to what comes up in the quiet.",
        prayerPrompt:
          "Sit in silence for two minutes before you pray anything. Just let God be God. Then tell Him what surfaced in that silence.",
      },
      {
        dayNumber: 7,
        chapter: "Mark 2:23–28",
        theme: "Rest as an act of trust",
        reflectionQ1:
          "When was the last time you truly rested — not scrolled, not caught up, not been productive — and what does your inability to stop tell you about where you actually put your trust?",
        reflectionQ2:
          "Choose one day this week to practice sabbath — define what rest means for you, protect it from intrusion, and notice what it feels like to stop and trust God with what does not get done.",
        prayerPrompt:
          "Thank God for one thing today that got done without you — something He sustained while you slept, something He held while you were distracted. Praise Him for it.",
      },
      {
        dayNumber: 8,
        chapter: "1 John 1:8–10",
        theme: "The freedom of being known",
        reflectionQ1:
          "What is the thing you would be most ashamed for God to see clearly right now — and does the fact that it is still in the dark suggest you do not actually believe 1 John 1:9?",
        reflectionQ2:
          "Confess one specific thing today — not a category, not 'I have been struggling' — but an actual thing, by name, to God, and then sit with verse 9 until you believe it.",
        prayerPrompt:
          "Bring the one thing into the light right now — say it out loud to God by name — and then receive verse 9 as a promise spoken directly to you.",
      },
      {
        dayNumber: 9,
        chapter: "Mark 10:42–45",
        theme: "Greatness upside down",
        reflectionQ1:
          "Where in your relationships right now are you waiting to be served, recognized, or appreciated — and what would it look like to flip that expectation this week?",
        reflectionQ2:
          "Identify one person in your life who could use help this week and do something for them without telling anyone about it — and pay attention to how that feels.",
        prayerPrompt:
          "Ask God to show you one person He has placed in your life specifically so you can serve them — and ask Him to make you willing to do it without needing credit.",
      },
      {
        dayNumber: 10,
        chapter: "2 Corinthians 9:6–8",
        theme: "You cannot outgive God",
        reflectionQ1:
          "If you are honest about your giving right now — is it generous or is it what you can spare after everything else — and what does that ratio say about where your security actually is?",
        reflectionQ2:
          "Give something this week that costs you something — money, time, or a specific act of service — and do it before you feel ready or comfortable, because the discipline is in the act, not the feeling.",
        prayerPrompt:
          "Thank God for one specific way He has been generous to you that you did not deserve — and ask Him to make that generosity the reason you give, not obligation.",
      },
      {
        dayNumber: 11,
        chapter: "Acts 2:42–47",
        theme: "You were not made to do this alone",
        reflectionQ1:
          "Do you have the kind of Christian community described in Acts 2 — people who know your actual life and not just your Sunday version — and if not, what has kept you from pursuing it?",
        reflectionQ2:
          "Reach out this week to one person from your church or faith community and make a plan to actually be together — not to talk about being together, but to do it.",
        prayerPrompt:
          "Ask God to put one name on your heart right now — someone you are supposed to be walking with — and tell Him honestly what has stopped you from going deeper with that person.",
      },
      {
        dayNumber: 12,
        chapter: "Matthew 6:19–24",
        theme: "Where your treasure is",
        reflectionQ1:
          "Where in your life right now are you serving money instead of God — not dramatically, but in the small decisions about what you buy, what you keep, and what you will not give up?",
        reflectionQ2:
          "Identify one thing you own or spend money on that has more control over you than it should — and make a decision about it this week, even if that decision is just to be honest about it with someone.",
        prayerPrompt:
          "Tell God honestly what you are holding onto too tightly — and ask Him to loosen your grip, even if that scares you.",
      },
      {
        dayNumber: 13,
        chapter: "James 4:7–10",
        theme: "Humble yourself or be humbled",
        reflectionQ1:
          "Where in your life right now are you running your own kingdom instead of submitting to God's — what decision, relationship, or habit are you keeping out of his reach?",
        reflectionQ2:
          "Identify one area where you have been operating independently from God and bring it to him in prayer today — not asking him to bless your plan, but genuinely asking what his plan is.",
        prayerPrompt:
          "Surrender one specific thing to God right now — say it plainly — and ask Him to do whatever He needs to do in that area, even if it is not what you want.",
      },
      {
        dayNumber: 14,
        chapter: "Matthew 25:14–21",
        theme: "Do something with what you have been given",
        reflectionQ1:
          "What has God given you — gifts, opportunities, relationships, resources — that you have buried because you were afraid, comfortable, or waiting for better conditions?",
        reflectionQ2:
          "Name one thing God has entrusted to you that you have not been faithful with, and take one concrete step toward faithfulness in that area this week — not a plan, an actual step.",
        prayerPrompt:
          "Thank God for what He has put in your hands — and ask Him to make you faithful with it, not impressive, just faithful.",
      },
    ],
  },
];

async function seed() {
  if (PLANS.length === 0) {
    console.log("No plans to seed.");
    return;
  }

  console.log("🌱 Seeding devotional plans…");
  for (const plan of PLANS) {
    const existing = await db
      .select({ id: devotionalPlans.id })
      .from(devotionalPlans)
      .where(eq(devotionalPlans.title, plan.title))
      .limit(1);

    if (existing.length > 0) {
      console.log(`   • "${plan.title}" already seeded — skipping.`);
      continue;
    }

    const [inserted] = await db
      .insert(devotionalPlans)
      .values({
        title: plan.title,
        subtitle: plan.subtitle,
        category: plan.category,
        totalDays: plan.totalDays,
        description: plan.description,
      })
      .returning({ id: devotionalPlans.id });

    if (!inserted) throw new Error(`Failed to insert plan ${plan.title}`);

    await db.insert(devotionalDays).values(
      plan.days.map((d) => ({
        planId: inserted.id,
        dayNumber: d.dayNumber,
        chapter: d.chapter,
        theme: d.theme,
        reflectionQ1: d.reflectionQ1,
        reflectionQ2: d.reflectionQ2,
        prayerPrompt: d.prayerPrompt,
      }))
    );

    console.log(`   ✓ "${plan.title}" (${plan.days.length} days)`);
  }
  console.log("✅ Seed complete.");
}

seed()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
