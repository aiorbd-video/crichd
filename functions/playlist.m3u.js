function deny() {
  const ref =
    "R-" +
    crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();

  return new Response(
    `Access Denied

You don't have permission to access this resource.

Reference #${ref}`,
    {
      status: 403,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function onRequest({ request }) {
  const ALLOWED = "https://bd71.vercel.app";

  const origin = request.headers.get("Origin");
  const referer = request.headers.get("Referer");

  // 🔒 Only allow from bd71.vercel.app
  if (
    !(
      (origin && origin.startsWith(ALLOWED)) ||
      (referer && referer.startsWith(ALLOWED))
    )
  ) {
    return deny();
  }

  // 🔗 NEW SOURCE
  const SOURCE =
    "https://github.com/abusaeeidx/CricHd-playlists-Auto-Update-permanent/raw/main/ALL.m3u";

  const res = await fetch(SOURCE);
  if (!res.ok) return deny();

  const text = await res.text();
  const lines = text.split("\n");

  let output = [];
  for (let line of lines) {
    line = line.trim();

    // ❌ remove only unwanted lines
    if (
      line.startsWith("#EXTVLCOPT:http-user-agent") ||
      line.startsWith("#EXTHTTP:")
    ) {
      continue;
    }

    output.push(line);
  }

  return new Response(output.join("\n"), {
    headers: {
      "Access-Control-Allow-Origin": ALLOWED,
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'inline; filename="playlist.m3u"',
      "Cache-Control": "no-store",
    },
  });
}
