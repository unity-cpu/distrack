import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { readManifest, writeManifest } from "@/lib/manifest";

export async function PATCH(request, { params }) {
  const { desc } = await request.json();
  const items = await readManifest();
  const idx = items.findIndex((i) => i.id === params.id);

  if (idx === -1) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  items[idx] = { ...items[idx], desc: (desc || "").trim() };
  await writeManifest(items);

  return NextResponse.json(items[idx]);
}

export async function DELETE(request, { params }) {
  const items = await readManifest();
  const item = items.find((i) => i.id === params.id);

  if (!item) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const remaining = items.filter((i) => i.id !== params.id);
  await writeManifest(remaining);

  try {
    await del(item.pathname);
  } catch {
    // blob already gone — ignore
  }

  return NextResponse.json({ ok: true });
}
