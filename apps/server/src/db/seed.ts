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
    title: "Built Together — 7 Days Through Ephesians",
    subtitle: "What God's design for the home actually looks like.",
    category: "marriage",
    totalDays: 7,
    description:
      "Seven days through Paul's vision of what it looks like when the gospel actually reshapes a home — the way you see each other, speak to each other, lead each other, and forgive each other. This is not easy devotional content. It is for families who want to be built on something that lasts.",
    days: [
      {
        dayNumber: 1,
        chapter: "Ephesians 1:3–6",
        theme: "Before you were born, you were chosen",
        reflectionQ1:
          "If you are honest about the way you see yourself on your worst day — do you actually live as though God chose you in love before the world existed, or do you treat your worth as something you have to keep earning?",
        reflectionQ2:
          "Who in your home needs to hear today that you are glad they are there?",
      },
      {
        dayNumber: 2,
        chapter: "Ephesians 1:15–19",
        theme: "Pray for the people God has given you",
        reflectionQ1:
          "When did you last pray specifically — by name, with a real request — for each person in your home, and if you cannot remember, what has been taking the place of that intercession in your life?",
        reflectionQ2:
          "Before you close this, pray through each person in your household by name.",
      },
      {
        dayNumber: 3,
        chapter: "Ephesians 2:4–9",
        theme: "You did not earn your way in",
        reflectionQ1:
          "Where in your home are you functioning more like a judge than someone who has been shown mercy — and what does the way you respond to your family's failures reveal about whether you have actually understood verse 8?",
        reflectionQ2:
          "Who in your home have you been hardest on this week — what is one thing you can do for them before this day is over?",
      },
      {
        dayNumber: 4,
        chapter: "Ephesians 2:19–22",
        theme: "Your home is a temple under construction",
        reflectionQ1:
          "What is actually being built in your home right now — and if someone outside could see the spiritual atmosphere in your house over the past week, would they see a household being built on Christ or one running on something else?",
        reflectionQ2:
          "Name one thing in your home that is not building anything — what is one decision you can make about it right now?",
      },
      {
        dayNumber: 5,
        chapter: "Ephesians 4:29–32",
        theme: "Your words are either building material or demolition tools",
        reflectionQ1:
          "Think back over the last week — what is the ratio between words in your home that built someone up and words that tore them down, and what does that ratio say about the atmosphere your family is actually living in?",
        reflectionQ2:
          "What is one thing you said this week in your home that you wish you could take back — and what would you say instead?",
      },
      {
        dayNumber: 6,
        chapter: "Ephesians 6:1–4",
        theme: "God put authority in the home for a reason",
        reflectionQ1:
          "If you are honest about how you exercise authority in your home — are you leading with instruction and purpose the way verse 4 describes, or have you been demanding obedience without modeling what you are asking your children to become?",
        reflectionQ2:
          "What is one quality you want your children to grow in — how will you show it to them today?",
      },
      {
        dayNumber: 7,
        chapter: "Ephesians 6:10–17",
        theme: "Your home is in a fight whether you know it or not",
        reflectionQ1:
          "Where in your home are you fighting flesh-and-blood battles — taking out on your family what is actually a spiritual attack — and what would it look like to start fighting the actual enemy instead of each other?",
        reflectionQ2:
          "What is one spiritual habit your home is missing — when and where will it happen?",
      },
    ],
  },
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
          "Set a timer for 10 minutes right now and pray through each line of the Lord's Prayer slowly — not as a recitation, but as an actual conversation.",
      },
      {
        dayNumber: 2,
        chapter: "Psalm 119:9–16",
        theme: "The Word that changes you",
        reflectionQ1:
          "If you are honest about your relationship with Scripture right now — are you reading it to check a box or actually expecting it to say something to you?",
        reflectionQ2:
          "Pick one verse from today's passage and write it somewhere you will see it before this day is over.",
      },
      {
        dayNumber: 3,
        chapter: "Matthew 6:16–18",
        theme: "What you hunger for",
        reflectionQ1:
          "What is the thing you reach for first when you feel anxious, bored, or stressed — and what would it reveal about your actual god if you went without it for a day?",
        reflectionQ2:
          "What is the one thing you reach for when you are stressed — can you go without it today?",
      },
      {
        dayNumber: 4,
        chapter: "John 4:19–24",
        theme: "Spirit and truth",
        reflectionQ1:
          "What does your worship look like when no one is watching — when there is no music, no crowd, no service — and does that private version match what you perform on Sunday?",
        reflectionQ2:
          "Before your next moment of worship, spend five minutes being honest with God about exactly where you are right now.",
      },
      {
        dayNumber: 5,
        chapter: "Mark 1:35–39",
        theme: "Before the day owns you",
        reflectionQ1:
          "Where in your schedule is there space for God to actually speak to you — or has your life become so full that the only time you are quiet is when you are asleep?",
        reflectionQ2:
          "Can you give God 20 minutes tomorrow morning before your phone — what would have to change tonight to make that happen?",
      },
      {
        dayNumber: 6,
        chapter: "Psalm 46:10",
        theme: "Be still and know",
        reflectionQ1:
          "What are you afraid would surface if you actually stopped the noise and sat in silence — and what does that fear tell you about what you are using activity to avoid?",
        reflectionQ2:
          "Identify one source of noise in your life and remove it for the rest of today.",
      },
      {
        dayNumber: 7,
        chapter: "Mark 2:23–28",
        theme: "Rest as an act of trust",
        reflectionQ1:
          "When was the last time you truly rested — not scrolled, not caught up, not been productive — and what does your inability to stop tell you about where you actually put your trust?",
        reflectionQ2:
          "What is one thing on your schedule today that God can handle without you — can you actually let it go?",
      },
      {
        dayNumber: 8,
        chapter: "1 John 1:8–10",
        theme: "The freedom of being known",
        reflectionQ1:
          "What is the thing you would be most ashamed for God to see clearly right now — and does the fact that it is still in the dark suggest you do not actually believe 1 John 1:9?",
        reflectionQ2:
          "Confess one specific thing right now — not a category, the actual thing by name — and sit with verse 9 until you believe it.",
      },
      {
        dayNumber: 9,
        chapter: "Mark 10:42–45",
        theme: "Greatness upside down",
        reflectionQ1:
          "Where in your relationships right now are you waiting to be served, recognized, or appreciated — and what would it look like to flip that expectation this week?",
        reflectionQ2:
          "Who in your life could use help today — what is one thing you can do for them without telling anyone?",
      },
      {
        dayNumber: 10,
        chapter: "2 Corinthians 9:6–8",
        theme: "You cannot outgive God",
        reflectionQ1:
          "If you are honest about your giving right now — is it generous or is it what you can spare after everything else — and what does that ratio say about where your security actually is?",
        reflectionQ2:
          "What is one thing you can give today that will actually cost you something?",
      },
      {
        dayNumber: 11,
        chapter: "Acts 2:42–47",
        theme: "You were not made to do this alone",
        reflectionQ1:
          "Do you have the kind of Christian community described in Acts 2 — people who know your actual life and not just your Sunday version — and if not, what has kept you from pursuing it?",
        reflectionQ2:
          "Who is one person from your church or faith community you have been meaning to connect with — reach out to them today.",
      },
      {
        dayNumber: 12,
        chapter: "Matthew 6:19–24",
        theme: "Where your treasure is",
        reflectionQ1:
          "Where in your life right now are you serving money instead of God — not dramatically, but in the small decisions about what you buy, what you keep, and what you will not give up?",
        reflectionQ2:
          "What is one thing you own or spend money on that has more control over you than it should — name it.",
      },
      {
        dayNumber: 13,
        chapter: "James 4:7–10",
        theme: "Humble yourself or be humbled",
        reflectionQ1:
          "Where in your life right now are you running your own kingdom instead of submitting to God's — what decision, relationship, or habit are you keeping out of his reach?",
        reflectionQ2:
          "What is one decision you are currently making without God — bring it to Him right now and ask what He would do.",
      },
      {
        dayNumber: 14,
        chapter: "Matthew 25:14–21",
        theme: "Do something with what you have been given",
        reflectionQ1:
          "What has God given you — gifts, opportunities, relationships, resources — that you have buried because you were afraid, comfortable, or waiting for better conditions?",
        reflectionQ2:
          "What is one thing God has put in your hands that you have not been faithful with — what is one step you can take today?",
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
        prayerPrompt: null,
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
