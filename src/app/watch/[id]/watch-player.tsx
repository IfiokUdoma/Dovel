"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Episode = { id: string; title: string; episode_number: number; coin_price: number; is_free: boolean };

export default function WatchPlayer({ productionId, episodes }: { productionId: string; episodes: Episode[] }) {
  const [selected, setSelected] = useState(episodes[0]?.id ?? "");
  const [videoUrl, setVideoUrl] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const current = episodes.find((episode) => episode.id === selected);
  const orderedEpisodes = useMemo(() => [...episodes].sort((a, b) => a.episode_number - b.episode_number), [episodes]);
  const nextEpisode = current ? orderedEpisodes.find((episode) => episode.episode_number > current.episode_number) : undefined;

  useEffect(() => {
    let active = true;
    async function loadBalance() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
      if (active && data) setBalance(data.balance);
    }
    void loadBalance();
    return () => { active = false; };
  }, []);

  function selectEpisode(id: string) {
    setSelected(id);
    setVideoUrl("");
    setMessage("");
  }

  async function watchEpisode() {
    if (!current || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage("Sign in to watch this episode.");
        return;
      }

      if (!current.is_free && current.coin_price > 0) {
        const { data: result, error: unlockError } = await supabase.rpc("unlock_episode", { p_episode_id: current.id });
        if (unlockError) throw unlockError;
        if (!result?.unlocked) {
          if (result?.insufficient_balance) {
            setMessage(`You need ${result.required} coins, but your balance is ${result.balance}.`);
            return;
          }
          throw new Error("We couldn't unlock this episode. Please try again.");
        }
        setUnlockedIds((ids) => ids.includes(current.id) ? ids : [...ids, current.id]);
        const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
        if (wallet) setBalance(wallet.balance);
      }

      const { data, error } = await supabase.rpc("get_episode_playback", { p_episode_id: current.id });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.video_url) throw new Error("The episode stream is unavailable. Please try again later.");
      setVideoUrl(row.video_url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start playback.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
          {videoUrl ? (
            <video key={videoUrl} src={videoUrl} controls autoPlay playsInline className="aspect-video w-full bg-black" />
          ) : (
            <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_35%,rgba(155,42,39,.3),transparent_55%),linear-gradient(135deg,#211416,#080808)] p-6 text-center">
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="relative max-w-md">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/5 text-2xl">▶</div>
                <p className="mt-5 text-[9px] font-bold tracking-[.22em] text-[#f5b942]">NOW PLAYING ON DOVEL</p>
                <h2 className="mt-2 text-xl font-bold sm:text-2xl">{current ? `Episode ${current.episode_number}: ${current.title}` : "No approved episodes yet"}</h2>
                <p className="mt-2 text-xs text-white/45">{current ? "Ready when you are. Press play to start this episode." : "Approved episodes will appear here."}</p>
              </div>
            </div>
          )}
        </div>

        {message && (
          <div role="status" className="mt-4 rounded-xl border border-[#f5b942]/20 bg-[#f5b942]/5 p-4 text-sm text-[#f5d58b]">
            {message}
            {message.includes("coins") && <a href="/wallet" className="ml-2 font-bold underline">Get coins</a>}
            {message.includes("Sign in") && <a href={`/login?next=/watch/${productionId}`} className="ml-2 font-bold underline">Log in</a>}
          </div>
        )}

        {current && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={watchEpisode} disabled={busy} className="btn-primary min-w-48 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? "Preparing episode…" : videoUrl ? "▶ Replay episode" : current.is_free || current.coin_price === 0 ? "▶ Watch free episode" : unlockedIds.includes(current.id) ? "▶ Watch episode" : `▶ Unlock & watch · ${current.coin_price} coins`}
            </button>
            {current.is_free || current.coin_price === 0 ? <span className="text-xs text-emerald-300">Free preview</span> : <span className="text-xs text-white/40">One-time unlock · watch again anytime</span>}
          </div>
        )}
      </section>

      <aside className="glass overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div><p className="text-[9px] font-bold tracking-[.18em] text-[#f5b942]">THE SERIES</p><h2 className="mt-1 font-bold">Episodes</h2></div>
          {balance !== null && <div className="rounded-lg border border-[#f5b942]/20 bg-[#f5b942]/5 px-3 py-2 text-right"><p className="text-[9px] text-white/40">YOUR WALLET</p><p className="text-sm font-bold text-[#f5d58b]">{balance} coins</p></div>}
        </div>
        <div className="max-h-[520px] space-y-2 overflow-y-auto p-3">
          {orderedEpisodes.map((episode) => {
            const active = selected === episode.id;
            const free = episode.is_free || episode.coin_price === 0;
            return (
              <button key={episode.id} onClick={() => selectEpisode(episode.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${active ? "border-[#ef4037]/60 bg-[#ef4037]/10" : "border-white/[.07] bg-black/20 hover:border-white/20 hover:bg-white/[.04]"}`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-black ${active ? "bg-[#ef4037] text-white" : "bg-white/[.07] text-white/55"}`}>{String(episode.episode_number).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{episode.title}</span><span className="mt-1 block text-[10px] text-white/40">{free ? "Free preview" : unlockedIds.includes(episode.id) ? "Unlocked" : `${episode.coin_price} coins to unlock`}</span></span>
                <span className="text-sm text-white/40">{active ? "●" : "›"}</span>
              </button>
            );
          })}
          {orderedEpisodes.length === 0 && <p className="p-5 text-center text-xs leading-5 text-white/40">No approved episodes yet. Check back when the creator publishes the first episode.</p>}
        </div>
        <a href="/wallet" className="block border-t border-white/10 px-4 py-4 text-xs font-semibold text-[#f5d58b] transition hover:bg-white/[.03]">Add coins to your wallet →</a>
      </aside>

      {nextEpisode && videoUrl && (
        <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.03] p-4">
          <div><p className="text-[9px] font-bold tracking-[.18em] text-white/40">UP NEXT</p><p className="mt-1 text-sm font-semibold">Episode {nextEpisode.episode_number}: {nextEpisode.title}</p></div>
          <button onClick={() => selectEpisode(nextEpisode.id)} className="rounded-lg border border-white/15 px-4 py-2.5 text-xs font-bold transition hover:bg-white/10">Next episode →</button>
        </div>
      )}
    </div>
  );
}
