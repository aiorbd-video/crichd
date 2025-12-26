export default {
  async fetch(request) {
    const url = new URL(request.url);

    // ---- CORS PREFLIGHT ----
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    const target = url.searchParams.get("url");
    if (!target) {
      return new Response("Missing ?url=", { status: 400 });
    }

    const targetUrl = new URL(target);

    // ---- BROWSER-LIKE HEADERS ----
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://profamouslife.com/",
      "Origin": "https://profamouslife.com",
      "Host": targetUrl.host
    };

    // ---- RANGE SUPPORT (CRITICAL) ----
    const range = request.headers.get("Range");
    if (range) headers["Range"] = range;

    const upstream = await fetch(target, {
      method: "GET",
      headers
    });

    const ct = upstream.headers.get("content-type") || "";

    // ---- M3U8 REWRITE ----
    if (ct.includes("mpegurl") || target.endsWith(".m3u8")) {
      let text = await upstream.text();
      const base = target.substring(0, target.lastIndexOf("/") + 1);

      text = text.replace(/^(?!#)(.+)$/gm, line => {
        const abs = line.startsWith("http") ? line : base + line;
        return `${url.origin}/?url=${encodeURIComponent(abs)}`;
      });

      return new Response(text, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store"
        }
      });
    }

    // ---- TS / AAC SEGMENTS ----
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": ct,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store"
      }
    });
  }
};
