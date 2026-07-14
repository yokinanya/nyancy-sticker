import { NextResponse } from "next/server";

const ALLOWED_HOST = process.env.R2_PUBLIC_HOST;

export async function GET(request: Request) {
  if (!ALLOWED_HOST) {
    return NextResponse.json({ error: "R2_PUBLIC_HOST 未配置" }, { status: 500 });
  }
  const u = new URL(request.url);
  const target = u.searchParams.get("url");
  const filename = u.searchParams.get("name") ?? "download";
  if (!target) return NextResponse.json({ error: "missing url" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  // 只允许我们自己的 R2 公开域，禁止任意 url 走代理
  if (parsed.hostname !== ALLOWED_HOST) {
    return NextResponse.json({ error: "forbidden host" }, { status: 403 });
  }

  const upstream = await fetch(parsed.toString());
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 });
  }

  const contentType = upstream.headers.get("Content-Type") ?? "application/octet-stream";
  const safeName = encodeURIComponent(filename);
  return new Response(upstream.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${safeName}`,
      "Cache-Control": "private, no-store",
    },
  });
}
