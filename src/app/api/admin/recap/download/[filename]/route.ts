/**
 * Proxy: GET /api/admin/recap/download/[filename] -> Flask GET /download/<filename>.
 * Streams the binary xlsx back — plain Response (not NextResponse) since this
 * is a passthrough, not a JSON API response.
 */
import { getCurrentUser } from "@/lib/auth-guard";
import { recapToolUrl, recapAuthHeader } from "@/lib/recap-proxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  if (!(await getCurrentUser())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { filename } = await params;

  let res: Response;
  try {
    res = await fetch(recapToolUrl(`/download/${encodeURIComponent(filename)}`), {
      headers: recapAuthHeader(),
    });
  } catch {
    return Response.json({ error: "Tool rekap tidak bisa dihubungi." }, { status: 502 });
  }

  if (!res.ok || !res.body) {
    return new Response(await res.text(), { status: res.status });
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition":
        res.headers.get("content-disposition") ?? `attachment; filename="${filename}"`,
    },
  });
}
