// ─── Daily encouragement verses (shown wherever a day reads as finished) ─────
//
// One verse per calendar day rather than per render, so every surface that says
// "you're done" — the reader's done screen, the group page's finished card —
// quotes the SAME verse on the same day. A verse that changed between screens
// would read as decoration; holding it steady makes it the day's word.

export type DoneVerse = { text: string; ref: string };

export const DONE_VERSES: DoneVerse[] = [
  { text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.", ref: "Galatians 6:9" },
  { text: "He who began a good work in you will carry it on to completion until the day of Christ Jesus.", ref: "Philippians 1:6" },
  { text: "The steadfast love of the LORD never ceases; his mercies never come to an end; they are new every morning; great is your faithfulness.", ref: "Lamentations 3:22–23" },
  { text: "Let us run with perseverance the race marked out for us, fixing our eyes on Jesus, the pioneer and perfecter of faith.", ref: "Hebrews 12:1–2" },
  { text: "But they who wait for the LORD shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint.", ref: "Isaiah 40:31" },
  { text: "I have fought the good fight, I have finished the race, I have kept the faith.", ref: "2 Timothy 4:7" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.", ref: "Joshua 1:9" },
  { text: "The LORD your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.", ref: "Zephaniah 3:17" },
  { text: "Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.", ref: "Proverbs 3:5–6" },
  { text: "Create in me a clean heart, O God, and renew a right spirit within me.", ref: "Psalm 51:10" },
  { text: "Your word is a lamp for my feet, a light on my path.", ref: "Psalm 119:105" },
  { text: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" },
];

export function getDailyVerse(): DoneVerse {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return DONE_VERSES[dayIndex % DONE_VERSES.length]!;
}
