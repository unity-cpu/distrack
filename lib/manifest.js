import { get, put } from "@vercel/blob";

const MANIFEST_PATH = "manifest.json";

export async function readManifest() {
  try {
    const result = await get(MANIFEST_PATH, { access: "public" });
    if (!result) return [];
    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeManifest(items) {
  await put(MANIFEST_PATH, JSON.stringify(items), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
