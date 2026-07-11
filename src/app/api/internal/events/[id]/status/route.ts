/**
 * INTERNAL webhook (BE-E1) — called by the Flask recap tool when the admin
 * presses "Mulai Rekap". Drives exactly one transition: ONGOING → REKAP.
 *
 * Auth: `Authorization: Bearer <RECAP_SERVICE_TOKEN>` (not an admin session).
 * Body: { "status": "REKAP", "triggeredBy"?: string }
 * See CLAUDE.md > Integration contract with Flask.
 */
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertTransition } from "@/lib/status";
import { isValidRecapToken } from "@/lib/recap-auth";

// This endpoint only ever drives ONGOING → REKAP, so status is a literal.
const bodySchema = z.object({
  status: z.literal("REKAP"),
  triggeredBy: z.string().trim().min(1).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isValidRecapToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON yang valid." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Body harus { "status": "REKAP" }.' }, { status: 400 });
  }

  const event = await prisma.psikotesEvent.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Jadwal tidak ditemukan." }, { status: 404 });
  }

  try {
    assertTransition(event.status, "REKAP");
  } catch {
    return NextResponse.json(
      { error: `Transisi tidak sah dari status ${event.status} ke REKAP.` },
      { status: 409 },
    );
  }

  try {
    await prisma.$transaction([
      prisma.psikotesEvent.update({ where: { id }, data: { status: "REKAP" } }),
      prisma.recapJob.create({
        data: { eventId: id, triggeredBy: parsed.data.triggeredBy ?? "Automated Recap" },
      }),
    ]);
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui status." }, { status: 500 });
  }

  revalidatePath("/admin/rekap");
  revalidatePath("/admin/jadwal");
  revalidatePath(`/admin/jadwal/${id}`);
  revalidatePath("/admin");

  return NextResponse.json({ status: "REKAP" }, { status: 200 });
}
