/**
 * Seed: 12 SubtestType rows.
 * Run: `npx prisma db seed`
 *
 * Admin accounts are NOT seeded here — they're created manually in
 * Supabase Studio (Authentication > Add user) or via the Supabase CLI/API
 * with the service role key. See CLAUDE.md > Auth model.
 */
import { PrismaClient } from "@prisma/client";
import { SUBTEST_TYPES } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  for (const s of SUBTEST_TYPES) {
    await prisma.subtestType.upsert({
      where: { code: s.code },
      create: s,
      update: { label: s.label, order: s.order },
    });
  }

  console.log(`Seed done: ${SUBTEST_TYPES.length} subtests.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
