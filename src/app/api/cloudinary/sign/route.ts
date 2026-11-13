import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Cloudinary server credentials are not configured." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const kind = body?.kind;
  if (kind !== "poster" && kind !== "episode") {
    return NextResponse.json({ error: "Invalid upload type." }, { status: 400 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = kind === "poster" ? "dovel/posters" : "dovel/episodes";
  const signatureBase = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(signatureBase).digest("hex");

  return NextResponse.json({ cloudName, apiKey, timestamp, folder, signature });
}
