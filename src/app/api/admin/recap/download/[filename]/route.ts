/**
 * Proxy: GET /api/admin/recap/download/[filename] -> Flask GET /download/<filename>.
 * Streams the binary xlsx back — plain Response (not NextResponse) since this
 * is a passthrough, not a JSON API response.
 *
 * `filename` in the URL path is Flask's own internal job filename (e.g.
 * "Rekap_Otomatis_20260712_150757_1bde92fa.xlsx") — needed to tell Flask
 * which file to stream, but not what we want the user to see. `?name=`
 * carries the "NAMA SEKOLAH - TANGGAL TES.xlsx" display name (recapResultFilename,
 * see ResultsSummary/RecapTool) and — deliberately — always wins over
 * Flask's own Content-Disposition header for the saved filename: the
 * anchor's `download` attribute alone isn't enough, since Chrome/Firefox
 * both prefer a response's own Content-Disposition filename when present.
 */
import { requireAdmin } from "@/lib/auth-guard";
import { recapToolUrl, recapAuthHeader } from "@/lib/recap-proxy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const guard = await requireAdmin();
  if ("error" in guard) {
    return Response.json({ error: guard.error }, { status: 401 });
  }
  const { filename } = await params;
  const displayName = new URL(request.url).searchParams.get("name");

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

  const savedAs = displayName ?? filename;

  return new Response(res.body, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${savedAs.replace(/"/g, "")}"`,
    },
  });
}
