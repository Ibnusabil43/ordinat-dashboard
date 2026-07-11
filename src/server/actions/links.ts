"use server";

/**
 * Subtest link upsert (BE-D1). All 12 URLs for one event are saved together
 * in a single transaction. An empty field means "not set yet" — we delete
 * that row rather than rejecting the submission (a link can legitimately be
 * missing while the admin is still filling the form in).
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { subtestLinksSchema } from "@/lib/validations";
import { SUBTEST_CODES } from "@/lib/constants";
import { requireAdmin } from "@/lib/auth-guard";

export interface LinksActionState {
  error?: string;
  /** Keyed by subtest code (e.g. "EPPS"), not array index — the form renders per-code. */
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

export async function upsertSubtestLinks(
  eventId: string,
  _prevState: LinksActionState | undefined,
  formData: FormData,
): Promise<LinksActionState> {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const links = SUBTEST_CODES.map((code) => ({
    code,
    url: (formData.get(`url_${code}`) as string | null)?.trim() ?? "",
  }));

  const parsed = subtestLinksSchema.safeParse({ eventId, links });
  if (!parsed.success) {
    // subtestLinksSchema nests an array of objects, so .flatten() can't map
    // an error back to which subtest it belongs to — walk the issues instead,
    // using the index (path[1]) to look up the code from the array we built.
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      if (issue.path[0] === "links" && typeof issue.path[1] === "number") {
        const code = links[issue.path[1]]?.code;
        if (code) fieldErrors[code] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const subtestTypes = await prisma.subtestType.findMany({ select: { id: true, code: true } });
  const idByCode = new Map(subtestTypes.map((s) => [s.code, s.id]));

  try {
    await prisma.$transaction(async (tx) => {
      for (const link of parsed.data.links) {
        const subtestTypeId = idByCode.get(link.code);
        if (!subtestTypeId) continue; // shouldn't happen — SUBTEST_CODES is the source of subtestType rows

        if (!link.url) {
          await tx.subtestLink.deleteMany({ where: { eventId, subtestTypeId } });
          continue;
        }
        await tx.subtestLink.upsert({
          where: { eventId_subtestTypeId: { eventId, subtestTypeId } },
          create: { eventId, subtestTypeId, url: link.url },
          update: { url: link.url },
        });
      }
    });
  } catch {
    return { error: "Gagal menyimpan link. Coba lagi." };
  }

  revalidatePath(`/admin/jadwal/${eventId}/link`);
  revalidatePath(`/admin/jadwal/${eventId}`);
  revalidatePath("/admin/jadwal");

  return { success: true };
}
