"use client";

/**
 * Branded wallet demo — end-user-facing UX showcasing the @proofchain/wallet-sdk
 * headless API. Built entirely with our own components (no <WalletProvision/>
 * or <WalletDisplay/>) to prove the SDK is fully customizable.
 *
 * Flow:
 *   1. Credentials gate (API URL, tenant slug, end-user JWT)
 *   2. Sign-in screen — Google, Apple, email (with OTP)
 *   3. Provisioning spinner
 *   4. Wallet dashboard — addresses, balance, copy, export, sign-out
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ProofChainWalletProvider,
  ExportModal,
  useWalletProvisioning,
  useUserWallet,
  useSignInWithEmail,
  useSignInWithOAuth,
  useVerifyEmailOTP,
  useSignOut,
} from "@proofchain/wallet-sdk";
import "@proofchain/wallet-sdk/styles.css";

// ──────────────────────────────────────────────────────────────────────────────
// Credentials gate (shares localStorage with the SDK reference demo)
// ──────────────────────────────────────────────────────────────────────────────

interface Credentials {
  apiBaseUrl: string;
  tenantSlug: string;
  jwt: string;
}

function CredentialsGate({ onSubmit }: { onSubmit: (creds: Credentials) => void }) {
  const [apiBaseUrl, setApiBaseUrl] = useState(
    (typeof window !== "undefined" && window.localStorage.getItem("pcw_apiBaseUrl")) ||
      "https://app.proofchain.co.za/api",
  );
  const [tenantSlug, setTenantSlug] = useState(
    (typeof window !== "undefined" && window.localStorage.getItem("pcw_tenantSlug")) || "",
  );
  const [jwt, setJwt] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBaseUrl || !tenantSlug || !jwt) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pcw_apiBaseUrl", apiBaseUrl);
      window.localStorage.setItem("pcw_tenantSlug", tenantSlug);
      // Persist JWT in sessionStorage so the CDP OAuth redirect (which remounts
      // the React tree) doesn't drop it. Cleared when the tab closes.
      window.sessionStorage.setItem("pcw_demo_jwt", jwt);
    }
    onSubmit({ apiBaseUrl, tenantSlug, jwt });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-6 mb-4">
        <h3 className="font-semibold text-indigo-900 mb-1">Demo credentials required</h3>
        <p className="text-sm text-indigo-700">
          The wallet SDK is JWKS-only — we never accept API keys in the browser.
          Provide a tenant slug and an end-user JWT issued by your JWKS endpoint to
          continue.
        </p>
      </div>

      <form onSubmit={submit} className="bg-white border rounded-2xl p-6 space-y-4 shadow-sm">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">API base URL</span>
          <input
            type="url"
            required
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Tenant slug</span>
          <input
            type="text"
            required
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            placeholder="fanpass"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            End-user JWT
            <span className="text-gray-400 font-normal ml-2">
              (RS256, with <code>wallet:read</code>, <code>wallet:link</code>, <code>wallet:audit</code>)
            </span>
          </span>
          <textarea
            required
            value={jwt}
            onChange={(e) => setJwt(e.target.value)}
            rows={4}
            placeholder="eyJhbGciOi..."
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </label>
        <button
          type="submit"
          className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-medium shadow-sm transition-all"
        >
          Continue to wallet
        </button>
      </form>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Sign-in screen — Google / Apple / Email (OTP)
// ──────────────────────────────────────────────────────────────────────────────

function SignInScreen() {
  const { signInWithOAuth } = useSignInWithOAuth();
  const { signInWithEmail } = useSignInWithEmail();
  const { verifyEmailOTP } = useVerifyEmailOTP();

  const [mode, setMode] = useState<"choose" | "email" | "otp">("choose");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [flowId, setFlowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const oauth = async (provider: "google" | "apple") => {
    setError(null);
    try {
      await signInWithOAuth(provider as never);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const startEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await signInWithEmail({ email });
      setFlowId(res.flowId);
      setMode("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flowId) return;
    setLoading(true);
    setError(null);
    try {
      await verifyEmailOTP({ flowId, otp });
      // `useWalletProvisioning` upstream will pick up the sign-in and link.
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-2xl mb-4 shadow-lg shadow-indigo-200">
          🪪
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Create your wallet</h2>
        <p className="text-sm text-gray-500 mt-1">
          Sign in with your favorite provider — we&apos;ll set up a secure wallet for you in seconds.
        </p>
      </div>

      {mode === "choose" && (
        <div className="space-y-3">
          <button
            onClick={() => oauth("google")}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-medium shadow-sm transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.05-3.72 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.48 12c0-.73.13-1.44.36-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            Continue with Google
          </button>

          <button
            onClick={() => oauth("apple")}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black hover:bg-gray-900 text-white rounded-xl font-medium shadow-sm transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M16.7 1c.1 1.3-.4 2.5-1.2 3.4-.8 1-2.1 1.7-3.4 1.6-.1-1.3.5-2.5 1.3-3.4.9-.9 2.1-1.5 3.3-1.6zM21 17.5c-.5 1.2-.8 1.7-1.5 2.7-1 1.5-2.5 3.4-4.3 3.4-1.6 0-2-1-4.2-1s-2.7 1-4.3 1c-1.8 0-3.1-1.7-4.2-3.2-2.8-4.1-3.1-9-1.4-11.7 1.2-1.9 3.1-3 4.9-3 1.8 0 3 1 4.5 1s2.5-1 4.6-1c1.6 0 3.4.9 4.6 2.4-4.1 2.2-3.4 7.9 1.3 9.4z" />
            </svg>
            Continue with Apple
          </button>

          <div className="relative my-2 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <span className="relative px-3 bg-white text-xs text-gray-400">or</span>
          </div>

          <button
            onClick={() => setMode("email")}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-medium shadow-sm transition"
          >
            ✉️ Continue with email
          </button>
        </div>
      )}

      {mode === "email" && (
        <form onSubmit={startEmail} className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Email address</span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full px-3 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium shadow-sm transition disabled:opacity-60"
          >
            {loading ? "Sending code…" : "Send verification code"}
          </button>
          <button
            type="button"
            onClick={() => setMode("choose")}
            className="w-full text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
        </form>
      )}

      {mode === "otp" && (
        <form onSubmit={submitOtp} className="space-y-3">
          <p className="text-sm text-gray-600 text-center">
            We sent a 6-digit code to <strong>{email}</strong>
          </p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            required
            autoFocus
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="w-full px-3 py-3 border border-gray-300 rounded-xl text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || otp.length < 6}
            className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium shadow-sm transition disabled:opacity-60"
          >
            {loading ? "Verifying…" : "Verify and create wallet"}
          </button>
          <button
            type="button"
            onClick={() => { setMode("email"); setOtp(""); setFlowId(null); }}
            className="w-full text-sm text-gray-500 hover:text-gray-700"
          >
            ← Use a different email
          </button>
        </form>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-6">
        By continuing you agree to ProofChain&apos;s terms. Your keys are managed by Coinbase CDP — ProofChain never sees them.
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Wallet dashboard — addresses, balance, export, sign-out
// ──────────────────────────────────────────────────────────────────────────────

interface Balance {
  wei: bigint;
  eth: string;
  loading: boolean;
  error: string | null;
}

function useBalance(address: string | undefined): Balance & { refetch: () => void } {
  const [state, setState] = useState<Balance>({ wei: BigInt(0), eth: "0", loading: false, error: null });

  const refetch = useCallback(async () => {
    if (!address) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("https://mainnet.base.org", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getBalance",
          params: [address, "latest"],
        }),
      });
      const body = await res.json();
      if (body.error) throw new Error(body.error.message);
      const wei = BigInt(body.result);
      const eth = (Number(wei) / 1e18).toFixed(6);
      setState({ wei, eth, loading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err instanceof Error ? err.message : String(err) }));
    }
  }, [address]);

  useEffect(() => { refetch(); }, [refetch]);

  return { ...state, refetch };
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white/80 transition"
      title="Copy to clipboard"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function Dashboard() {
  const { wallet, refetch } = (() => {
    // We rely on useUserWallet directly for the freshest payload.
    const w = useUserWallet();
    return { wallet: w.data, refetch: w.refetch };
  })();
  const { signOut } = useSignOut();
  const [showExport, setShowExport] = useState(false);

  const smartAddress = wallet?.wallet_address ?? "";
  const signingAddress = useMemo(() => {
    if (!wallet?.wallets) return "";
    const eoa = wallet.wallets.find(
      (w) => w.role === "signing" || w.wallet_type === "eoa",
    );
    return eoa?.address ?? "";
  }, [wallet?.wallets]);
  const balance = useBalance(smartAddress);

  if (!wallet) {
    return (
      <div className="text-center py-12 text-gray-500">Loading your wallet…</div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hero card: smart account + balance */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 text-white shadow-2xl shadow-indigo-300">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-12 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs uppercase tracking-wider text-white/70">Your wallet</span>
            <span className="text-xs px-2 py-1 rounded-full bg-white/15 backdrop-blur">Base</span>
          </div>

          <div className="mb-1 text-sm text-white/70">Balance</div>
          <div className="flex items-baseline gap-2 mb-6">
            {balance.loading ? (
              <span className="text-3xl font-bold opacity-60">…</span>
            ) : balance.error ? (
              <span className="text-sm text-red-200">Couldn&apos;t fetch balance</span>
            ) : (
              <>
                <span className="text-4xl font-bold tabular-nums">{balance.eth}</span>
                <span className="text-lg text-white/70">ETH</span>
              </>
            )}
            <button
              onClick={() => { balance.refetch(); refetch(); }}
              className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur transition"
              disabled={balance.loading}
            >
              {balance.loading ? "Refreshing…" : "↻ Refresh"}
            </button>
          </div>

          <div className="text-xs text-white/70 uppercase tracking-wider mb-1">Smart account address</div>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono text-white/95 truncate">{smartAddress}</code>
            <CopyButton value={smartAddress} />
          </div>
        </div>
      </div>

      {/* Signing wallet card */}
      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500">Signing wallet (EOA)</div>
            <div className="text-sm text-gray-700 font-mono mt-1">{shorten(signingAddress)}</div>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(signingAddress)}
            className="text-xs text-indigo-600 hover:text-indigo-700"
          >
            Copy full
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          This is the underlying key that signs transactions. The smart account above is what you share for deposits.
        </p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => setShowExport(true)}
          className="px-4 py-3 bg-white border border-gray-300 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl text-sm font-medium text-gray-800 transition flex items-center justify-center gap-2"
        >
          🔐 Export private key
        </button>
        <button
          onClick={() => signOut()}
          className="px-4 py-3 bg-white border border-gray-300 hover:border-red-300 hover:bg-red-50 rounded-xl text-sm font-medium text-gray-800 transition flex items-center justify-center gap-2"
        >
          ↪ Sign out
        </button>
      </div>

      <div className="text-center">
        <a
          href={`https://basescan.org/address/${smartAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
        >
          View on BaseScan →
        </a>
      </div>

      {showExport && (
        <ExportModal walletAddress={smartAddress} onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Status router — switches on useWalletProvisioning().status
// ──────────────────────────────────────────────────────────────────────────────

function WalletShell() {
  const { status, error, link } = useWalletProvisioning();

  if (status === "initializing") {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="animate-pulse text-gray-400">Initializing wallet…</div>
      </div>
    );
  }

  if (status === "signed-out") return <SignInScreen />;

  if (status === "awaiting-accounts") {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
          <svg className="w-8 h-8 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Setting up your wallet…</h3>
        <p className="text-sm text-gray-500 mt-1">Creating your secure smart account on Base.</p>
      </div>
    );
  }

  if (status === "linking") {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
          <svg className="w-8 h-8 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Almost there…</h3>
        <p className="text-sm text-gray-500 mt-1">Linking your wallet to your account.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4 text-3xl">⚠️</div>
        <h3 className="text-lg font-semibold text-gray-900">Something went wrong</h3>
        <p className="text-sm text-red-600 mt-1">{error}</p>
        <button
          onClick={() => link()}
          className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  return <Dashboard />;
}

// ──────────────────────────────────────────────────────────────────────────────
// Top-level component (export default)
// ──────────────────────────────────────────────────────────────────────────────

export default function WalletDemo() {
  // Restore creds from storage on mount so the CDP OAuth redirect doesn't
  // strand us on the CredentialsGate. apiBaseUrl + tenantSlug live in
  // localStorage; the JWT lives in sessionStorage (tab-scoped) so it survives
  // the redirect but doesn't leak across tabs.
  const [creds, setCreds] = useState<Credentials | null>(() => {
    if (typeof window === "undefined") return null;
    const apiBaseUrl = window.localStorage.getItem("pcw_apiBaseUrl");
    const tenantSlug = window.localStorage.getItem("pcw_tenantSlug");
    const jwt = window.sessionStorage.getItem("pcw_demo_jwt");
    if (!apiBaseUrl || !tenantSlug || !jwt) return null;
    return { apiBaseUrl, tenantSlug, jwt };
  });

  const clearCreds = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("pcw_demo_jwt");
    }
    setCreds(null);
  };

  const getAuthToken = useMemo(() => {
    if (!creds) return () => "";
    return () => creds.jwt;
  }, [creds]);

  if (!creds) {
    return (
      <div className="py-8">
        <CredentialsGate onSubmit={setCreds} />
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="text-xs text-gray-500">
          <strong className="text-gray-700">{creds.tenantSlug}</strong>
          <span className="mx-2">·</span>
          {creds.apiBaseUrl}
        </div>
        <button
          onClick={clearCreds}
          className="text-xs text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
        >
          Change credentials
        </button>
      </div>

      <ProofChainWalletProvider
        apiBaseUrl={creds.apiBaseUrl}
        tenantSlug={creds.tenantSlug}
        getAuthToken={getAuthToken}
        loadingFallback={
          <div className="max-w-md mx-auto text-center py-20">
            <div className="animate-pulse text-gray-400">Loading wallet config…</div>
          </div>
        }
        errorFallback={(msg) => (
          <div className="max-w-md mx-auto text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4 text-3xl">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900">Couldn&apos;t reach wallet API</h3>
            <p className="text-sm text-red-600 mt-1">{msg}</p>
          </div>
        )}
      >
        <WalletShell />
      </ProofChainWalletProvider>
    </div>
  );
}
