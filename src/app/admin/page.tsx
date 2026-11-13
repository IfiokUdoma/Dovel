import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { moderateEpisode, moderateProduction } from "./actions";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/");

  const [{ data: productions, error: productionError }, { data: episodes, error: episodeError }] = await Promise.all([
    supabase.from("productions").select("id,title,genre,synopsis,created_at,profiles!productions_creator_id_fkey(username)").eq("status","pending").order("created_at",{ascending:true}),
    supabase.from("episodes").select("id,title,episode_number,coin_price,is_free,created_at,video_url,productions!inner(id,title,creator_id,profiles!productions_creator_id_fkey(username))").eq("status","pending").order("created_at",{ascending:true}),
  ]);

  return <main className="page-shell min-h-screen">
    <header className="container flex h-[70px] items-center justify-between border-b border-white/[.07]">
      <a href="/" className="text-xl font-black">DOVEL<span className="text-[#ef4037]">.</span></a>
      <span className="pill">ADMIN CONSOLE</span>
    </header>
    <div className="container py-12">
      <p className="text-[10px] font-bold tracking-[.2em] text-[#f5b942]">CONTENT SAFETY</p>
      <h1 className="mt-2 text-3xl font-bold">Moderation queue</h1>
      <p className="mt-2 text-sm text-white/50">Review AI-generated productions and episodes before publication.</p>
      {productionError && <p role="alert" className="mt-5 text-sm text-red-300">Production queue: {productionError.message}</p>}
      {episodeError && <p role="alert" className="mt-2 text-sm text-red-300">Episode queue: {episodeError.message}. Apply migration 0003 if it has not been run.</p>}

      <section className="mt-9">
        <h2 className="mb-4 text-xl font-bold">Productions <span className="text-sm text-white/35">({productions?.length ?? 0})</span></h2>
        <div className="space-y-3">{productions?.length ? productions.map((item:any)=><article key={item.id} className="glass rounded-xl p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row"><div><h3 className="font-bold">{item.title}</h3><p className="mt-1 text-xs text-white/45">{item.genre} · {item.profiles?.username ?? "Creator"} · {new Date(item.created_at).toLocaleString()}</p></div><span className="pill h-fit">Pending review</span></div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-white/65">{item.synopsis}</p>
          <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-end sm:justify-between">
            <form action={moderateProduction} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end"><input type="hidden" name="production_id" value={item.id}/><input type="hidden" name="decision" value="rejected"/><label className="flex-1 text-xs text-white/55">Reason (required)<input name="reason" required maxLength={500} placeholder="Explain what needs to change" className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white"/></label><button className="rounded-lg border border-red-400/30 px-4 py-2.5 text-xs font-semibold text-red-300">Reject</button></form>
            <form action={moderateProduction}><input type="hidden" name="production_id" value={item.id}/><input type="hidden" name="decision" value="approved"/><button className="w-full rounded-lg bg-emerald-500 px-5 py-2.5 text-xs font-bold text-black sm:w-auto">Approve production</button></form>
          </div>
        </article>):<div className="glass rounded-xl p-6 text-center text-sm text-white/40">No productions awaiting review.</div>}</div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold">Episodes <span className="text-sm text-white/35">({episodes?.length ?? 0})</span></h2>
        <div className="space-y-3">{episodes?.length ? episodes.map((item:any)=><article key={item.id} className="glass rounded-xl p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row"><div><h3 className="font-bold">{item.productions?.title} · Episode {item.episode_number}: {item.title}</h3><p className="mt-1 text-xs text-white/45">Submitted by {item.productions?.profiles?.username ?? "Creator"} · {item.is_free ? "Free preview" : item.coin_price+" coins"} · {new Date(item.created_at).toLocaleString()}</p></div><a href={item.video_url} target="_blank" rel="noreferrer" className="text-xs text-[#f5b942] underline">Preview video</a></div>
          <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-end sm:justify-between">
            <form action={moderateEpisode} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end"><input type="hidden" name="episode_id" value={item.id}/><input type="hidden" name="decision" value="rejected"/><label className="flex-1 text-xs text-white/55">Reason (required)<input name="reason" required maxLength={500} placeholder="Explain what needs to change" className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white"/></label><button className="rounded-lg border border-red-400/30 px-4 py-2.5 text-xs font-semibold text-red-300">Reject</button></form>
            <form action={moderateEpisode}><input type="hidden" name="episode_id" value={item.id}/><input type="hidden" name="decision" value="approved"/><button className="w-full rounded-lg bg-emerald-500 px-5 py-2.5 text-xs font-bold text-black sm:w-auto">Approve episode</button></form>
          </div>
        </article>):<div className="glass rounded-xl p-6 text-center text-sm text-white/40">No episodes awaiting review.</div>}</div>
      </section>
    </div>
  </main>;
}
