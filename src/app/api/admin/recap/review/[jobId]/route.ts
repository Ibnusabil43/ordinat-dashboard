/** Proxy: POST /api/admin/recap/review/[jobId] -> Flask POST /review/<job_id>. Submits borderline-match decisions. */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import { recapToolUrl, recapAuthHeader } from "@/lib/recap-proxy";

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { jobId } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(recapToolUrl(`/review/${encodeURIComponent(jobId)}`), {
      method: "POST",
      headers: { ...recapAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(raw),
    });
  } catch {
    return NextResponse.json({ error: "Tool rekap tidak bisa dihubungi." }, { status: 502 });
  }

  const body = await res.json();
  return NextResponse.json(body, { status: res.status });
}
