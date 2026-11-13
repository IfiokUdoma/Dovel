import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CoinPurchase } from "./coin-purchase";

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/wallet");
  const [{ data: wallet }, { data: transactions, error }] = await Promise.all([
    supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
    supabase.from("coin_transactions").select("id,amount,type,reference,created_at,metadata").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
  ]);
  return <main className="page-shell min-h-screen">
    <header className="container flex h-[70px] items-center justify-between border-b border-white/[.07]"><a href="/" className="text-xl font-black">DOVEL<span className="text-[#ef4037]">.</span></a><nav className="flex gap-5 text-xs text-white/60"><a href="/explore">Explore</a><a href="/studio">Studio</a></nav></header>
    <div className="container max-w-4xl py-12">
      <p className="text-[10px] font-bold tracking-[.2em] text-[#f5b942]">YOUR ACCOUNT</p><h1 className="mt-2 text-3xl font-black">Coin wallet</h1><p className="mt-2 text-sm text-white/50">Use Dovel Coins to unlock premium episodes.</p>
      <section className="mt-8 rounded-2xl border border-[#ef4037]/20 bg-gradient-to-br from-[#351614] to-[#141111] p-7 sm:p-9"><p className="text-xs font-semibold tracking-[.18em] text-white/50">AVAILABLE BALANCE</p><div className="mt-3 flex items-end gap-3"><span className="text-5xl font-black">{wallet?.balance ?? 0}</span><span className="pb-2 text-sm text-[#f5b942]">Dovel Coins</span></div></section>
      <CoinPurchase />
      <section className="mt-10"><h2 className="text-xl font-bold">Transaction history</h2>{error ? <p className="mt-4 text-sm text-red-300">{error.message}</p> : transactions?.length ? <div className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10">{transactions.map(t => <div key={t.id} className="flex items-center justify-between gap-4 p-4"><div><p className="text-sm font-semibold capitalize">{t.type.replaceAll("_", " ")}</p><p className="mt-1 text-[10px] text-white/40">{new Date(t.created_at).toLocaleString()} {t.reference ? " · " + t.reference : ""}</p></div><span className={"text-sm font-bold " + (t.amount > 0 ? "text-emerald-300" : "text-white/70")}>{t.amount > 0 ? "+" : ""}{t.amount} coins</span></div>)}</div> : <div className="glass mt-4 rounded-xl p-8 text-center text-sm text-white/45">Your coin transactions will appear here.</div>}</section>
    </div>
  </main>;
}
