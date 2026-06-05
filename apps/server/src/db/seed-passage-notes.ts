import "dotenv/config";
import { eq, and } from "drizzle-orm";
import { db, pool } from "./index.js";
import { passageNotes } from "./schema.js";

type StudyNote = { verse_ref: string; note: string };

type PassageNoteSeed = {
  book: string;
  chapter: number;
  passageReference: string;
  context?: string;
  notes: StudyNote[];
};

const PASSAGE_NOTES: PassageNoteSeed[] = [
  {
    book: "Matthew",
    chapter: 6,
    passageReference: "Matthew 6:5–24",
    context:
      "Jesus is on a hillside with his disciples, teaching them how to actually live — prayer, fasting, money, worry.",
    notes: [
      {
        verse_ref: "v5–6",
        note: "Prayer is not a performance God grades on presentation — it is a conversation he invites you into privately, where the only audience that matters has already seen everything you are holding back.",
      },
      {
        verse_ref: "v7–8",
        note: "God does not answer prayer because you find the right words — he answers because he already knows what you need and is waiting for you to trust him with it.",
      },
      {
        verse_ref: "v9–13",
        note: "The Lord's Prayer is not a formula to recite but a structure that reorders your priorities — it starts with God's kingdom before your needs because the order you pray reveals what you actually trust.",
      },
      {
        verse_ref: "v16–18",
        note: "Fasting is not a transaction meant to impress God with your willpower — it is a reorientation of hunger that trains your desire toward God instead of the thing you are going without.",
      },
      {
        verse_ref: "v19–21",
        note: "Treasure accumulates in the direction your actual affection points — and the gap between what Jesus calls imperishable and what you spend most of your energy protecting is an honest map of where your heart is.",
      },
      {
        verse_ref: "v22–24",
        note: "You cannot serve two masters because divided loyalty is not a compromise — it is a collapse, and every time you try to keep one foot in the kingdom and one in your own comfort, one side always wins.",
      },
    ],
  },
  {
    book: "Psalms",
    chapter: 119,
    passageReference: "Psalm 119:9–16",
    context:
      "A poet is meditating on what it takes to stay clean — and the answer keeps coming back to the word of God.",
    notes: [
      {
        verse_ref: "v9–11",
        note: "God's word does not merely inform your thinking about sin — it rewrites your desire from the inside, which is why hiding it in your heart is not poetic but the actual mechanism of change.",
      },
      {
        verse_ref: "v12–13",
        note: "Asking God to teach you his statutes and then declaring them with your lips is the pattern of someone who treats Scripture as a living conversation, not a text to study and leave on the shelf.",
      },
      {
        verse_ref: "v14–16",
        note: "Delight in God's word is not something you manufacture through discipline — it is what grows in a person who has actually experienced Scripture telling the truth about them and found it was grace, not condemnation.",
      },
    ],
  },
  {
    book: "John",
    chapter: 4,
    passageReference: "John 4:19–24",
    context:
      "Jesus has just told a Samaritan woman everything she has ever done — and she is trying to change the subject.",
    notes: [
      {
        verse_ref: "v19–20",
        note: "The woman raised a theological question the moment the conversation got personal — that instinct to redirect intimacy into debate is not unique to her, it is what every person does when truth starts getting uncomfortable.",
      },
      {
        verse_ref: "v21–24",
        note: "God is spirit and seeks worshippers who approach him in spirit and truth — which means the worship that impresses people most and the worship that actually reaches God are not always the same thing.",
      },
    ],
  },
  {
    book: "Mark",
    chapter: 1,
    passageReference: "Mark 1:35–39",
    context:
      "Jesus had a full day yesterday — healings, crowds, a demon cast out. This morning he is already gone before anyone wakes up.",
    notes: [
      {
        verse_ref: "v35–37",
        note: "Jesus withdrew to pray before the crowd found him — solitude was not his retreat from ministry but the source from which it flowed, and the disciples who interrupted it had no idea what they had walked into.",
      },
      {
        verse_ref: "v38–39",
        note: "Knowing his mission gave Jesus the freedom to leave a crowd that wanted more — without that clarity, the demands of others will always feel more urgent than the call God actually gave you.",
      },
    ],
  },
  {
    book: "Psalms",
    chapter: 46,
    passageReference: "Psalm 46:10",
    context:
      "Nations are in chaos, kingdoms are falling — and in the middle of all of it, God speaks one sentence.",
    notes: [
      {
        verse_ref: "v10",
        note: "Stillness is not passivity — it is the posture that makes knowing God possible, and the reason it is a command rather than a suggestion is that nothing in your nature naturally moves you toward it.",
      },
    ],
  },
  {
    book: "Mark",
    chapter: 2,
    passageReference: "Mark 2:23–28",
    context:
      "The Pharisees are watching Jesus and his disciples walk through a grain field on the Sabbath, looking for something to accuse him of.",
    notes: [
      {
        verse_ref: "v23–25",
        note: "The Pharisees had turned Sabbath into a legal obstacle course — the gift designed to protect rest had become the source of anxiety, and it still happens when religion substitutes rules for the actual rest God intended.",
      },
      {
        verse_ref: "v26–28",
        note: "The Sabbath was made for you — choosing to rest when work remains undone is not laziness but the quiet act of trusting God with what you cannot finish, and that trust is the whole point.",
      },
    ],
  },
  {
    book: "1 John",
    chapter: 1,
    passageReference: "1 John 1:8–10",
    context:
      "John is writing to a church where some people have started saying sin is not really a problem — and the rest of the church is confused about it.",
    notes: [
      {
        verse_ref: "v8",
        note: "Claiming to have no sin is not a sign of spiritual maturity — it is self-deception, and it makes genuine fellowship with God impossible because you cannot receive forgiveness for a problem you refuse to name.",
      },
      {
        verse_ref: "v9",
        note: "Confessing your sin is not groveling until God relents — it is agreeing with what he already sees, and the promise of this verse is not conditional on how long you have been sitting in the guilt.",
      },
      {
        verse_ref: "v10",
        note: "Saying you have not sinned does not protect your reputation — it calls God a liar, and any sense of closeness you feel with him while maintaining that position is not closeness, it is a comfortable distance.",
      },
    ],
  },
  {
    book: "Mark",
    chapter: 10,
    passageReference: "Mark 10:42–45",
    context:
      "James and John just asked Jesus for the best seats in the kingdom — and the other ten disciples heard about it and are furious.",
    notes: [
      {
        verse_ref: "v42–44",
        note: "The world defines greatness by how many people serve you — Jesus redraws the whole structure so that greatness is measured by how many you serve, which means most of what the world calls success points the wrong direction.",
      },
      {
        verse_ref: "v45",
        note: "The Son of Man came not to be served but to give his life as a ransom — every instinct in you will resist that posture, which is why following Jesus requires a different self, not just different habits.",
      },
    ],
  },
  {
    book: "2 Corinthians",
    chapter: 9,
    passageReference: "2 Corinthians 9:6–8",
    context:
      "Paul is asking the Corinthian church to follow through on a collection they promised for believers in Jerusalem who are struggling.",
    notes: [
      {
        verse_ref: "v6",
        note: "Sowing sparingly produces a sparse harvest — not because God is transactional but because a closed fist toward others is always evidence of a heart that does not yet trust him with its security.",
      },
      {
        verse_ref: "v7–8",
        note: "God loves a cheerful giver not because the joy makes the gift more impressive but because cheerfulness is proof that you actually trust him — and trust is the only soil in which generosity grows without resentment.",
      },
    ],
  },
  {
    book: "Acts",
    chapter: 2,
    passageReference: "Acts 2:42–47",
    context:
      "Three thousand people just got baptized in a single day. Now Luke shows what their life together actually looked like.",
    notes: [
      {
        verse_ref: "v42–43",
        note: "The early church devoted themselves to Word, fellowship, bread, and prayer — not as a scheduled program but as the actual texture of daily life, and the awe and signs that followed were the overflow, not the goal.",
      },
      {
        verse_ref: "v44–45",
        note: "Selling possessions and distributing to those in need was not a program — it was what happened naturally to a community that had genuinely encountered the resurrection and could no longer hold on to things the way they used to.",
      },
      {
        verse_ref: "v46–47",
        note: "They broke bread from house to house with gladness — the early church's joy was inseparable from their daily community, and both were inseparable from the daily practice of actually being together.",
      },
    ],
  },
  {
    book: "James",
    chapter: 4,
    passageReference: "James 4:7–10",
    context:
      "James has just told the church they are being driven by selfish ambition and friendship with the world — now he tells them what to do about it.",
    notes: [
      {
        verse_ref: "v7",
        note: "Resisting the devil begins with submitting to God — the order matters because you cannot successfully fight what the enemy is exploiting in you with the same self-reliance he is trying to use against you.",
      },
      {
        verse_ref: "v8–9",
        note: "Double-mindedness is not confusion — it is knowing what God requires while quietly maintaining the parts of your life you have not yet handed over, and James says that posture is incompatible with the nearness you want.",
      },
      {
        verse_ref: "v10",
        note: "Humbling yourself before God is not self-loathing — it is releasing your grip on outcomes and letting him determine where you land, because the exaltation he promises always comes from the position of surrender.",
      },
    ],
  },
  {
    book: "Matthew",
    chapter: 25,
    passageReference: "Matthew 25:14–21",
    context:
      "Jesus is telling his disciples what to do while he is gone — and the answer is not to wait, it is to work.",
    notes: [
      {
        verse_ref: "v14–15",
        note: "The master distributed talents according to each servant's ability — meaning God does not hold you accountable for what he gave someone else, but he holds you fully responsible for what he placed in your hands.",
      },
      {
        verse_ref: "v16–18",
        note: "Two servants immediately worked with what they were given — the third buried his not because he was evil but because he was afraid, and fear is still the most common reason people leave God's gifts unused.",
      },
      {
        verse_ref: "v19–21",
        note: "The commendation was not for how much the servants made but for faithfulness with what they were given — well done and faithful are the words he is looking for in your life, not impressive and successful.",
      },
    ],
  },
];

async function seedPassageNotes() {
  console.log("🌱 Seeding passage notes…");

  for (const entry of PASSAGE_NOTES) {
    const existing = await db
      .select({ id: passageNotes.id })
      .from(passageNotes)
      .where(
        and(
          eq(passageNotes.book, entry.book),
          eq(passageNotes.chapter, entry.chapter)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(passageNotes)
        .set({
          passageReference: entry.passageReference,
          context: entry.context,
          notes: entry.notes,
          updatedAt: new Date(),
        })
        .where(eq(passageNotes.id, existing[0]!.id));
      console.log(`   ↺ ${entry.passageReference} updated (${entry.notes.length} notes)`);
    } else {
      await db.insert(passageNotes).values({
        book: entry.book,
        chapter: entry.chapter,
        passageReference: entry.passageReference,
        context: entry.context,
        notes: entry.notes,
      });
      console.log(`   ✓ ${entry.passageReference} inserted (${entry.notes.length} notes)`);
    }
  }

  console.log("✅ Passage notes seed complete.");
}

seedPassageNotes()
  .catch((err) => {
    console.error("❌ Passage notes seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
