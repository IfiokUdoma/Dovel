import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next") || "/";
  const candidate = new URL(requestedNext, url.origin);
  const destination = requestedNext.startsWith("/") && candidate.origin === url.origin
    ? candidate
    : new URL("/", url.origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(destination);
  }

  return NextResponse.redirect(new URL("/login?error=confirmation", url.origin));
}
