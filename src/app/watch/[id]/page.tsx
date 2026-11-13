import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import WatchPlayer from "./watch-player";

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: production } = await supabase
    .from("productions")
    .select("id,title,genre,synopsis,poster_url")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();

  if (!production) notFound();

  const { data: episodes, error } = await supabase.rpc("get_public_episodes", { p_production_id: id });

  return (
    <main className="page-shell min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/[.08] bg-[#0b0909]/90 backdrop-blur-xl">
        <div className="container flex h-[68px] items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-lg font-black"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ef4037]">D</span>DOVEL<span className="text-[9px] tracking-[.25em] text-[#ef4037]">PLAY</span></a>
          <nav className="flex items-center gap-4 text-xs text-white/60 sm:gap-6"><a href="/explore" className="hover:text-white">Explore</a><a href="/studio" className="hover:text-white">Studio</a><a href="/wallet" className="hover:text-white">Wallet</a></nav>
        </div>
      </header>

      <div className="container max-w-7xl py-6 sm:py-9">
        <a href="/explore" className="text-xs text-white/45 transition hover:text-white">← Back to discovery</a>
        <section className="mb-7 mt-5 flex items-center gap-4 sm:gap-5">
          {production.poster_url ? <img src={production.poster_url} alt="" className="h-24 w-16 rounded-lg object-cover shadow-xl sm:h-32 sm:w-22" /> : <div className="flex h-24 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-[#482027] to-black text-3xl">🎬</div>}
          <div className="min-w-0">
            <p className="text-[9px] font-bold tracking-[.22em] text-[#f5b942]">DOVEL ORIGINAL · {production.genre}</p>
            <h1 className="mt-2 text-2xl font-black leading-tight sm:text-4xl">{production.title}</h1>
            <p className="mt-2 line-clamp-2 max-w-3xl text-xs leading-5 text-white/50 sm:text-sm">{production.synopsis}</p>
          </div>
        </section>

        {error ? (
          <p className="rounded-xl border border-red-400/20 bg-red-400/5 p-5 text-sm text-red-300">Could not load episodes: {error.message}. Please check the public episode access migration.</p>
        ) : (
          <WatchPlayer productionId={id} episodes={(episodes ?? []) as any[]} />
        )}
      </div>
    </main>
  );
}
