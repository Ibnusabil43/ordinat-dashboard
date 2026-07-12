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
import { startRekap } from "@/lib/recap-status";
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

  const result = await startRekap(id, parsed.data.triggeredBy ?? "Automated Recap");
  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : result.reason === "invalid_transition" ? 409 : 500;
    return NextResponse.json({ error: result.message }, { status });
  }

  revalidatePath("/rekap");
  revalidatePath("/jadwal");
  revalidatePath(`/jadwal/${id}`);
  revalidatePath("/");

  return NextResponse.json({ status: "REKAP" }, { status: 200 });
}
