"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "pending"|"approved"|"rejected";
type Production = { id:string; title:string; genre:string; status:Status; created_at:string; rejection_reason:string|null; poster_url?:string|null };
type Episode = { id:string; production_id:string; title:string; episode_number:number; coin_price:number; is_free:boolean; status:Status; created_at:string; rejection_reason:string|null };
const statusStyle = { pending:"border-amber-400/20 bg-amber-400/10 text-amber-300", approved:"border-emerald-400/20 bg-emerald-400/10 text-emerald-300", rejected:"border-red-400/20 bg-red-400/10 text-red-300" };

async function uploadToCloudinary(file:File,kind:"poster"|"episode") {
  const signResponse=await fetch("/api/cloudinary/sign",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind})});
  const signed=await signResponse.json();
  if(!signResponse.ok) throw new Error(signed.error||"Could not sign upload.");
  const data=new FormData();
  data.append("file",file); data.append("api_key",signed.apiKey); data.append("timestamp",String(signed.timestamp)); data.append("folder",signed.folder); data.append("signature",signed.signature);
  const response=await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/${kind==="poster"?"image":"video"}/upload`,{method:"POST",body:data});
  const result=await response.json();
  if(!response.ok) throw new Error(result.error?.message||"Cloudinary upload failed.");
  return {url:result.secure_url as string,publicId:result.public_id as string};
}

export default function Studio(){
  const router=useRouter();
  const [title,setTitle]=useState(""); const [genre,setGenre]=useState("Drama"); const [synopsis,setSynopsis]=useState("");
  const [posterUrl,setPosterUrl]=useState("");
  const [userId,setUserId]=useState<string|null>(null); const [productions,setProductions]=useState<Production[]>([]); const [episodes,setEpisodes]=useState<Episode[]>([]);
  const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false); const [uploading,setUploading]=useState(false); const [notice,setNotice]=useState("");
  const [episodeProduction,setEpisodeProduction]=useState(""); const [episodeTitle,setEpisodeTitle]=useState(""); const [episodeNumber,setEpisodeNumber]=useState("1"); const [coinPrice,setCoinPrice]=useState("10"); const [isFree,setIsFree]=useState(false); const [videoFile,setVideoFile]=useState<File|null>(null); const [episodeBusy,setEpisodeBusy]=useState(false); const [episodeNotice,setEpisodeNotice]=useState("");

  async function loadEpisodes(productionIds:string[]) {
    if(!productionIds.length){setEpisodes([]);return;}
    const supabase=createClient();
    const {data,error}=await supabase.from("episodes").select("id,production_id,title,episode_number,coin_price,is_free,status,created_at,rejection_reason").in("production_id",productionIds).order("episode_number",{ascending:true});
    if(error) throw error;
    setEpisodes((data??[]) as Episode[]);
  }

  useEffect(()=>{let alive=true;async function load(){try{
    const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();
    if(!user){router.replace("/login?next=/studio");return;}if(!alive)return;setUserId(user.id);
    const {data,error}=await supabase.from("productions").select("id,title,genre,status,created_at,rejection_reason,poster_url").eq("creator_id",user.id).order("created_at",{ascending:false});
    if(error)throw error;const rows=(data??[]) as Production[];if(alive){setProductions(rows);setEpisodeProduction(rows.find(p=>p.status==="approved")?.id??"");await loadEpisodes(rows.map(p=>p.id));}
  }catch(e){if(alive)setNotice(e instanceof Error?e.message:"Could not load your studio.");}finally{if(alive)setLoading(false);}}load();return()=>{alive=false;};},[router]);

  async function handlePosterUpload(file:File){
    if(!file.type.startsWith("image/")){setNotice("Choose an image file for the poster.");return;}
    if(file.size>10*1024*1024){setNotice("Poster must be 10 MB or smaller.");return;}
    setUploading(true);setNotice("");
    try{const uploaded=await uploadToCloudinary(file,"poster");setPosterUrl(uploaded.url);setNotice("Poster uploaded successfully.");}
    catch(e){setPosterUrl("");setNotice(e instanceof Error?e.message:"Poster upload failed.");}
    finally{setUploading(false);}
  }

  async function submitProduction(e:React.FormEvent){
    e.preventDefault();if(!userId)return;setBusy(true);setNotice("");
    try{const supabase=createClient();const {data,error}=await supabase.from("productions").insert({creator_id:userId,title:title.trim(),genre,synopsis:synopsis.trim(),poster_url:posterUrl||null,status:"pending"}).select("id,title,genre,status,created_at,rejection_reason,poster_url").single();
      if(error)throw error;setProductions(current=>[data as Production,...current]);setTitle("");setSynopsis("");setPosterUrl("");setNotice("Production submitted for admin review.");
    }catch(e){setNotice(e instanceof Error?e.message:"Unable to submit production.");}finally{setBusy(false);}
  }

  async function submitEpisode(e:React.FormEvent){
    e.preventDefault();if(!episodeProduction||!videoFile)return;
    const number=Number(episodeNumber);const price=isFree?0:Number(coinPrice);
    if(!Number.isInteger(number)||number<1){setEpisodeNotice("Enter a valid episode number.");return;}
    if(!isFree&&(!Number.isInteger(price)||price<1)){setEpisodeNotice("Paid episodes must cost at least 1 coin.");return;}
    if(!videoFile.type.startsWith("video/")){setEpisodeNotice("Choose a valid video file.");return;}
    if(videoFile.size>500*1024*1024){setEpisodeNotice("Video must be 500 MB or smaller.");return;}
    setEpisodeBusy(true);setEpisodeNotice("Uploading video to Cloudinary…");
    try{
      const uploaded=await uploadToCloudinary(videoFile,"episode");
      setEpisodeNotice("Video uploaded. Saving episode…");
      const supabase=createClient();
      const {data,error}=await supabase.from("episodes").insert({production_id:episodeProduction,title:episodeTitle.trim(),episode_number:number,video_url:uploaded.url,cloudinary_public_id:uploaded.publicId,coin_price:price,is_free:isFree,status:"pending"}).select("id,production_id,title,episode_number,coin_price,is_free,status,created_at,rejection_reason").single();
      if(error)throw error;
      setEpisodes(current=>[...(current.filter(ep=>ep.production_id===episodeProduction)),data as Episode].sort((a,b)=>a.episode_number-b.episode_number).concat(current.filter(ep=>ep.production_id!==episodeProduction)));
      setEpisodeTitle("");setVideoFile(null);setEpisodeNumber(String(number+1));setEpisodeNotice("Episode submitted. It will be available after admin approval.");
    }catch(e){setEpisodeNotice(e instanceof Error?e.message:"Episode upload failed.");}
    finally{setEpisodeBusy(false);}
  }

  const approvedProductions=productions.filter(p=>p.status==="approved");
  return <main className="page-shell min-h-screen">
    <header className="container flex h-[70px] items-center justify-between border-b border-white/[.07]"><a href="/" className="text-xl font-black">DOVEL<span className="text-[#ef4037]">.</span></a><a href="/explore" className="text-xs text-white/60">Explore stories</a></header>
    <div className="container max-w-3xl py-12">
      <p className="text-[10px] font-bold tracking-[.2em] text-[#f5b942]">DOVEL STUDIO</p><h1 className="mt-2 text-3xl font-bold">Bring your story to life.</h1><p className="mt-2 text-sm text-white/50">One account lets you watch, discover and publish AI-generated productions.</p>
      <div className="glass mt-8 rounded-2xl p-6 sm:p-8"><h2 className="text-lg font-bold">New production</h2>
        <form onSubmit={submitProduction} className="mt-6 space-y-5">
          <label className="block text-xs text-white/60">Production title<input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#ef4037]" placeholder="Your story title"/></label>
          <label className="block text-xs text-white/60">Genre<select value={genre} onChange={e=>setGenre(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"><option>Drama</option><option>Romance</option><option>Thriller</option><option>Horror</option><option>Fantasy</option><option>Campus drama</option></select></label>
          <label className="block text-xs text-white/60">Synopsis<textarea required minLength={20} maxLength={1200} rows={4} value={synopsis} onChange={e=>setSynopsis(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#ef4037]" placeholder="What is your story about? (at least 20 characters)"/></label>
          <label className="block text-xs text-white/60">Production poster (optional, JPG/PNG/WebP, max 10 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file)void handlePosterUpload(file);}} className="mt-2 block w-full text-xs text-white/60"/></label>
          {posterUrl&&<div className="flex items-center gap-3"><img src={posterUrl} alt="Uploaded production poster" className="h-24 w-16 rounded-lg object-cover"/><span className="text-xs text-emerald-300">Poster ready</span></div>}
          <button disabled={busy||loading||uploading} className="btn-primary disabled:opacity-50">{uploading?"Uploading poster…":busy?"Submitting…":"Submit for review"}</button>
        </form>
        {notice&&<p role="status" className="mt-4 text-xs text-amber-300">{notice}</p>}
      </div>

      <section className="mt-10"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Your productions</h2><span className="pill">{productions.length} total</span></div>
        {loading?<p className="text-sm text-white/40">Loading your studio…</p>:productions.length===0?<div className="glass rounded-xl p-7 text-center text-sm text-white/45">Your submitted productions will appear here.</div>:<div className="space-y-3">{productions.map(p=><article key={p.id} className="glass flex flex-col justify-between gap-3 rounded-xl p-5 sm:flex-row sm:items-center"><div className="flex gap-3">{p.poster_url&&<img src={p.poster_url} alt="" className="h-20 w-14 rounded object-cover"/>}<div><h3 className="font-semibold">{p.title}</h3><p className="mt-1 text-xs text-white/45">{p.genre} · Submitted {new Date(p.created_at).toLocaleDateString()}</p>{p.rejection_reason&&<p className="mt-2 text-xs text-red-300">Review note: {p.rejection_reason}</p>}</div></div><span className={`pill w-fit capitalize ${statusStyle[p.status]}`}>{p.status}</span></article>)}</div>}
      </section>

      <section className="glass mt-12 rounded-2xl p-6 sm:p-8"><p className="text-[10px] font-bold tracking-[.2em] text-[#f5b942]">EPISODE MANAGER</p><h2 className="mt-2 text-xl font-bold">Upload an episode</h2><p className="mt-2 text-xs leading-5 text-white/45">Only approved productions can receive episodes. Videos are reviewed by an admin before viewers can watch them.</p>
        {approvedProductions.length===0?<div className="mt-5 rounded-xl border border-white/10 p-5 text-sm text-white/50">Once one of your productions is approved, you can upload its episodes here.</div>:<form onSubmit={submitEpisode} className="mt-6 space-y-4">
          <label className="block text-xs text-white/60">Production<select required value={episodeProduction} onChange={e=>setEpisodeProduction(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">{approvedProductions.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs text-white/60">Episode title<input required maxLength={100} value={episodeTitle} onChange={e=>setEpisodeTitle(e.target.value)} placeholder="The beginning" className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"/></label><label className="block text-xs text-white/60">Episode number<input required type="number" min="1" step="1" value={episodeNumber} onChange={e=>setEpisodeNumber(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"/></label></div>
          <label className="block text-xs text-white/60">Video file (MP4 recommended, max 500 MB)<input required type="file" accept="video/*" onChange={e=>setVideoFile(e.target.files?.[0]??null)} className="mt-2 block w-full text-xs text-white/60"/></label>
          <label className="flex items-center gap-3 text-sm text-white/70"><input type="checkbox" checked={isFree} onChange={e=>setIsFree(e.target.checked)} className="accent-[#ef4037]"/>Free preview episode</label>
          {!isFree&&<label className="block text-xs text-white/60">Unlock price (coins)<input required type="number" min="1" step="1" value={coinPrice} onChange={e=>setCoinPrice(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"/></label>}
          <button disabled={episodeBusy||!videoFile} className="btn-primary disabled:opacity-50">{episodeBusy?"Uploading / submitting…":"Upload episode for review"}</button>
        </form>}
        {episodeNotice&&<p role="status" className="mt-4 text-xs text-amber-300">{episodeNotice}</p>}
      </section>

      <section className="mt-10"><h2 className="mb-4 text-xl font-bold">Your episodes</h2>{episodes.length===0?<div className="glass rounded-xl p-6 text-sm text-white/40">No episodes submitted yet.</div>:<div className="space-y-3">{episodes.map(ep=><article key={ep.id} className="glass flex flex-col justify-between gap-3 rounded-xl p-4 sm:flex-row sm:items-center"><div><h3 className="font-semibold">Episode {ep.episode_number}: {ep.title}</h3><p className="mt-1 text-xs text-white/45">{productions.find(p=>p.id===ep.production_id)?.title??"Production"} · {ep.is_free?"Free preview":ep.coin_price+" coins"}</p>{ep.rejection_reason&&<p className="mt-2 text-xs text-red-300">Review note: {ep.rejection_reason}</p>}</div><span className={`pill w-fit capitalize ${statusStyle[ep.status]}`}>{ep.status}</span></article>)}</div>}</section>
    </div>
  </main>;
}
