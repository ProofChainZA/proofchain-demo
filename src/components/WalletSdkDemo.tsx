"use client";

/**
 * @proofchain/wallet-sdk — Live demo (tab on the main demo page).
 *
 * Single-screen form for credentials, then renders every public SDK feature:
 *   • Discovery   — GET /tenants/{slug}/wallet-config
 *   • Provision   — <WalletProvision /> (CDP sign-in + auto-link)
 *   • Display     — <WalletDisplay />
 *   • Hooks       — useUserWallet / useExportKey
 *   • Inspector   — live JSON of every API request/response
 *
 * Originally lived at /wallet-sdk as its own page. Folded into the main demo
 * so CDP sees a single allow-listed HTTPS origin.
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
    typeof window !== "undefined" && window.localStorage.getItem("pcw_apiBaseUrl") ||
      "https://app.proofchain.co.za/api",
  );
  const [tenantSlug, setTenantSlug] = useState(
    typeof window !== "undefined" && window.localStorage.getItem("pcw_tenantSlug") ||
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
      // intentionally do not persist the JWT
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
          signed by your registered JWKS endpoint. Nothing is sent off-device until you
          submit.
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
// Sections rendered inside the provider
// ──────────────────────────────────────────────────────────────────────────────

function DiscoverySection({ apiBaseUrl, tenantSlug }: { apiBaseUrl: string; tenantSlug: string }) {
  const { log } = useInspector();
  const [data, setData] = useState<unknown>(null);
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

  return (
    <Card title="1. Discovery — GET /tenants/{slug}/wallet-config" subtitle="Public endpoint. Returns CDP project ID, supported networks, OAuth providers, and the embedded-wallets feature flag.">
      <button onClick={fetchConfig} style={secondaryBtn}>
        Re-fetch
      </button>
      {error && <pre style={errorBlock}>{error}</pre>}
      {data ? <pre style={codeBlock}>{JSON.stringify(data, null, 2)}</pre> : <p style={{ color: "#6b7280" }}>Loading…</p>}
    </Card>
  );
}

function ContextSection() {
  const ctx = useWalletContext();
  return (
    <Card title="2. Provider state — useWalletContext()" subtitle="What the SDK provider exposes once mounted.">
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

function ProvisionSection() {
  return (
    <Card title="3. Provision — <WalletProvision />" subtitle="Renders the CDP sign-in CTA. On sign-in, the SDK auto-calls POST /wallets/me/cdp-link to associate the resulting EOA + Smart Account pair with this end-user.">
      <div style={{ border: "1px dashed #d1d5db", borderRadius: 8, padding: 16, background: "#f9fafb" }}>
        <WalletProvision />
      </div>
    </Card>
  );
}

function DisplaySection() {
  return (
    <Card title="4. Display — <WalletDisplay />" subtitle="Shows the active delivery address (Smart Account), the underlying signing wallet (EOA), and an Export Key button (browser-side only).">
      <div style={{ border: "1px dashed #d1d5db", borderRadius: 8, padding: 16, background: "#f9fafb" }}>
        <WalletDisplay />
      </div>
    </Card>
  );
}

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
    <Card title="5. Hooks — useUserWallet / useExportKey" subtitle="Programmatic access if you want to build your own UI on top of the SDK primitives.">
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
    <Card title="6. Inspector — live request log" subtitle="Most recent 25 API calls and their responses. Updates in real time as you interact with the SDK above.">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button onClick={clear} style={ghostBtn}>
          Clear
        </button>
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
          Live exercise of every public component, hook, and API call exposed by the wallet
          SDK. CDP authentication happens entirely in the browser — ProofChain never sees
          your key material.
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
// Styles (inline so the page is self-contained, no extra Tailwind config)
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
