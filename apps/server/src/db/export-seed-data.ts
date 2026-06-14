import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { db, pool } from "./index";
import { devotionalPlans, devotionalDays } from "./schema";
import { asc, eq } from "drizzle-orm";

async function main() {
  const plans = await db
    .select()
    .from(devotionalPlans)
    .where(eq(devotionalPlans.source, "curated"))
    .orderBy(asc(devotionalPlans.category), asc(devotionalPlans.createdAt));

  const out: any[] = [];
  for (const p of plans) {
    const days = await db
      .select()
      .from(devotionalDays)
      .where(eq(devotionalDays.planId, p.id))
      .orderBy(asc(devotionalDays.dayNumber));

    out.push({
      title: p.title,
      subtitle: p.subtitle,
      category: p.category,
      totalDays: p.totalDays,
      description: p.description,
      howToUse: p.howToUse,
      imageUrl: p.imageUrl,
      days: days.map((d) => ({
        dayNumber: d.dayNumber,
        chapter: d.chapter,
        theme: d.theme,
        studyNotes: d.studyNotes,
        reflection: d.reflection,
        reflectionQ1: d.reflectionQ1,
        reflectionQ2: d.reflectionQ2,
        prayerPrompt: d.prayerPrompt,
      })),
    });
  }

  const header = `// AUTO-GENERATED from the live DB by export-seed-data.ts.
// This is the single source of truth for curated devotional plans.
// To change content: edit here (or the DB) and keep them in sync.
import type { PlanSeed } from "./seed.js";

export const PLANS: PlanSeed[] = `;

  const body = JSON.stringify(out, null, 2);
  const file = join(import.meta.dirname, "seed-data.ts");
  writeFileSync(file, header + body + ";\n", "utf8");
  console.log(`Wrote ${out.length} plans to seed-data.ts`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
