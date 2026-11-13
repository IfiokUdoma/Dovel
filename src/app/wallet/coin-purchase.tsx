"use client";

import { useState } from "react";

type Order = {
  memo: string;
  amount: string;
  coins: number;
  asset_code: string;
  asset_issuer: string;
  payer_public_key: string;
  destination: string;
  network: string;
};

const bundles = [
  { coins: 100, amount: "0.50", label: "Starter pack" },
  { coins: 275, amount: "0.70", label: "Popular choice" },
  { coins: 600, amount: "1.00", label: "Best value" },
];

async function getFreighterTestnetAddress() {
  const { isConnected, requestAccess, getNetwork } = await import("@stellar/freighter-api");

  const connection = await isConnected();
  if (connection.error) throw new Error(connection.error.message);
  if (!connection.isConnected) {
    throw new Error("Freighter is not installed. Install the Freighter browser extension and try again.");
  }

  const access = await requestAccess();
  if (access.error) throw new Error(access.error.message);
  if (!access.address) throw new Error("Freighter did not return an account address.");

  const network = await getNetwork();
  if (network.error) throw new Error(network.error.message);
  if (network.network !== "TESTNET") {
    throw new Error("Switch Freighter to Stellar Testnet before continuing.");
  }

  return access.address;
}

export function CoinPurchase() {
  const [order, setOrder] = useState<Order | null>(null);
  const [txHash, setTxHash] = useState("");
  const [payerAddress, setPayerAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function connectWallet() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const address = await getFreighterTestnetAddress();
      setPayerAddress(address);
      setMessage("Freighter connected on Stellar Testnet.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect Freighter.");
    } finally {
      setLoading(false);
    }
  }

  async function createOrder(coins: number) {
    setLoading(true);
    setError("");
    setMessage("");
    setOrder(null);
    setTxHash("");
    try {
      // Re-read the active wallet and network at checkout, so a changed account
      // or network cannot silently be used for an order created from stale UI state.
      const address = await getFreighterTestnetAddress();
      setPayerAddress(address);

      const response = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle: coins, payerPublicKey: address }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create payment.");
      setOrder(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create payment.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyPayment() {
    if (!order || !txHash.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo: order.memo, transactionHash: txHash.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Payment verification failed.");
      setMessage(result.alreadyPaid ? "This payment was already credited." : `Payment confirmed! ${result.coins} coins added to your wallet.`);
      setOrder(null);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Get more coins</h2>
          <p className="mt-1 text-xs text-white/45">Pay with USDC on Stellar Testnet</p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-white/50">TESTNET</span>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Freighter wallet</p>
            <p className="mt-1 break-all font-mono text-[10px] text-white/45">
              {payerAddress ? payerAddress : "Not connected"}
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={connectWallet}
            className="rounded-lg border border-[#f5b942]/50 px-4 py-2 text-xs font-bold text-[#f5b942] disabled:opacity-50"
          >
            {loading ? "Please wait…" : payerAddress ? "Reconnect Freighter" : "Connect Freighter"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {bundles.map((b) => (
          <div key={b.coins} className="rounded-xl border border-white/10 bg-white/[.03] p-5">
            <p className="text-xs font-semibold text-[#f5b942]">{b.label}</p>
            <p className="mt-3 text-2xl font-black">
              {b.coins} <span className="text-xs font-semibold text-white/45">COINS</span>
            </p>
            <p className="mt-1 text-sm text-white/60">{b.amount} USDC</p>
            <button
              type="button"
              disabled={loading}
              onClick={() => createOrder(b.coins)}
              className="mt-5 w-full rounded-lg bg-[#ef4037] px-4 py-3 text-sm font-bold disabled:opacity-50"
            >
              {loading ? "Please wait…" : "Pay with USDC"}
            </button>
          </div>
        ))}
      </div>

      {order && (
        <div className="mt-5 rounded-xl border border-[#f5b942]/30 bg-white/[.03] p-5">
          <h3 className="font-bold">Complete your Stellar payment</h3>
          <p className="mt-1 text-xs text-white/50">
            Send the exact amount of USDC from the connected Freighter account on Stellar Testnet.
            Include the memo exactly as shown.
          </p>
          <div className="mt-4 space-y-3 text-sm">
            <div><p className="text-xs text-white/45">Amount</p><p className="font-bold">{order.amount} USDC</p></div>
            <div><p className="text-xs text-white/45">From (Freighter)</p><p className="break-all font-mono text-xs">{order.payer_public_key}</p></div>
            <div><p className="text-xs text-white/45">Destination</p><p className="break-all font-mono text-xs">{order.destination}</p></div>
            <div><p className="text-xs text-white/45">Memo (text)</p><p className="font-mono font-bold text-[#f5b942]">{order.memo}</p></div>
            <div><p className="text-xs text-white/45">USDC issuer</p><p className="break-all font-mono text-[10px]">{order.asset_issuer}</p></div>
          </div>
          <label className="mt-5 block text-xs text-white/60">
            After sending, paste the Stellar transaction hash
            <input
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="64-character transaction hash"
              className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-3 font-mono text-xs outline-none focus:border-[#f5b942]"
            />
          </label>
          <button
            type="button"
            disabled={loading || txHash.trim().length !== 64}
            onClick={verifyPayment}
            className="mt-3 w-full rounded-lg bg-[#f5b942] px-4 py-3 text-sm font-bold text-black disabled:opacity-40"
          >
            {loading ? "Verifying on Stellar…" : "Verify payment"}
          </button>
        </div>
      )}

      {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      <p className="mt-3 text-[10px] leading-relaxed text-white/35">
        Hackathon demo only. Testnet USDC has no monetary value. USDT0 is planned for Stellar Mainnet
        and is not available in this Testnet checkout.
      </p>
    </section>
  );
}
