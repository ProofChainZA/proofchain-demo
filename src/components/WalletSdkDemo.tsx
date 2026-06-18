"use client";

/**
 * @proofchain/wallet-sdk — Live demo (tab on the main demo page).
 *
 * Single-screen form for credentials, then renders every public SDK feature:
 *   • Discovery   — GET /tenants/{slug}/wallet-config
 *   • Auth state  — useIsInitialized / useIsSignedIn / useCurrentUser / useEvmAddress
 *   • Custom UI   — headless Google / Apple / Email-OTP buttons built from CDP hooks
 *   • Provision   — <WalletProvision /> (CDP AuthButton + auto-link)
 *   • Display     — <WalletDisplay /> (asset + identity wallets)
 *   • Hooks       — useUserWallet / useExportKey
 *   • Inspector   — live JSON of every API request/response
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  ProofChainWalletProvider,
  WalletProvision,
  WalletDisplay,
  ExportModal,
  useUserWallet,
  useExportKey,
  useWalletContext,
  useIsInitialized,
  useIsSignedIn,
  useCurrentUser,
  useEvmAddress,
  useSignInWithEmail,
  useVerifyEmailOTP,
  useSignInWithOAuth,
  useSignOut,
} from "@proofchain/wallet-sdk";
import "@proofchain/wallet-sdk/styles.css";

// ──────────────────────────────────────────────────────────────────────────────
// Credentials form
// ──────────────────────────────────────────────────────────────────────────────

interface Credentials {
  apiBaseUrl: string;
  tenantSlug: string;
  jwt: string;
}

function CredentialsForm({
  onSubmit,
}: {
  onSubmit: (creds: Credentials) => void;
}) {
  const [apiBaseUrl, setApiBaseUrl] = useState(
    (typeof window !== "undefined" && window.localStorage.getItem("pcw_apiBaseUrl")) ||
      "https://app.proofchain.co.za/api",
  );
  const [tenantSlug, setTenantSlug] = useState(
    (typeof window !== "undefined" && window.localStorage.getItem("pcw_tenantSlug")) ||
      "",
  );
  const [jwt, setJwt] = useState("");
  const [showJwt, setShowJwt] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBaseUrl || !tenantSlug || !jwt) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pcw_apiBaseUrl", apiBaseUrl);
      window.localStorage.setItem("pcw_tenantSlug", tenantSlug);
    }
    onSubmit({ apiBaseUrl, tenantSlug, jwt });
  };

  return (
    <form
      onSubmit={submit}
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 24,
        display: "grid",
        gap: 16,
        maxWidth: 720,
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: 20 }}>Wallet SDK — Demo Credentials</h2>
        <p style={{ color: "#6b7280", marginTop: 4, fontSize: 14 }}>
          Provide the ProofChain API base URL, your tenant slug, and a valid end-user JWT
          signed by your registered JWKS endpoint. The JWT authorises ProofChain API calls
          — the actual <strong>end-user identity</strong> (Google / Apple / Email) is then
          chosen via CDP in the next screen.
        </p>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 13, color: "#374151" }}>API base URL</span>
        <input
          type="url"
          required
          value={apiBaseUrl}
          onChange={(e) => setApiBaseUrl(e.target.value)}
          placeholder="https://app.proofchain.co.za/api"
          style={inputStyle}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 13, color: "#374151" }}>Tenant slug</span>
        <input
          type="text"
          required
          value={tenantSlug}
          onChange={(e) => setTenantSlug(e.target.value)}
          placeholder="fanpass"
          style={inputStyle}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 13, color: "#374151" }}>
          End-user JWT
          <span style={{ color: "#9ca3af", fontWeight: 400, marginLeft: 6 }}>
            (RS256, must carry <code>wallet:read</code>, <code>wallet:link</code>,{" "}
            <code>wallet:audit</code>)
          </span>
        </span>
        <textarea
          required
          value={jwt}
          onChange={(e) => setJwt(e.target.value)}
          rows={4}
          placeholder="eyJhbGciOi..."
          style={{
            ...inputStyle,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12,
            filter: showJwt ? "none" : "blur(3px)",
          }}
          onFocus={() => setShowJwt(true)}
          onBlur={() => setShowJwt(false)}
        />
      </label>

      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" style={primaryBtn}>
          Mount Wallet SDK
        </button>
        <button
          type="button"
          onClick={() => {
            setApiBaseUrl("https://app.proofchain.co.za/api");
            setTenantSlug("");
            setJwt("");
          }}
          style={ghostBtn}
        >
          Reset
        </button>
      </div>
    </form>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Inspector — live JSON of API responses
// ──────────────────────────────────────────────────────────────────────────────

type InspectorEntry = {
  ts: string;
  label: string;
  data: unknown;
};

const InspectorContext = React.createContext<{
  log: (label: string, data: unknown) => void;
  entries: InspectorEntry[];
  clear: () => void;
}>({ log: () => {}, entries: [], clear: () => {} });

function InspectorProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<InspectorEntry[]>([]);
  const log = (label: string, data: unknown) =>
    setEntries((prev) => [
      { ts: new Date().toISOString().slice(11, 23), label, data },
      ...prev,
    ].slice(0, 25));
  const clear = () => setEntries([]);
  return (
    <InspectorContext.Provider value={{ log, entries, clear }}>
      {children}
    </InspectorContext.Provider>
  );
}

function useInspector() {
  return React.useContext(InspectorContext);
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. Discovery
// ──────────────────────────────────────────────────────────────────────────────

function DiscoverySection({ apiBaseUrl, tenantSlug }: { apiBaseUrl: string; tenantSlug: string }) {
  const { log } = useInspector();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/tenants/${encodeURIComponent(tenantSlug)}/wallet-config`);
      const body = await res.json();
      setData(body);
      log(`GET /tenants/${tenantSlug}/wallet-config → ${res.status}`, body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      log("GET wallet-config FAILED", msg);
    }
  };

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl, tenantSlug]);

  const ready =
    data &&
    data.embedded_wallets_enabled === true &&
    typeof data.cdp_project_id === "string" &&
    data.cdp_project_id.length > 0;

  return (
    <Card
      title="1. Discovery — GET /tenants/{slug}/wallet-config"
      subtitle="Public, unauthenticated endpoint. Returns CDP project ID, supported networks, OAuth providers, and the embedded-wallets feature flag. If embedded_wallets_enabled is false or cdp_project_id is null, no login UI will render below."
    >
      <button onClick={fetchConfig} style={secondaryBtn}>Re-fetch</button>
      {error && <pre style={errorBlock}>{error}</pre>}
      {data && (
        <div style={{ display: "flex", gap: 8, margin: "10px 0", flexWrap: "wrap" }}>
          <Pill ok={data.embedded_wallets_enabled}>
            embedded_wallets_enabled = {String(data.embedded_wallets_enabled)}
          </Pill>
          <Pill ok={ready}>
            cdp_project_id = {data.cdp_project_id ? "set" : "null"}
          </Pill>
          <Pill ok={Array.isArray(data.oauth_providers) && data.oauth_providers.length > 0}>
            oauth: {(data.oauth_providers ?? []).join(", ") || "—"}
          </Pill>
        </div>
      )}
      {data ? <pre style={codeBlock}>{JSON.stringify(data, null, 2)}</pre> : <p style={{ color: "#6b7280" }}>Loading…</p>}
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 2. Provider state
// ──────────────────────────────────────────────────────────────────────────────

function ContextSection() {
  const ctx = useWalletContext();
  return (
    <Card title="2. Provider state — useWalletContext()" subtitle="Internal SDK state. If cdpProjectId is null and loading=false, CDP is NOT mounted and the auth UI below will be inert.">
      <pre style={codeBlock}>
{JSON.stringify(
  {
    cdpProjectId: ctx.cdpProjectId,
    loading: ctx.loading,
    error: ctx.error,
    config: {
      apiBaseUrl: ctx.config.apiBaseUrl,
      tenantSlug: ctx.config.tenantSlug,
      hasGetAuthToken: typeof ctx.config.getAuthToken === "function",
      theme: ctx.config.theme,
    },
  },
  null,
  2,
)}
      </pre>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. Auth state — visibility into CDP
// ──────────────────────────────────────────────────────────────────────────────

function AuthStateSection() {
  const { isInitialized } = useIsInitialized();
  const { isSignedIn } = useIsSignedIn();
  const { currentUser } = useCurrentUser();
  const { evmAddress } = useEvmAddress();
  const { signOut } = useSignOut();
  const { log } = useInspector();

  const doSignOut = async () => {
    await signOut();
    log("useSignOut()", { signedOut: true });
  };

  return (
    <Card
      title="3. CDP auth state — useIsInitialized / useIsSignedIn / useCurrentUser / useEvmAddress"
      subtitle="Live status of the CDP session. If isSignedIn=true on first load, your browser had a cached session (this is the 'just a JWT created a wallet' mystery). Sign out to reproduce a clean login."
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Pill ok={isInitialized}>isInitialized = {String(isInitialized)}</Pill>
        <Pill ok={isSignedIn}>isSignedIn = {String(isSignedIn)}</Pill>
        <Pill ok={!!evmAddress}>evmAddress = {evmAddress ? `${evmAddress.slice(0, 8)}…` : "—"}</Pill>
      </div>
      <pre style={codeBlock}>
{JSON.stringify({ currentUser, evmAddress }, null, 2)}
      </pre>
      {isSignedIn && (
        <button onClick={doSignOut} style={dangerBtn}>
          Sign out (clear CDP session)
        </button>
      )}
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 4. Custom headless login UI — built from raw hooks (this is what FanPass needs)
// ──────────────────────────────────────────────────────────────────────────────

function CustomLoginSection() {
  const { isSignedIn } = useIsSignedIn();
  const { signInWithOAuth } = useSignInWithOAuth();
  const { signInWithEmail } = useSignInWithEmail();
  const { verifyEmailOTP } = useVerifyEmailOTP();
  const { log } = useInspector();

  const [email, setEmail] = useState("");
  const [flowId, setFlowId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const oauth = async (provider: "google" | "apple") => {
    setErr(null);
    setBusy(provider);
    try {
      await signInWithOAuth(provider);
      log(`useSignInWithOAuth("${provider}")`, { status: "redirect-or-popup-initiated" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      log(`signInWithOAuth(${provider}) FAILED`, msg);
    } finally {
      setBusy(null);
    }
  };

  const sendCode = async () => {
    setErr(null);
    setBusy("email");
    try {
      const res = await signInWithEmail({ email });
      setFlowId(res.flowId);
      log("useSignInWithEmail()", { flowId: res.flowId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      log("signInWithEmail FAILED", msg);
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    if (!flowId) return;
    setErr(null);
    setBusy("verify");
    try {
      const res = await verifyEmailOTP({ flowId, otp });
      log("useVerifyEmailOTP()", res);
      setFlowId(null);
      setOtp("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      log("verifyEmailOTP FAILED", msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card
      title="4. Custom login UI — built from headless hooks (FanPass pattern)"
      subtitle="This is exactly what your frontend will look like. No CDP-branded buttons. You own every pixel. Hooks: useSignInWithOAuth, useSignInWithEmail + useVerifyEmailOTP."
    >
      {isSignedIn ? (
        <p style={{ color: "#065f46", background: "#d1fae5", padding: 12, borderRadius: 6, margin: 0 }}>
          ✓ Already signed in. Sign out above to test the login UI from scratch.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => oauth("google")} disabled={!!busy} style={oauthBtn}>
              {busy === "google" ? "Opening Google…" : "Continue with Google"}
            </button>
            <button onClick={() => oauth("apple")} disabled={!!busy} style={oauthBtn}>
              {busy === "apple" ? "Opening Apple…" : "Continue with Apple"}
            </button>
          </div>

          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
            <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "#6b7280" }}>
              Or sign in with email (OTP):
            </p>
            {!flowId ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={sendCode} disabled={!email || !!busy} style={primaryBtn}>
                  {busy === "email" ? "Sending…" : "Send code"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit code"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={verify} disabled={!otp || !!busy} style={primaryBtn}>
                  {busy === "verify" ? "Verifying…" : "Verify"}
                </button>
                <button onClick={() => { setFlowId(null); setOtp(""); }} style={ghostBtn}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          {err && <pre style={errorBlock}>{err}</pre>}
        </div>
      )}
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 5. Built-in <WalletProvision /> (CDP's own AuthButton)
// ──────────────────────────────────────────────────────────────────────────────

function ProvisionSection() {
  return (
    <Card
      title="5. Provision — <WalletProvision /> (built-in CDP AuthButton)"
      subtitle="The drop-in component. Renders CDP's AuthButton (which opens a modal with Google / Apple / Email). On sign-in, the SDK auto-calls POST /wallets/me/cdp-link."
    >
      <div style={{ border: "1px dashed #d1d5db", borderRadius: 8, padding: 16, background: "#f9fafb" }}>
        <WalletProvision />
      </div>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 6. Display — both asset + identity wallets
// ──────────────────────────────────────────────────────────────────────────────

function DisplaySection() {
  const { data } = useUserWallet();
  const signing = data?.wallets?.find((w: any) => w.role === "signing");
  const identity = data?.wallets?.find((w: any) => w.role === "identity");

  return (
    <Card
      title="6. Display — <WalletDisplay /> + dual-wallet breakdown"
      subtitle="The SDK provisions TWO wallets per user: an EOA (signing / asset wallet) and a Smart Account (identity / delivery address)."
    >
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginBottom: 16 }}>
        <WalletCard label="Asset wallet (EOA — signing)" wallet={signing} />
        <WalletCard label="Identity wallet (Smart Account)" wallet={identity} />
      </div>
      <div style={{ border: "1px dashed #d1d5db", borderRadius: 8, padding: 16, background: "#f9fafb" }}>
        <WalletDisplay />
      </div>
    </Card>
  );
}

function WalletCard({ label, wallet }: { label: string; wallet: any }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fff" }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      {wallet ? (
        <>
          <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, wordBreak: "break-all" }}>
            {wallet.address}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
            type: {wallet.wallet_type} · role: {wallet.role ?? "—"}
          </div>
        </>
      ) : (
        <div style={{ color: "#9ca3af", fontStyle: "italic", fontSize: 13 }}>Not provisioned yet</div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 7. Hooks playground
// ──────────────────────────────────────────────────────────────────────────────

function HooksSection() {
  const { data, loading, error, refetch } = useUserWallet();
  const { auditExport, loading: auditLoading } = useExportKey();
  const { log } = useInspector();
  const [showExport, setShowExport] = useState(false);

  const doRefetch = async () => {
    await refetch();
    log("useUserWallet.refetch()", data);
  };

  const doAudit = async () => {
    try {
      await auditExport("base-mainnet");
      log("POST /wallets/me/audit-export", { network: "base-mainnet", status: "recorded" });
    } catch (err) {
      log("audit-export FAILED", err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Card title="7. Hooks — useUserWallet / useExportKey" subtitle="Programmatic access if you want to build your own UI on top of the SDK primitives.">
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={doRefetch} disabled={loading} style={secondaryBtn}>
          {loading ? "Refetching…" : "useUserWallet.refetch()"}
        </button>
        <button onClick={doAudit} disabled={auditLoading} style={secondaryBtn}>
          {auditLoading ? "Logging…" : "useExportKey.auditExport()"}
        </button>
        <button onClick={() => setShowExport(true)} style={dangerBtn} disabled={!data?.wallet_address}>
          Open ExportModal directly
        </button>
      </div>

      {error && <pre style={errorBlock}>{error}</pre>}

      <details>
        <summary style={{ cursor: "pointer", fontWeight: 500, marginBottom: 8 }}>Current data</summary>
        <pre style={codeBlock}>{JSON.stringify(data, null, 2)}</pre>
      </details>

      {showExport && data?.wallet_address && (
        <ExportModal walletAddress={data.wallet_address} onClose={() => setShowExport(false)} />
      )}
    </Card>
  );
}

function InspectorPanel() {
  const { entries, clear } = useInspector();
  return (
    <Card title="8. Inspector — live request log" subtitle="Most recent 25 API calls and their responses.">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button onClick={clear} style={ghostBtn}>Clear</button>
      </div>
      {entries.length === 0 ? (
        <p style={{ color: "#6b7280", fontStyle: "italic" }}>Nothing logged yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {entries.map((e, i) => (
            <details key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fafafa" }}>
              <summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                  {e.ts} — <strong>{e.label}</strong>
                </span>
              </summary>
              <pre style={{ ...codeBlock, marginTop: 8 }}>{JSON.stringify(e.data, null, 2)}</pre>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Top-level component
// ──────────────────────────────────────────────────────────────────────────────

export default function WalletSdkDemo() {
  const [creds, setCreds] = useState<Credentials | null>(null);

  const getAuthToken = useMemo(() => {
    if (!creds) return () => "";
    return () => creds.jwt;
  }, [creds]);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>@proofchain/wallet-sdk demo</h1>
        <p style={{ color: "#6b7280", marginTop: 6 }}>
          The JWT authorises ProofChain API calls. The end-user identity (Google / Apple / Email)
          is chosen via CDP below. Key material never leaves the browser.
        </p>
      </header>

      {!creds ? (
        <CredentialsForm onSubmit={setCreds} />
      ) : (
        <InspectorProvider>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{creds.tenantSlug}</strong>
              <span style={{ color: "#6b7280", marginLeft: 8 }}>@ {creds.apiBaseUrl}</span>
            </div>
            <button onClick={() => setCreds(null)} style={ghostBtn}>
              Change credentials
            </button>
          </div>

          <ProofChainWalletProvider
            apiBaseUrl={creds.apiBaseUrl}
            tenantSlug={creds.tenantSlug}
            getAuthToken={getAuthToken}
          >
            <div style={{ display: "grid", gap: 20 }}>
              <DiscoverySection apiBaseUrl={creds.apiBaseUrl} tenantSlug={creds.tenantSlug} />
              <ContextSection />
              <AuthStateSection />
              <CustomLoginSection />
              <ProvisionSection />
              <DisplaySection />
              <HooksSection />
              <InspectorPanel />
            </div>
          </ProofChainWalletProvider>
        </InspectorProvider>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
};

const primaryBtn: React.CSSProperties = {
  background: "#111827",
  color: "#fff",
  border: 0,
  padding: "10px 16px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
};

const secondaryBtn: React.CSSProperties = {
  background: "#fff",
  color: "#111827",
  border: "1px solid #d1d5db",
  padding: "8px 12px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
};

const oauthBtn: React.CSSProperties = {
  background: "#fff",
  color: "#111827",
  border: "1px solid #d1d5db",
  padding: "10px 18px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
};

const dangerBtn: React.CSSProperties = {
  background: "#dc2626",
  color: "#fff",
  border: 0,
  padding: "8px 12px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: "#374151",
  border: "1px solid #d1d5db",
  padding: "6px 10px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
};

const codeBlock: React.CSSProperties = {
  background: "#0f172a",
  color: "#e2e8f0",
  borderRadius: 6,
  padding: 12,
  overflow: "auto",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
  lineHeight: 1.5,
  margin: 0,
};

const errorBlock: React.CSSProperties = {
  background: "#fef2f2",
  color: "#991b1b",
  borderRadius: 6,
  padding: 12,
  fontSize: 13,
  margin: "8px 0",
};

function Pill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: ok ? "#d1fae5" : "#fee2e2",
        color: ok ? "#065f46" : "#991b1b",
        border: `1px solid ${ok ? "#a7f3d0" : "#fecaca"}`,
        padding: "3px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontFamily: "ui-monospace, monospace",
      }}
    >
      {children}
    </span>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
      {subtitle && <p style={{ color: "#6b7280", marginTop: 4, fontSize: 13 }}>{subtitle}</p>}
      <div style={{ marginTop: 12 }}>{children}</div>
    </section>
  );
}
