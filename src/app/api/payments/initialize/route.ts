import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const BUNDLES: Record<string, { coins: number; amount: string }> = {
  "100": { coins: 100, amount: "0.50" },
  "275": { coins: 275, amount: "0.70" },
  "600": { coins: 600, amount: "1.00" },
};
const TESTNET_USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

    const { bundle, payerPublicKey } = await request.json();
    const selected = BUNDLES[String(bundle)];
    const treasury = process.env.STELLAR_TREASURY_PUBLIC_KEY;

    if (!selected) return NextResponse.json({ error: "Invalid coin bundle." }, { status: 400 });
    if (typeof payerPublicKey !== "string" || !/^G[A-Z2-7]{55}$/.test(payerPublicKey)) {
      return NextResponse.json({ error: "Connect a valid Freighter Stellar account first." }, { status: 400 });
    }
    if (!treasury || !/^G[A-Z2-7]{55}$/.test(treasury)) {
      return NextResponse.json({ error: "Stellar treasury public key is not configured." }, { status: 503 });
    }

    const memo = "dv" + randomBytes(10).toString("hex");
    const service = createServiceClient();
    const { data, error } = await service.from("stellar_payment_orders").insert({
      user_id: user.id,
      memo,
      payer_public_key: payerPublicKey,
      asset_code: "USDC",
      asset_issuer: process.env.STELLAR_USDC_ISSUER || TESTNET_USDC_ISSUER,
      amount: selected.amount,
      coins: selected.coins,
      status: "pending",
    }).select("memo,amount,coins,asset_code,asset_issuer,payer_public_key").single();

    if (error) throw error;
    return NextResponse.json({ ...data, destination: treasury, network: "testnet" });
  } catch (error) {
    console.error("Stellar order creation failed", error);
    return NextResponse.json({ error: "Could not create payment order." }, { status: 500 });
  }
}
