import { createClient } from "@/lib/supabase/server";

function Brand() {
  return <a href="/" className="flex items-center gap-2 text-lg font-black tracking-tight"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ef4037] text-base">D</span>DOVEL<span className="ml-1 text-[9px] font-semibold tracking-[.25em] text-[#ef4037]">PLAY</span></a>;
}

export default async function Explore() {
  const supabase = await createClient();
  const { data: productions, error } = await supabase
    .from("productions")
    .select("id,title,genre,synopsis,poster_url,created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  return (
    <main className="page-shell min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/[.08] bg-[#0b0909]/90 backdrop-blur-xl">
        <div className="container flex h-[68px] items-center justify-between">
          <Brand />
          <nav className="flex items-center gap-4 text-xs text-white/60 sm:gap-6">
            <a href="/" className="transition hover:text-white">Home</a>
            <a href="/explore" className="font-semibold text-white">Explore</a>
            <a href="/studio" className="transition hover:text-white">Studio</a>
            <a href="/wallet" className="transition hover:text-white">Wallet</a>
          </nav>
        </div>
      </header>

      <div className="container py-7 sm:py-10">
        <div className="mx-auto mb-7 max-w-3xl text-center sm:mb-9">
          <p className="text-[10px] font-bold tracking-[.24em] text-[#f5b942]">THE DOVEL DISCOVERY FEED</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Find your next obsession.</h1>
          <p className="mt-2 text-sm text-white/50">Swipe through original AI stories. When one catches your eye, step into the full story.</p>
        </div>

        {error ? (
          <p className="mx-auto mt-8 max-w-xl rounded-xl border border-red-400/20 bg-red-400/5 p-5 text-sm text-red-300">Could not load the catalogue: {error.message}</p>
        ) : productions?.length ? (
          <div className="mx-auto flex max-w-[560px] flex-col gap-7">
            {productions.map((story, index) => (
              <article key={story.id} className="group relative isolate min-h-[620px] snap-start overflow-hidden rounded-2xl border border-white/10 bg-[#1b1010] shadow-2xl sm:min-h-[740px]">
                {story.poster_url ? (
                  <img src={story.poster_url} alt={story.title} className="absolute inset-0 -z-20 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]" />
                ) : (
                  <div className="absolute inset-0 -z-20 flex items-center justify-center bg-gradient-to-br from-[#482027] via-[#171313] to-black text-8xl">🎬</div>
                )}
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/65 to-black/5" />
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                  <span className="rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[9px] font-bold tracking-[.16em] text-white/85 backdrop-blur">AI ORIGINAL</span>
                  <span className="rounded-full bg-black/35 px-3 py-1.5 text-[10px] text-white/70 backdrop-blur">{index + 1} / {productions.length}</span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 pb-6 sm:p-7">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#f5b942]">{story.genre}</p>
                  <h2 className="max-w-md text-3xl font-black leading-tight sm:text-4xl">{story.title}</h2>
                  <p className="mt-3 line-clamp-3 max-w-md text-sm leading-6 text-white/75">{story.synopsis || "An original story awaits. Step inside and discover what happens next."}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <a href={`/watch/${story.id}`} className="inline-flex items-center gap-2 rounded-lg bg-[#ef4037] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#ff5148]">▶ &nbsp; Watch story</a>
                    <a href="/" className="rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15">Home</a>
                  </div>
                </div>
                <div className="absolute bottom-32 right-4 hidden flex-col items-center gap-4 sm:flex">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/30 text-lg backdrop-blur">▶</div>
                  <span className="text-[9px] font-semibold tracking-widest text-white/75">DISCOVER</span>
                </div>
              </article>
            ))}
            <p className="pb-4 text-center text-[10px] font-semibold tracking-[.18em] text-white/35">YOU'RE ALL CAUGHT UP</p>
          </div>
        ) : (
          <div className="glass mx-auto mt-8 max-w-xl rounded-2xl p-10 text-center">
            <p className="text-4xl">🎞️</p>
            <h2 className="mt-4 text-lg font-bold">The first stories are on their way.</h2>
            <p className="mt-2 text-sm text-white/45">Approved AI productions will appear here as they are published.</p>
            <a href="/studio" className="mt-5 inline-block text-sm font-semibold text-[#ef625b]">Create a story →</a>
          </div>
        )}
      </div>
    </main>
  );
}
