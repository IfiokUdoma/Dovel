"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/");
  return supabase;
}

export async function moderateProduction(formData: FormData) {
  const productionId = String(formData.get("production_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(productionId)) throw new Error("Invalid production ID.");
  if (decision !== "approved" && decision !== "rejected") throw new Error("Invalid moderation decision.");
  if (decision === "rejected" && !reason) throw new Error("Add a reason before rejecting this production.");
  const supabase = await requireAdmin();
  const { error } = await supabase.rpc("moderate_production", {
    p_production_id: productionId, p_decision: decision,
    p_reason: decision === "rejected" ? reason : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin"); revalidatePath("/studio"); revalidatePath("/");
  revalidatePath("/explore");
}

export async function moderateEpisode(formData: FormData) {
  const episodeId = String(formData.get("episode_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(episodeId)) throw new Error("Invalid episode ID.");
  if (decision !== "approved" && decision !== "rejected") throw new Error("Invalid moderation decision.");
  if (decision === "rejected" && !reason) throw new Error("Add a reason before rejecting this episode.");
  const supabase = await requireAdmin();
  const { error } = await supabase.rpc("moderate_episode", {
    p_episode_id: episodeId, p_decision: decision,
    p_reason: decision === "rejected" ? reason : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin"); revalidatePath("/studio"); revalidatePath("/");
  revalidatePath("/explore");
}
