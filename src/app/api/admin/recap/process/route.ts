/**
 * Proxy: POST /api/admin/recap/process -> Flask POST /process
 * Admin-session gated (this is the actual access control — Flask trusts
 * whatever carries the service token, so it must never be reachable directly
 * from the browser). Forwards the incoming multipart FormData as-is.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { recapToolUrl, recapAuthHeader } from "@/lib/recap-proxy";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: 401 });
  }

  const incoming = await request.formData();

  let res: Response;
  try {
    res = await fetch(recapToolUrl("/process"), {
      method: "POST",
      headers: recapAuthHeader(),
      body: incoming,
    });
  } catch {
    return NextResponse.json({ error: "Tool rekap tidak bisa dihubungi." }, { status: 502 });
  }

  const body = await res.json();
  return NextResponse.json(body, { status: res.status });
}
