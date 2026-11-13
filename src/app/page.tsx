import { createClient } from "@/lib/supabase/server";
import { HeroSlideshow } from "./hero-slideshow";

function Brand() {
  return (
    <a href="/" className="flex items-center gap-2 text-xl font-black tracking-tight">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ef4037] text-lg">D</span>
      DOVEL<span className="ml-1 text-[9px] font-semibold tracking-[.25em] text-[#ef4037]">PLAY</span>
    </a>
  );
}

function StoryCard({ story }: { story: { id: string; title: string; genre: string; poster_url: string | null; synopsis: string | null } }) {
  return (
    <a href={`/watch/${story.id}`} className="group relative block w-[158px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#191313] transition duration-300 hover:-translate-y-1 hover:border-white/30 sm:w-[190px]">
      <div className="aspect-[3/4] overflow-hidden bg-gradient-to-br from-[#351b20] to-black">
        {story.poster_url ? (
          <img src={story.poster_url} alt={story.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">🎬</div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent px-3 pb-3 pt-12">
        <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#f5b942]">{story.genre}</p>
        <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-white">{story.title}</h3>
      </div>
    </a>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const { data: shows } = await supabase
    .from("productions")
    .select("id,title,genre,synopsis,poster_url,created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(24);

  const genres = [...new Set((shows ?? []).map((show) => show.genre).filter(Boolean))].slice(0, 5);

  return (
    <main className="page-shell min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/[.08] bg-[#0b0909]/90 backdrop-blur-xl">
        <div className="container flex h-[72px] items-center justify-between">
          <div className="flex items-center gap-10">
            <Brand />
            <nav className="hidden items-center gap-7 text-sm text-white/60 md:flex">
              <a className="text-white" href="/">Home</a>
              <a href="/explore" className="transition hover:text-white">Explore</a>
              <a href="/studio" className="transition hover:text-white">Studio</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="hidden text-sm text-white/70 transition hover:text-white sm:block">Log in</a>
            <a href="/signup" className="btn-primary !px-4 !py-2.5 text-xs">Get started</a>
            <a href="/wallet" aria-label="Coin wallet" className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 transition hover:bg-white/10">◉</a>
          </div>
        </div>
      </header>

      <div className="pb-20">
        <section className="container pt-5 sm:pt-7">
          <HeroSlideshow stories={(shows ?? []).map((show) => ({
            id: show.id,
            title: show.title,
            genre: show.genre,
            synopsis: show.synopsis,
            poster_url: show.poster_url,
          }))} />
        </section>

        <section className="container mt-10 sm:mt-14">
          <div className="mb-5 flex items-end justify-between">
            <div><p className="mb-1 text-[9px] font-bold tracking-[.2em] text-[#f5b942]">START WATCHING</p><h2 className="text-xl font-bold sm:text-2xl">Trending on Dovel</h2></div>
            <a href="/explore" className="text-xs font-semibold text-[#ef625b] transition hover:text-white">View all ↗</a>
          </div>
          {shows?.length ? (
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:gap-4 sm:px-0">
              {shows.slice(0, 12).map((story) => <StoryCard key={story.id} story={story} />)}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-8 text-center">
              <p className="text-3xl">🎞️</p><h3 className="mt-3 font-bold">The first stories are on their way.</h3>
              <p className="mt-2 text-xs text-white/45">Approved AI productions will appear here.</p>
              <a href="/studio" className="mt-4 inline-block text-xs text-[#ef625b]">Submit a production →</a>
            </div>
          )}
        </section>

        {genres.map((genre) => {
          const genreStories = (shows ?? []).filter((story) => story.genre === genre);
          if (genreStories.length < 2) return null;
          return (
            <section key={genre} className="container mt-8 sm:mt-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold sm:text-xl">{genre} stories</h2>
                <a href="/explore" className="text-xs font-semibold text-white/50 transition hover:text-white">Explore all ↗</a>
              </div>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:gap-4 sm:px-0">
                {genreStories.map((story) => <StoryCard key={story.id} story={story} />)}
              </div>
            </section>
          );
        })}

        <section className="container mt-12">
          <div className="flex flex-col justify-between gap-6 rounded-2xl border border-[#ef4037]/20 bg-gradient-to-r from-[#2b1110] to-[#141111] p-7 sm:flex-row sm:items-center sm:p-9">
            <div><p className="text-[10px] font-bold tracking-[.22em] text-[#f5b942]">HAVE A STORY TO TELL?</p><h2 className="mt-2 text-2xl font-bold">Your imagination belongs here.</h2><p className="mt-2 text-sm text-white/55">Publish your AI-generated films and share them with the world.</p></div>
            <a href="/studio" className="btn-primary w-fit">Open your studio →</a>
          </div>
        </section>
      </div>
      <footer className="border-t border-white/[.07] py-7 text-center text-[11px] text-white/35">© 2026 Dovel. Stories beyond imagination.</footer>
    </main>
  );
}
