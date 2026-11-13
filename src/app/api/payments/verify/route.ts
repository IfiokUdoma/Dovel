import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const HORIZON = "https://horizon-testnet.stellar.org";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

    const { memo, transactionHash } = await request.json();
    if (typeof memo !== "string" || typeof transactionHash !== "string" || !/^[a-f0-9]{64}$/i.test(transactionHash)) {
      return NextResponse.json({ error: "Enter the payment memo and a valid Stellar transaction hash." }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: order, error } = await service.from("stellar_payment_orders")
      .select("*")
      .eq("memo", memo)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (!order) return NextResponse.json({ error: "Payment order not found." }, { status: 404 });
    if (order.status === "paid") return NextResponse.json({ success: true, alreadyPaid: true });
    if (!order.payer_public_key) {
      return NextResponse.json({ error: "This is an older order without a connected wallet. Create a new order using Freighter." }, { status: 400 });
    }

    const txResponse = await fetch(`${HORIZON}/transactions/${transactionHash}`, { cache: "no-store" });
    if (!txResponse.ok) return NextResponse.json({ error: "Transaction not found on Stellar Testnet yet." }, { status: 400 });
    const tx = await txResponse.json();

    if (!tx.successful || tx.memo !== memo || tx.memo_type !== "text") {
      return NextResponse.json({ error: "Transaction is unsuccessful or its memo does not match this order." }, { status: 400 });
    }

    const opsResponse = await fetch(`${HORIZON}/transactions/${transactionHash}/operations?limit=200`, { cache: "no-store" });
    if (!opsResponse.ok) throw new Error("Could not inspect Stellar payment operations.");
    const ops = await opsResponse.json();

    const validPayment = (ops._embedded?.records || []).some((op: any) =>
      op.type === "payment" &&
      op.from === order.payer_public_key &&
      op.to === process.env.STELLAR_TREASURY_PUBLIC_KEY &&
      op.asset_type === "credit_alphanum4" &&
      op.asset_code === order.asset_code &&
      op.asset_issuer === order.asset_issuer &&
      op.amount === Number(order.amount).toFixed(7)
    );

    if (!validPayment) {
      return NextResponse.json({ error: "No exact USDC payment from the connected Freighter account to Dovel's treasury was found in this transaction." }, { status: 400 });
    }

    const { data: credit, error: creditError } = await service.rpc("credit_stellar_coin_purchase", {
      p_memo: memo,
      p_transaction_hash: transactionHash,
    });
    if (creditError) throw creditError;

    return NextResponse.json({ success: true, credited: Boolean(credit?.credited), coins: order.coins });
  } catch (error) {
    console.error("Stellar payment verification failed", error);
    return NextResponse.json({ error: "Could not verify payment. Please try again." }, { status: 500 });
  }
}
