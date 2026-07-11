/** Proxy: GET /api/admin/recap/status/[jobId] -> Flask GET /status/<job_id>. Polled every ~600ms by the UI. */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { recapToolUrl, recapAuthHeader } from "@/lib/recap-proxy";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: 401 });
  }
  const { jobId } = await params;

  let res: Response;
  try {
    res = await fetch(recapToolUrl(`/status/${encodeURIComponent(jobId)}`), {
      headers: recapAuthHeader(),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Tool rekap tidak bisa dihubungi." }, { status: 502 });
  }

  const body = await res.json();
  return NextResponse.json(body, { status: res.status });
}
