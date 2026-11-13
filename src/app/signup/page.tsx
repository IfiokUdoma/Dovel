"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await createClient().auth.signUp({
        email,
        password,
        options: {
          data: { username: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });
      if (error) throw error;
      if (data.session) {
        window.location.href = "/";
        return;
      }
      setMessage("Account created. Check your email and use the confirmation link to finish signing up.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to create account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-2xl p-8 sm:p-10">
        <a href="/" className="text-xl font-black">DOVEL<span className="text-[#ef4037]">.</span></a>
        <p className="mt-9 text-xs font-bold tracking-[.2em] text-[#f5b942]">YOUR NEXT STORY STARTS HERE</p>
        <h1 className="mt-2 text-3xl font-bold">Create your account</h1>
        <p className="mt-2 text-sm text-white/50">One account to watch, discover and publish AI stories.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block text-xs text-white/60">Display name
            <input required maxLength={40} value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#ef4037]" placeholder="What should we call you?" />
          </label>
          <label className="block text-xs text-white/60">Email address
            <input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#ef4037]" placeholder="you@example.com" />
          </label>
          <label className="block text-xs text-white/60">Password
            <input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#ef4037]" placeholder="At least 8 characters" />
          </label>
          <button disabled={busy} className="btn-primary w-full disabled:opacity-50">{busy ? "Creating account…" : "Create account"}</button>
          {message && <p role="status" aria-live="polite" className="text-xs text-amber-300">{message}</p>}
        </form>
        <p className="mt-6 text-center text-sm text-white/50">Already have an account? <a href="/login" className="text-white underline">Sign in</a></p>
        <a href="/" className="mt-7 block text-center text-xs text-white/35">← Back to Dovel</a>
      </div>
    </main>
  );
}
