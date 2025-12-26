const ALLOWED = [
  "https://bd71.vercel.app",
  "http://localhost",
  "http://localhost:3000"
];

export default {
  async fetch(request) {
    const url = new URL(request.url);

    const origin = request.headers.get("Origin") || "";
    const referer = request.headers.get("Referer") || "";

    const allowed = ALLOWED.some(d =>
      origin.startsWith(d) || referer.startsWith(d)
    );

    // ---- BOT DECEPTION ----
    if (!allowed || isBot(request)) {
      // Randomize response to avoid fingerprinting
      if (url.pathname.endsWith(".m3u8") || url.search.includes(".m3u8")) {
        return new Response(fakeM3U8(), {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl"
          }
        });
      }

      return new Response(fakeSegment(), {
        status: 200,
        headers: {
          "Content-Type": "video/mp2t"
        }
      });
    }

    // ---- NORMAL PROXY FLOW (REAL USERS) ----
    const target = url.searchParams.get("url");
    if (!target) return new Response("Missing url", { status: 400 });

    const t = new URL(target);

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://profamouslife.com/",
      "Origin": "https://profamouslife.com",
      "Host": t.host
    };

    const range = request.headers.get("Range");
    if (range) headers["Range"] = range;

    const upstream = await fetch(target, { headers });
    const ct = upstream.headers.get("content-type") || "";

    if (ct.includes("mpegurl") || target.endsWith(".m3u8")) {
      let text = await upstream.text();
      const base = target.substring(0, target.lastIndexOf("/") + 1);

      text = text.replace(/^(?!#)(.+)$/gm, line => {
        const abs = line.startsWith("http") ? line : base + line;
        return `${url.origin}/?url=${encodeURIComponent(abs)}`;
      });

      return new Response(text, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": origin
        }
      });
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": ct,
        "Access-Control-Allow-Origin": origin
      }
    });
  }
};
