import { NextResponse } from "next/server";
import { readManifest, writeManifest } from "@/lib/manifest";

export async function GET() {
  const items = await readManifest();
  items.sort((a, b) => b.addedAt - a.addedAt);
  return NextResponse.json(items);
}

export async function POST(request) {
  const { url, pathname, desc, name } = await request.json();

  if (!url || !pathname) {
    return NextResponse.json({ error: "missing url/pathname" }, { status: 400 });
  }

  const items = await readManifest();
  const item = {
    id: crypto.randomUUID(),
    url,
    pathname,
    desc: (desc || "").trim(),
    name: name || "",
    addedAt: Date.now(),
  };
  items.unshift(item);
  await writeManifest(items);

  return NextResponse.json(item);
}
