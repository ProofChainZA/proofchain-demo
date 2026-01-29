'use client';

import { useState, useCallback } from 'react';
import ConfigPanel from '@/components/ConfigPanel';
import LogPanel, { LogEntry } from '@/components/LogPanel';

// Extend Window interface for MetaMask
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
    };
  }
}

type TabName = 'flow' | 'consent' | 'dataviews' | 'feedback' | 'passports' | 'ownership' | 'events' | 'tenant' | 'wallets' | 'quests';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SDKInstance = any;

interface GeneratedUser {
  userId: string;
  eventCount: number;
  hasConsent: boolean;
}

export default function Home() {
  const [partnerSDK, setPartnerSDK] = useState<SDKInstance>(null);
  const [tenantSDK, setTenantSDK] = useState<SDKInstance>(null);
  const [ingestionClient, setIngestionClient] = useState<SDKInstance>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<TabName>('flow');
  const [result, setResult] = useState<unknown>(null);

  // Demo flow state
  const [generatedUsers, setGeneratedUsers] = useState<GeneratedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState({ users: 0, events: 0, consents: 0, queries: 0, feedback: 0 });

  // Event generation state
  const [eventUserId, setEventUserId] = useState('');
  const [eventCount, setEventCount] = useState(50);
  const [userCount, setUserCount] = useState(3);

  // Consent state
  const [consentUserId, setConsentUserId] = useState('');

  // Data view state
  const [viewUserId, setViewUserId] = useState('');
  const [viewName, setViewName] = useState('');
  const [availableViews, setAvailableViews] = useState<string[]>([]);

  // Feedback state
  const [feedbackUserId, setFeedbackUserId] = useState('');
  const [feedbackType, setFeedbackType] = useState('');
  const [feedbackTypes, setFeedbackTypes] = useState<Array<{ type: string; name: string }>>([]);
  const [feedbackData, setFeedbackData] = useState<Record<string, unknown>>({});

  // Passport state
  const [passportUserId, setPassportUserId] = useState('');
  const [passportViews, setPassportViews] = useState<Array<{ slug: string; name: string }>>([]);
  const [selectedPassportView, setSelectedPassportView] = useState('');

  // Passport Attestation & Sharing state
  const [walletAddress, setWalletAddress] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [attestationData, setAttestationData] = useState<{ id: string; uid: string; wallet_address: string; passport_hash: string; passport_definition_name?: string } | null>(null);
  const [shareLinks, setShareLinks] = useState<Array<{ id: string; share_token: string; share_url: string; name: string; view_count: number }>>([]);
  const [creatingAttestation, setCreatingAttestation] = useState(false);
  const [linkingWallet, setLinkingWallet] = useState(false);
  const [creatingShareLink, setCreatingShareLink] = useState(false);
  const [shareLinkName, setShareLinkName] = useState('');
  const [shareLinkExpiry, setShareLinkExpiry] = useState(30);
  const [walletLinked, setWalletLinked] = useState(false);
  const [passportDefinitions, setPassportDefinitions] = useState<Array<{ id: string; name: string; slug: string; is_default: boolean }>>([]);
  const [selectedPassportSlug, setSelectedPassportSlug] = useState('');

  // Event search state
  const [eventSearchUserId, setEventSearchUserId] = useState('');
  const [eventSearchType, setEventSearchType] = useState('');
  const [eventSearchLimit, setEventSearchLimit] = useState(20);

  // Wallet testing state
  const [walletUsers, setWalletUsers] = useState<Array<{ user_id: string; wallets: Array<{ wallet_id: string; address: string; wallet_type: string; network: string; name?: string }> }>>([]);
  const [selectedWalletUser, setSelectedWalletUser] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<{ wallet_id: string; address: string; wallet_type: string; network: string } | null>(null);
  const [walletInfo, setWalletInfo] = useState<unknown>(null);
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('0.001');
  const [transferToken, setTransferToken] = useState('ETH');
  const [swapFromToken, setSwapFromToken] = useState('ETH');
  const [swapToToken, setSwapToToken] = useState('USDC');
  const [swapAmount, setSwapAmount] = useState('0.01');
  const [newWalletUserId, setNewWalletUserId] = useState('');
  const [walletLoading, setWalletLoading] = useState(false);

  // Quest demo state
  const [questUserId, setQuestUserId] = useState('');
  const [availableQuests, setAvailableQuests] = useState<Array<{ id: string; name: string; description: string; status: string; difficulty: string; reward_points: number; steps: Array<{ name: string; step_type: string; event_type?: string; target_count?: number }> }>>([]);
  const [selectedQuest, setSelectedQuest] = useState<{ id: string; name: string; steps: Array<{ name: string; step_type: string; event_type?: string; target_count?: number }> } | null>(null);
  const [questProgress, setQuestProgress] = useState<{ status: string; steps_completed: number; total_steps: number; completion_percentage: number; step_progress: Record<string, { completed: boolean; current_count: number; target_count: number }> } | null>(null);
  const [questLoading, setQuestLoading] = useState(false);
  const [simulatingEvents, setSimulatingEvents] = useState(false);

  // Consent widget modal state
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [campaignInfo, setCampaignInfo] = useState<{ name: string; partner: string; description: string; views: string[] } | null>(null);

  const addLog = useCallback((type: LogEntry['type'], message: string, data?: unknown) => {
    setLogs(prev => [{
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      message,
      data
    }, ...prev]);
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  const handleInitialize = useCallback(async (config: {
    baseUrl: string;
    integratorKey: string;
    campaignId: string;
    tenantApiKey: string;
  }) => {
    addLog('info', 'Initializing SDKs...');

    try {
      // Initialize Partner SDK
      if (config.integratorKey && config.campaignId) {
        const { ProofChainPartner } = await import('@proofchain/partner-sdk');
        const partner = new ProofChainPartner({
          apiKey: config.integratorKey,
          campaignId: config.campaignId,
          baseUrl: config.baseUrl,
          debug: true,
        });
        setPartnerSDK(partner);
        addLog('success', '✅ Partner SDK initialized (@proofchain/partner-sdk)');
      } else {
        addLog('info', '⚠️ Partner SDK skipped (missing integrator key or campaign ID)');
      }

      // Initialize Tenant SDK
      if (config.tenantApiKey) {
        const { ProofChain, IngestionClient } = await import('@proofchain/sdk');
        const tenant = new ProofChain({
          apiKey: config.tenantApiKey,
          baseUrl: config.baseUrl,
        });
        setTenantSDK(tenant);
        addLog('success', '✅ Tenant SDK initialized (@proofchain/sdk)');

        // Initialize Ingestion Client for high-performance event ingestion
        const ingestion = new IngestionClient({
          apiKey: config.tenantApiKey,
          ingestUrl: 'https://ingest.proofchain.co.za',
        });
        setIngestionClient(ingestion);
        addLog('success', '✅ Ingestion Client initialized (ingest.proofchain.co.za)');
      } else {
        addLog('info', '⚠️ Tenant SDK skipped (missing tenant API key)');
      }

      setIsConnected(true);
    } catch (error) {
      addLog('error', `❌ Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [addLog]);

  // =========================================================================
  // Event Generation (using Ingestion Client - ingest.proofchain.co.za)
  // =========================================================================
  const generateEvents = async () => {
    if (!ingestionClient) {
      addLog('error', '❌ Ingestion Client not initialized');
      return;
    }

    setIsGenerating(true);
    
    const eventTypes = [
      { type: 'page_view', category: 'engagement' },
      { type: 'video_watch', category: 'content' },
      { type: 'article_read', category: 'content' },
      { type: 'like_given', category: 'social' },
      { type: 'comment_posted', category: 'social' },
      { type: 'purchase', category: 'commerce' },
      { type: 'social_share', category: 'social' },
      { type: 'stream_listen', category: 'streaming' },
    ];

    const newUsers: GeneratedUser[] = [];
    let totalEvents = 0;

    try {
      // Generate for multiple users
      for (let u = 0; u < userCount; u++) {
        // Use custom ID if provided (for single user), otherwise generate random IDs
        const userId = eventUserId && userCount === 1 
          ? eventUserId 
          : `demo_${['taylor', 'jordan', 'alex', 'sam', 'casey', 'morgan', 'riley', 'drew'][u % 8]}_${Math.floor(Math.random() * 9000) + 1000}`;
        addLog('request', `Generating ${eventCount} events for user ${userId} via ingest.proofchain.co.za...`);

        const events = [];
        for (let i = 0; i < eventCount; i++) {
          const eventDef = eventTypes[Math.floor(Math.random() * eventTypes.length)];
          const daysAgo = Math.random() * 90;
          events.push({
            userId: userId,
            eventType: eventDef.type,
            eventSource: 'sdk_demo',
            data: {
              category: eventDef.category,
              session_id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              device: ['mobile', 'desktop', 'tablet'][Math.floor(Math.random() * 3)],
              value: Math.floor(Math.random() * 100),
              timestamp: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
            },
          });
        }

        // Use ingestion client for high-performance batch ingestion
        const response = await ingestionClient.ingestBatch({ events });
        addLog('success', `✅ Ingested ${response.queued || eventCount} events for ${userId}`, response);
        
        newUsers.push({ userId, eventCount, hasConsent: false });
        totalEvents += eventCount;
      }

      setGeneratedUsers(prev => [...prev, ...newUsers]);
      setStats(prev => ({ ...prev, users: prev.users + userCount, events: prev.events + totalEvents }));
      
      // Auto-select first user
      if (newUsers.length > 0) {
        const firstUser = newUsers[0].userId;
        setSelectedUser(firstUser);
        setConsentUserId(firstUser);
        setViewUserId(firstUser);
        setFeedbackUserId(firstUser);
        setPassportUserId(firstUser);
      }

      setResult({ users: newUsers, totalEvents });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Event generation failed: ${errMsg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // =========================================================================
  // Data Views (using Partner SDK)
  // =========================================================================
  const listDataViews = async () => {
    if (!partnerSDK) {
      addLog('error', '❌ Partner SDK not initialized');
      return;
    }

    addLog('request', 'partnerSDK.listDataViews()');
    try {
      const views = await partnerSDK.listDataViews();
      addLog('success', '✅ Data views listed', views);
      setResult(views);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };

  const executeDataView = async () => {
    if (!partnerSDK) {
      addLog('error', '❌ Partner SDK not initialized');
      return;
    }

    addLog('request', `partnerSDK.queryView('${viewUserId}', '${viewName}')`);
    try {
      const result = await partnerSDK.queryView(viewUserId, viewName);
      addLog('success', '✅ Data view executed', result);
      setResult(result);
      setStats(prev => ({ ...prev, queries: prev.queries + 1 }));
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };


  // =========================================================================
  // Passports (using Tenant SDK)
  // =========================================================================
  const getPassport = async () => {
    if (!tenantSDK) {
      addLog('error', '❌ Tenant SDK not initialized');
      return;
    }

    addLog('request', `tenantSDK.passports.getPassportV2('${passportUserId}')`);
    try {
      const passport = await tenantSDK.passports.getPassportV2(passportUserId);
      addLog('success', '✅ Passport fetched', passport);
      setResult(passport);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };

  const listPassportDefinitions = async () => {
    if (!tenantSDK) {
      addLog('error', '❌ Tenant SDK not initialized');
      return;
    }

    addLog('request', 'tenantSDK.passports.listPassportDefinitions()');
    try {
      const definitions = await tenantSDK.passports.listPassportDefinitions();
      addLog('success', `✅ Found ${definitions.length} passport definitions`, definitions);
      setResult(definitions);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };

  const listAvailableViews = async () => {
    if (!tenantSDK) {
      addLog('error', '❌ Tenant SDK not initialized');
      return;
    }

    addLog('request', 'tenantSDK.passports.listAvailableViews()');
    try {
      const views = await tenantSDK.passports.listAvailableViews();
      addLog('success', '✅ Available views listed', views);
      setResult(views);
      // Store views for dropdown
      if (Array.isArray(views)) {
        setPassportViews(views.map((v: { slug: string; name: string }) => ({ slug: v.slug, name: v.name })));
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };

  const getPassportView = async () => {
    if (!tenantSDK) {
      addLog('error', '❌ Tenant SDK not initialized');
      return;
    }
    if (!passportUserId || !selectedPassportView) {
      addLog('error', '❌ User ID and View are required');
      return;
    }

    addLog('request', `tenantSDK.passports.getPassportView('${passportUserId}', '${selectedPassportView}')`);
    try {
      const viewData = await tenantSDK.passports.getPassportView(passportUserId, selectedPassportView);
      addLog('success', '✅ Passport view data fetched', viewData);
      setResult(viewData);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };

  // =========================================================================
  // Passport Ownership & Sharing (Wallet Integration)
  // =========================================================================
  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      addLog('error', '❌ MetaMask not installed. Please install MetaMask to connect your wallet.');
      return;
    }

    addLog('request', 'Connecting wallet via MetaMask...');
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      const address = accounts[0];
      setWalletAddress(address);
      setWalletConnected(true);
      addLog('success', `✅ Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Wallet connection failed: ${errMsg}`);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setWalletConnected(false);
    setAttestationData(null);
    setWalletLinked(false);
    setShareLinks([]);
    addLog('info', 'Wallet disconnected');
  };

  const getClaimMessage = async () => {
    if (!tenantSDK || !passportUserId || !walletAddress) {
      addLog('error', '❌ SDK, User ID, and Wallet required');
      return null;
    }

    addLog('request', `Getting claim message for passport ${passportUserId}...`);
    try {
      // First get the passport to get its ID
      const passport = await tenantSDK.passports.getPassportV2(passportUserId);
      if (!passport || !passport.id) {
        addLog('error', '❌ Passport not found');
        return null;
      }

      // Get the claim message from the API
      const response = await fetch(
        `${tenantSDK.baseUrl}/passport-sharing/claim-message/${passport.id}?wallet_address=${walletAddress}`,
        {
          headers: {
            'X-API-Key': tenantSDK.apiKey,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to get claim message: ${response.statusText}`);
      }
      
      const messageData = await response.json();
      addLog('success', '✅ Claim message received', messageData.readable);
      return { passport, messageData };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Failed: ${errMsg}`);
      return null;
    }
  };

  const linkWallet = async () => {
    if (!tenantSDK || !passportUserId || !walletAddress) {
      addLog('error', '❌ SDK, User ID, and Wallet required');
      return;
    }

    setLinkingWallet(true);
    try {
      // Get link message from API
      addLog('request', 'Getting wallet link message...');
      const msgResponse = await fetch(
        `${tenantSDK.baseUrl}/passport-attestations/link-wallet/message?user_id=${passportUserId}&wallet_address=${walletAddress}`,
        { headers: { 'X-API-Key': tenantSDK.apiKey } }
      );
      
      if (!msgResponse.ok) {
        throw new Error('Failed to get link message');
      }
      
      const messageData = await msgResponse.json();
      addLog('info', 'Got message to sign', messageData);

      // Sign the message with MetaMask
      addLog('request', 'Requesting wallet signature...');
      const message = messageData.message;
      
      if (!window.ethereum) {
        throw new Error('MetaMask not available');
      }
      
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      }) as string;
      
      addLog('success', `✅ Message signed: ${signature.slice(0, 20)}...`);

      // Submit link to API
      addLog('request', 'Linking wallet to user...');
      const response = await fetch(`${tenantSDK.baseUrl}/passport-attestations/link-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': tenantSDK.apiKey,
        },
        body: JSON.stringify({
          user_id: passportUserId,
          wallet_address: walletAddress,
          signature: signature,
          message: message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Link failed');
      }

      const result = await response.json();
      setWalletLinked(true);
      addLog('success', '✅ Wallet linked successfully!', result);
      setResult(result);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Link failed: ${errMsg}`);
    } finally {
      setLinkingWallet(false);
    }
  };

  const loadPassportDefinitions = async () => {
    if (!tenantSDK) return;
    
    try {
      const response = await fetch(`${tenantSDK.baseUrl}/passport-attestations/passports`, {
        headers: { 'X-API-Key': tenantSDK.apiKey },
      });
      if (response.ok) {
        const data = await response.json();
        setPassportDefinitions(data);
        addLog('info', `Loaded ${data.length} passport definitions`);
      }
    } catch (error) {
      console.error('Failed to load passport definitions:', error);
    }
  };

  const createAttestation = async () => {
    if (!tenantSDK || !passportUserId) {
      addLog('error', '❌ SDK and User ID required');
      return;
    }

    setCreatingAttestation(true);
    try {
      const passportName = selectedPassportSlug 
        ? passportDefinitions.find(p => p.slug === selectedPassportSlug)?.name 
        : 'default';
      addLog('request', `Creating attestation for ${passportName} passport...`);
      
      const response = await fetch(`${tenantSDK.baseUrl}/passport-attestations/user/${passportUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': tenantSDK.apiKey,
        },
        body: JSON.stringify({
          passport_slug: selectedPassportSlug || undefined,
          include_cohort_scores: true,
          include_composite_score: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Attestation failed');
      }

      const attestation = await response.json();
      setAttestationData(attestation);
      addLog('success', '✅ Attestation created!', attestation);
      setResult(attestation);

      // Load share links
      await loadShareLinks();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Attestation failed: ${errMsg}`);
    } finally {
      setCreatingAttestation(false);
    }
  };

  const loadShareLinks = async () => {
    if (!tenantSDK || !passportUserId) return;

    addLog('request', 'Loading share links...');
    try {
      const response = await fetch(
        `${tenantSDK.baseUrl}/passport-attestations/share-links/${passportUserId}`,
        {
          headers: {
            'X-API-Key': tenantSDK.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load share links');
      }

      const links = await response.json();
      setShareLinks(links);
      addLog('success', `✅ Loaded ${links.length} share links`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Failed to load share links: ${errMsg}`);
    }
  };

  const createShareLink = async () => {
    if (!tenantSDK || !attestationData) {
      addLog('error', '❌ Must create attestation first');
      return;
    }

    setCreatingShareLink(true);
    addLog('request', 'Creating share link...');
    try {
      const response = await fetch(
        `${tenantSDK.baseUrl}/passport-attestations/${attestationData.id}/share`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': tenantSDK.apiKey,
          },
          body: JSON.stringify({
            name: shareLinkName || `Share Link ${new Date().toLocaleDateString()}`,
            expires_in_days: shareLinkExpiry,
            share_type: 'full',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create share link');
      }

      const link = await response.json();
      setShareLinks(prev => [link, ...prev]);
      setShareLinkName('');
      addLog('success', '✅ Share link created!', link);
      setResult(link);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setCreatingShareLink(false);
    }
  };

  const viewSharedPassport = async (shareToken: string) => {
    if (!tenantSDK) return;

    addLog('request', `Viewing shared passport: ${shareToken}`);
    try {
      const response = await fetch(`${tenantSDK.baseUrl}/p/${shareToken}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to view passport');
      }

      const data = await response.json();
      addLog('success', '✅ Shared passport data loaded', data);
      setResult(data);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };

  const verifySharedPassport = async (shareToken: string) => {
    if (!tenantSDK) return;

    addLog('request', `Verifying attestation for: ${shareToken}`);
    try {
      const response = await fetch(`${tenantSDK.baseUrl}/p/${shareToken}/verify`);
      
      if (!response.ok) {
        throw new Error('Verification failed');
      }

      const verification = await response.json();
      addLog('success', `✅ Verification: ${verification.verified ? 'VALID' : 'INVALID'}`, verification);
      setResult(verification);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };

  // =========================================================================
  // Events (using Tenant SDK)
  // =========================================================================
  const getUserEvents = async () => {
    if (!tenantSDK) {
      addLog('error', '❌ Tenant SDK not initialized');
      return;
    }
    if (!eventSearchUserId) {
      addLog('error', '❌ User ID is required');
      return;
    }

    addLog('request', `tenantSDK.search.byUser('${eventSearchUserId}', ${eventSearchLimit})`);
    try {
      const events = await tenantSDK.search.byUser(eventSearchUserId, eventSearchLimit);
      addLog('success', `✅ Found ${events.total} events for user`, events);
      setResult(events);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };

  const searchEvents = async () => {
    if (!tenantSDK) {
      addLog('error', '❌ Tenant SDK not initialized');
      return;
    }

    const filters: Record<string, unknown> = {};
    if (eventSearchUserId) filters.userIds = [eventSearchUserId];
    if (eventSearchType) filters.eventTypes = [eventSearchType];

    addLog('request', `tenantSDK.search.query({ filters: ${JSON.stringify(filters)}, limit: ${eventSearchLimit} })`);
    try {
      const results = await tenantSDK.search.query({ filters, limit: eventSearchLimit });
      addLog('success', `✅ Found ${results.total} events`, results);
      setResult(results);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };

  const getEventFacets = async () => {
    if (!tenantSDK) {
      addLog('error', '❌ Tenant SDK not initialized');
      return;
    }

    addLog('request', 'tenantSDK.search.facets()');
    try {
      const facets = await tenantSDK.search.facets();
      addLog('success', '✅ Event facets fetched', facets);
      setResult(facets);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };

  const getSearchStats = async () => {
    if (!tenantSDK) {
      addLog('error', '❌ Tenant SDK not initialized');
      return;
    }

    addLog('request', 'tenantSDK.search.stats()');
    try {
      const stats = await tenantSDK.search.stats();
      addLog('success', '✅ Search stats fetched', stats);
      setResult(stats);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };

  const getTenantInfo = async () => {
    if (!tenantSDK) {
      addLog('error', '❌ Tenant SDK not initialized');
      return;
    }

    addLog('request', 'tenantSDK.info()');
    try {
      const info = await tenantSDK.info();
      addLog('success', '✅ Tenant info fetched', info);
      setResult(info);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };

  const getUsageStats = async () => {
    if (!tenantSDK) {
      addLog('error', '❌ Tenant SDK not initialized');
      return;
    }

    addLog('request', 'tenantSDK.usage()');
    try {
      const usage = await tenantSDK.usage();
      addLog('success', '✅ Usage stats fetched', usage);
      setResult(usage);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };

  // =========================================================================
  // Wallet Testing Functions (using Tenant SDK)
  // =========================================================================
  const loadWalletUsers = async () => {
    if (!tenantSDK) {
      addLog('error', '❌ Tenant SDK not initialized');
      return;
    }

    setWalletLoading(true);
    addLog('request', 'tenantSDK.wallets.listUsersWithWallets()');
    try {
      const response = await tenantSDK.wallets.listUsersWithWallets(50, 0);
      setWalletUsers(response.users || []);
      addLog('success', `✅ Found ${response.users?.length || 0} users with wallets`, response);
      setResult(response);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setWalletLoading(false);
    }
  };

  const createDualWallets = async () => {
    if (!tenantSDK || !newWalletUserId) {
      addLog('error', '❌ Tenant SDK not initialized or no user ID');
      return;
    }

    setWalletLoading(true);
    addLog('request', `tenantSDK.wallets.createDual({ user_id: '${newWalletUserId}' })`);
    try {
      const result = await tenantSDK.wallets.createDual({ user_id: newWalletUserId, network: 'base-sepolia' });
      addLog('success', '✅ Dual wallets created!', result);
      setResult(result);
      // Refresh wallet users
      await loadWalletUsers();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setWalletLoading(false);
    }
  };

  const getWalletInfo = async () => {
    if (!tenantSDK || !selectedWallet) {
      addLog('error', '❌ No wallet selected');
      return;
    }

    setWalletLoading(true);
    addLog('request', `tenantSDK.wallets.getInfo('${selectedWallet.wallet_id}', { includeBalances: true, includeNfts: true, includeActivity: true })`);
    try {
      const info = await tenantSDK.wallets.getInfo(selectedWallet.wallet_id, {
        includeBalances: true,
        includeNfts: true,
        includeActivity: true,
      });
      setWalletInfo(info);
      addLog('success', '✅ Wallet info fetched', info);
      setResult(info);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setWalletLoading(false);
    }
  };

  const getUserWalletSummary = async () => {
    if (!tenantSDK || !selectedWalletUser) {
      addLog('error', '❌ No user selected');
      return;
    }

    setWalletLoading(true);
    addLog('request', `tenantSDK.wallets.getUserSummary('${selectedWalletUser}')`);
    try {
      const summary = await tenantSDK.wallets.getUserSummary(selectedWalletUser, true);
      addLog('success', '✅ User wallet summary fetched', summary);
      setResult(summary);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setWalletLoading(false);
    }
  };

  const executeTransfer = async () => {
    if (!tenantSDK || !selectedWallet || !transferTo || !transferAmount) {
      addLog('error', '❌ Missing transfer parameters');
      return;
    }

    setWalletLoading(true);
    addLog('request', `tenantSDK.wallets.transfer({ from: '${selectedWallet.address}', to: '${transferTo}', amount: '${transferAmount}', token: '${transferToken}' })`);
    try {
      const result = await tenantSDK.wallets.transfer({
        from_address: selectedWallet.address,
        to_address: transferTo,
        amount: transferAmount,
        token: transferToken,
        network: selectedWallet.network,
      });
      addLog('success', '✅ Transfer submitted!', result);
      setResult(result);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Transfer failed: ${errMsg}`);
    } finally {
      setWalletLoading(false);
    }
  };

  const getSwapQuote = async () => {
    if (!tenantSDK || !selectedWallet) {
      addLog('error', '❌ No wallet selected');
      return;
    }

    setWalletLoading(true);
    addLog('request', `tenantSDK.wallets.getSwapQuote({ from: '${swapFromToken}', to: '${swapToToken}', amount: '${swapAmount}' })`);
    try {
      const quote = await tenantSDK.wallets.getSwapQuote({
        from_token: swapFromToken,
        to_token: swapToToken,
        from_amount: swapAmount,
        network: selectedWallet.network.includes('mainnet') ? 'base-mainnet' : 'base-sepolia',
      });
      addLog('success', '✅ Swap quote received', quote);
      setResult(quote);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setWalletLoading(false);
    }
  };

  const executeSwap = async () => {
    if (!tenantSDK || !selectedWallet) {
      addLog('error', '❌ No wallet selected');
      return;
    }

    setWalletLoading(true);
    addLog('request', `tenantSDK.wallets.executeSwap({ wallet_id: '${selectedWallet.wallet_id}', from: '${swapFromToken}', to: '${swapToToken}', amount: '${swapAmount}' })`);
    try {
      const result = await tenantSDK.wallets.executeSwap({
        wallet_id: selectedWallet.wallet_id,
        from_token: swapFromToken,
        to_token: swapToToken,
        from_amount: swapAmount,
        network: selectedWallet.network.includes('mainnet') ? 'base-mainnet' : 'base-sepolia',
      });
      addLog('success', '✅ Swap executed!', result);
      setResult(result);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Swap failed: ${errMsg}`);
    } finally {
      setWalletLoading(false);
    }
  };

  const exportWalletKey = async () => {
    if (!tenantSDK || !selectedWallet) {
      addLog('error', '❌ No wallet selected');
      return;
    }

    if (selectedWallet.wallet_type !== 'eoa') {
      addLog('error', '❌ Only EOA wallets support key export');
      return;
    }

    const confirmed = confirm('⚠️ WARNING: Exporting your private key is a security risk. Anyone with the key can control this wallet. Are you sure?');
    if (!confirmed) return;

    setWalletLoading(true);
    addLog('request', `tenantSDK.wallets.exportKey('${selectedWallet.wallet_id}')`);
    try {
      const result = await tenantSDK.wallets.exportKey(selectedWallet.wallet_id);
      addLog('success', '✅ Private key exported (see result panel)', { warning: result.warning });
      setResult(result);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setWalletLoading(false);
    }
  };

  const requestTestnetFunds = async () => {
    if (!tenantSDK || !selectedWallet) {
      addLog('error', '❌ No wallet selected');
      return;
    }

    setWalletLoading(true);
    addLog('request', `Requesting testnet funds for ${selectedWallet.address}...`);
    try {
      const response = await fetch(`${tenantSDK.baseUrl}/wallets/${selectedWallet.wallet_id}/faucet`, {
        method: 'POST',
        headers: { 'X-API-Key': tenantSDK.apiKey },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Faucet request failed');
      }
      
      const result = await response.json();
      addLog('success', '✅ Testnet funds requested!', result);
      setResult(result);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setWalletLoading(false);
    }
  };

  const getWalletBalance = async () => {
    if (!tenantSDK || !selectedWallet) {
      addLog('error', '❌ No wallet selected');
      return;
    }

    setWalletLoading(true);
    addLog('request', `tenantSDK.wallets.getBalance('${selectedWallet.wallet_id}')`);
    try {
      const balance = await tenantSDK.wallets.getBalance(selectedWallet.wallet_id);
      addLog('success', '✅ Balance fetched', balance);
      setResult(balance);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setWalletLoading(false);
    }
  };

  const getWalletNFTs = async () => {
    if (!tenantSDK || !selectedWallet) {
      addLog('error', '❌ No wallet selected');
      return;
    }

    setWalletLoading(true);
    addLog('request', `tenantSDK.wallets.getNFTs('${selectedWallet.wallet_id}')`);
    try {
      const nfts = await tenantSDK.wallets.getNFTs(selectedWallet.wallet_id);
      addLog('success', `✅ Found ${nfts?.length || 0} NFTs`, nfts);
      setResult(nfts);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setWalletLoading(false);
    }
  };

  const getUserNFTs = async () => {
    if (!tenantSDK || !selectedWalletUser) {
      addLog('error', '❌ No user selected');
      return;
    }

    setWalletLoading(true);
    addLog('request', `tenantSDK.wallets.getUserNFTs('${selectedWalletUser}')`);
    try {
      const nfts = await tenantSDK.wallets.getUserNFTs(selectedWalletUser);
      addLog('success', `✅ Found ${nfts?.length || 0} NFTs for user`, nfts);
      setResult(nfts);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setWalletLoading(false);
    }
  };

  const getWalletStats = async () => {
    if (!tenantSDK) {
      addLog('error', '❌ Tenant SDK not initialized');
      return;
    }

    setWalletLoading(true);
    addLog('request', 'tenantSDK.wallets.stats()');
    try {
      const stats = await tenantSDK.wallets.stats();
      addLog('success', '✅ Wallet stats fetched', stats);
      setResult(stats);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setWalletLoading(false);
    }
  };

  const listUserWallets = async () => {
    if (!tenantSDK || !selectedWalletUser) {
      addLog('error', '❌ No user selected');
      return;
    }

    setWalletLoading(true);
    addLog('request', `tenantSDK.wallets.listByUser('${selectedWalletUser}')`);
    try {
      const wallets = await tenantSDK.wallets.listByUser(selectedWalletUser);
      addLog('success', `✅ Found ${wallets?.length || 0} wallets`, wallets);
      setResult(wallets);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setWalletLoading(false);
    }
  };

  const getWalletTransactions = async () => {
    if (!tenantSDK || !selectedWallet) {
      addLog('error', '❌ No wallet selected');
      return;
    }

    setWalletLoading(true);
    addLog('request', `tenantSDK.wallets.getTransactions('${selectedWallet.wallet_id}', { limit: 50 })`);
    try {
      const txHistory = await tenantSDK.wallets.getTransactions(selectedWallet.wallet_id, { limit: 50 });
      addLog('success', `✅ Found ${txHistory.transactions?.length || 0} transactions (${txHistory.total_sent} sent, ${txHistory.total_received} received)`, txHistory);
      setResult(txHistory);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setWalletLoading(false);
    }
  };

  // =========================================================================
  // Campaign Config (using Partner SDK)
  // =========================================================================
  const getCampaignConfig = async () => {
    if (!partnerSDK) {
      addLog('error', '❌ Partner SDK not initialized');
      return;
    }

    addLog('request', 'partnerSDK.getConfig()');
    try {
      const config = await partnerSDK.getConfig();
      addLog('success', '✅ Campaign config fetched', config);
      setResult(config);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };

  const checkConsent = async () => {
    if (!partnerSDK) {
      addLog('error', '❌ Partner SDK not initialized');
      return;
    }

    const userId = prompt('Enter user ID:', viewUserId);
    if (!userId) return;

    addLog('request', `partnerSDK.checkConsent('${userId}')`);
    try {
      const consent = await partnerSDK.checkConsent(userId);
      addLog('success', `✅ Consent: ${consent.has_consent ? 'Granted' : 'Not granted'}`, consent);
      setResult(consent);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };

  // =========================================================================
  // Consent Functions
  // =========================================================================
  const checkConsentForUser = async () => {
    if (!partnerSDK || !consentUserId) {
      addLog('error', '❌ Partner SDK not initialized or no user ID');
      return;
    }

    addLog('request', `partnerSDK.checkConsent('${consentUserId}')`);
    try {
      const consent = await partnerSDK.checkConsent(consentUserId);
      addLog('success', `✅ Consent: ${consent.has_consent ? 'Granted' : 'Not granted'}`, consent);
      setResult(consent);
      if (consent.has_consent) {
        setStats(prev => ({ ...prev, consents: prev.consents + 1 }));
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };

  const openConsentWidget = async () => {
    if (!partnerSDK || !consentUserId) {
      addLog('error', '❌ Partner SDK not initialized or no user ID');
      return;
    }

    setConsentLoading(true);
    try {
      // Fetch campaign config for display
      const config = await partnerSDK.getConfig();
      addLog('info', 'Campaign config loaded', config);
      setCampaignInfo({
        name: config.campaign_name || config.name || 'Partner Campaign',
        partner: config.integrator?.name || config.partner_name || 'Partner',
        description: config.description || 'This partner would like to access your fan data.',
        views: config.data_views || config.allowed_views || [],
      });
      setShowConsentModal(true);
      addLog('info', `Opening consent widget for user: ${consentUserId}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Failed to load campaign config: ${errMsg}`);
    } finally {
      setConsentLoading(false);
    }
  };

  const grantConsent = async () => {
    if (!partnerSDK || !consentUserId) return;
    
    setConsentLoading(true);
    addLog('request', `partnerSDK.grantConsent('${consentUserId}')`);
    try {
      // Use SDK to grant consent via API
      const result = await partnerSDK.grantConsent(consentUserId, {
        consentText: `I agree to share my data with ${campaignInfo?.name || 'this campaign'}`,
        consentSource: 'demo_widget',
      });
      
      addLog('success', `✅ Consent granted for ${consentUserId}`, result);
      
      // Update user's consent status
      setGeneratedUsers(prev => prev.map(u => 
        u.userId === consentUserId ? { ...u, hasConsent: true } : u
      ));
      setStats(prev => ({ ...prev, consents: prev.consents + 1 }));
      
      setShowConsentModal(false);
      setResult(result);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed to grant consent: ${errMsg}`);
    } finally {
      setConsentLoading(false);
    }
  };

  // =========================================================================
  // Data View Functions
  // =========================================================================
  const loadAvailableViews = async () => {
    if (!partnerSDK) {
      addLog('error', '❌ Partner SDK not initialized');
      return;
    }

    addLog('request', 'partnerSDK.listDataViews()');
    try {
      const views = await partnerSDK.listDataViews();
      setAvailableViews(views);
      if (views.length > 0 && !viewName) {
        setViewName(views[0]);
      }
      addLog('success', `✅ Found ${views.length} available views`, views);
      setResult(views);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };

  // =========================================================================
  // Feedback Functions
  // =========================================================================
  const loadFeedbackTypes = async () => {
    if (!partnerSDK) {
      addLog('error', '❌ Partner SDK not initialized');
      return;
    }

    addLog('request', 'partnerSDK.getFeedbackTypes()');
    try {
      const types = await partnerSDK.getFeedbackTypes();
      setFeedbackTypes(types.map((t: { type: string; name: string }) => ({ type: t.type, name: t.name })));
      addLog('success', `✅ Found ${types.length} feedback types`, types);
      setResult(types);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };

  const submitFeedback = async () => {
    if (!partnerSDK || !feedbackUserId || !feedbackType) {
      addLog('error', '❌ Partner SDK not initialized or missing user/type');
      return;
    }

    // Generate sample feedback data based on type
    const sampleData: Record<string, unknown> = {};
    if (feedbackType === 'purchase') {
      sampleData.amount = Math.floor(Math.random() * 200) + 10;
      sampleData.currency = 'USD';
      sampleData.product_id = `product_${Math.floor(Math.random() * 1000)}`;
    } else if (feedbackType === 'discount_applied') {
      const discountPercent = Math.floor(Math.random() * 30) + 5;
      const originalAmount = Math.floor(Math.random() * 200) + 50;
      sampleData.discount_code = `SAVE${Math.floor(Math.random() * 100)}`;
      sampleData.discount_percent = discountPercent;
      sampleData.original_amount = originalAmount;
      sampleData.final_amount = originalAmount * (1 - discountPercent / 100);
    } else {
      sampleData.action = feedbackType;
      sampleData.timestamp = new Date().toISOString();
    }

    addLog('request', `partnerSDK.submitFeedback('${feedbackUserId}', '${feedbackType}', ...)`, sampleData);
    try {
      const result = await partnerSDK.submitFeedback(feedbackUserId, feedbackType, sampleData);
      addLog('success', '✅ Feedback submitted', result);
      setResult(result);
      setStats(prev => ({ ...prev, feedback: prev.feedback + 1 }));
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    }
  };

  // =========================================================================
  // Quests Demo (using Tenant SDK)
  // =========================================================================
  const listAvailableQuests = async () => {
    if (!tenantSDK) {
      addLog('error', '❌ Tenant SDK not initialized');
      return;
    }
    if (!questUserId) {
      addLog('error', '❌ User ID required');
      return;
    }

    setQuestLoading(true);
    addLog('request', `tenantSDK.quests.listAvailable('${questUserId}')`);
    try {
      const quests = await tenantSDK.quests.listAvailable(questUserId) as Array<{ id: string; name: string; description: string; status: string; difficulty: string; reward_points: number; steps: Array<{ name: string; step_type: string; event_type?: string; target_count?: number }> }>;
      addLog('success', `✅ Found ${quests.length} available quests`, quests);
      setAvailableQuests(quests);
      setResult(quests);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setQuestLoading(false);
    }
  };

  const listAllQuests = async () => {
    if (!tenantSDK) {
      addLog('error', '❌ Tenant SDK not initialized');
      return;
    }

    setQuestLoading(true);
    addLog('request', `tenantSDK.quests.list({ status: 'active' })`);
    try {
      const quests = await tenantSDK.quests.list({ status: 'active' }) as Array<{ id: string; name: string; description: string; status: string; difficulty: string; reward_points: number; steps: Array<{ name: string; step_type: string; event_type?: string; target_count?: number }> }>;
      addLog('success', `✅ Found ${quests.length} active quests`, quests);
      setAvailableQuests(quests);
      setResult(quests);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setQuestLoading(false);
    }
  };

  const startQuest = async () => {
    if (!tenantSDK || !selectedQuest || !questUserId) {
      addLog('error', '❌ SDK, Quest, and User ID required');
      return;
    }

    setQuestLoading(true);
    addLog('request', `tenantSDK.quests.startQuest('${selectedQuest.id}', '${questUserId}')`);
    try {
      const progress = await tenantSDK.quests.startQuest(selectedQuest.id, questUserId);
      addLog('success', '✅ Quest started!', progress);
      setQuestProgress(progress);
      setResult(progress);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setQuestLoading(false);
    }
  };

  const getQuestProgress = async () => {
    if (!tenantSDK || !selectedQuest || !questUserId) {
      addLog('error', '❌ SDK, Quest, and User ID required');
      return;
    }

    setQuestLoading(true);
    addLog('request', `tenantSDK.quests.getUserProgress('${selectedQuest.id}', '${questUserId}')`);
    try {
      const progress = await tenantSDK.quests.getUserProgress(selectedQuest.id, questUserId);
      addLog('success', '✅ Progress fetched', progress);
      setQuestProgress(progress);
      setResult(progress);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setQuestLoading(false);
    }
  };

  const completeQuestStep = async (stepIndex: number) => {
    if (!tenantSDK || !selectedQuest || !questUserId) {
      addLog('error', '❌ SDK, Quest, and User ID required');
      return;
    }

    setQuestLoading(true);
    addLog('request', `tenantSDK.quests.completeStep('${selectedQuest.id}', '${questUserId}', ${stepIndex})`);
    try {
      const result = await tenantSDK.quests.completeStep(selectedQuest.id, questUserId, stepIndex);
      addLog('success', `✅ Step ${stepIndex} completed!`, result);
      setResult(result);
      // Refresh progress
      await getQuestProgress();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setQuestLoading(false);
    }
  };

  const simulateQuestEvents = async (stepIndex: number) => {
    if (!ingestionClient || !selectedQuest || !questUserId) {
      addLog('error', '❌ Ingestion Client, Quest, and User ID required');
      return;
    }

    const step = selectedQuest.steps[stepIndex];
    if (!step || !step.event_type) {
      addLog('error', '❌ Step has no event_type - use manual completion instead');
      return;
    }

    setSimulatingEvents(true);
    const targetCount = step.target_count || 1;
    addLog('request', `Simulating ${targetCount} "${step.event_type}" events for user ${questUserId}...`);

    try {
      const events = [];
      for (let i = 0; i < targetCount; i++) {
        events.push({
          userId: questUserId,
          eventType: step.event_type,
          eventSource: 'quest_demo',
          data: {
            quest_id: selectedQuest.id,
            step_index: stepIndex,
            simulated: true,
            iteration: i + 1,
          },
        });
      }

      const response = await ingestionClient.ingestBatch({ events });
      addLog('success', `✅ Ingested ${response.queued || targetCount} events`, response);
      setResult(response);

      // Wait a moment for processing, then refresh progress
      addLog('info', '⏳ Waiting for event processing...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      await getQuestProgress();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setSimulatingEvents(false);
    }
  };

  const simulateAllQuestSteps = async () => {
    if (!ingestionClient || !selectedQuest || !questUserId) {
      addLog('error', '❌ Ingestion Client, Quest, and User ID required');
      return;
    }

    setSimulatingEvents(true);
    addLog('info', `🚀 Simulating all steps for quest "${selectedQuest.name}"...`);

    try {
      for (let i = 0; i < selectedQuest.steps.length; i++) {
        const step = selectedQuest.steps[i];
        if (step.event_type) {
          const targetCount = step.target_count || 1;
          addLog('request', `Step ${i + 1}: Simulating ${targetCount} "${step.event_type}" events...`);

          const events = [];
          for (let j = 0; j < targetCount; j++) {
            events.push({
              userId: questUserId,
              eventType: step.event_type,
              eventSource: 'quest_demo',
              data: {
                quest_id: selectedQuest.id,
                step_index: i,
                simulated: true,
                iteration: j + 1,
              },
            });
          }

          const response = await ingestionClient.ingestBatch({ events });
          addLog('success', `✅ Step ${i + 1}: Ingested ${response.queued || targetCount} events`);
        } else {
          addLog('info', `Step ${i + 1}: "${step.name}" requires manual completion (no event_type)`);
        }
      }

      addLog('info', '⏳ Waiting for event processing...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      await getQuestProgress();
      addLog('success', '🎉 All quest steps simulated!');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      addLog('error', `❌ Failed: ${errMsg}`);
    } finally {
      setSimulatingEvents(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">ProofChain SDK Demo</h1>
              <p className="text-sm text-gray-500">@proofchain/sdk + @proofchain/partner-sdk v1.0.0</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <ConfigPanel onInitialize={handleInitialize} isConnected={isConnected} />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="border-b flex flex-wrap overflow-x-auto">
                <button
                  onClick={() => setActiveTab('flow')}
                  className={`px-6 py-3 text-sm font-medium ${activeTab === 'flow' ? 'border-b-2 border-green-500 text-green-600 bg-green-50' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  🚀 Full Flow
                </button>
                <button
                  onClick={() => setActiveTab('consent')}
                  className={`px-6 py-3 text-sm font-medium ${activeTab === 'consent' ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  ✅ Consent
                </button>
                <button
                  onClick={() => setActiveTab('dataviews')}
                  className={`px-6 py-3 text-sm font-medium ${activeTab === 'dataviews' ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  📈 Data Views
                </button>
                <button
                  onClick={() => setActiveTab('feedback')}
                  className={`px-6 py-3 text-sm font-medium ${activeTab === 'feedback' ? 'border-b-2 border-orange-500 text-orange-600 bg-orange-50' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  💬 Feedback
                </button>
                <button
                  onClick={() => setActiveTab('passports')}
                  className={`px-6 py-3 text-sm font-medium ${activeTab === 'passports' ? 'border-b-2 border-purple-500 text-purple-600 bg-purple-50' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  🎫 Passports
                </button>
                <button
                  onClick={() => setActiveTab('ownership')}
                  className={`px-6 py-3 text-sm font-medium ${activeTab === 'ownership' ? 'border-b-2 border-indigo-500 text-indigo-600 bg-indigo-50' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  🔐 Ownership
                </button>
                <button
                  onClick={() => setActiveTab('events')}
                  className={`px-6 py-3 text-sm font-medium ${activeTab === 'events' ? 'border-b-2 border-cyan-500 text-cyan-600 bg-cyan-50' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  📊 Events
                </button>
                <button
                  onClick={() => setActiveTab('tenant')}
                  className={`px-6 py-3 text-sm font-medium ${activeTab === 'tenant' ? 'border-b-2 border-gray-500 text-gray-600 bg-gray-50' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  🏢 Tenant
                </button>
                <button
                  onClick={() => setActiveTab('wallets')}
                  className={`px-6 py-3 text-sm font-medium ${activeTab === 'wallets' ? 'border-b-2 border-amber-500 text-amber-600 bg-amber-50' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  💰 Wallets
                </button>
                <button
                  onClick={() => setActiveTab('quests')}
                  className={`px-6 py-3 text-sm font-medium ${activeTab === 'quests' ? 'border-b-2 border-pink-500 text-pink-600 bg-pink-50' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  🎯 Quests
                </button>
              </div>

              <div className="p-6">
                {/* Full Flow Tab */}
                {activeTab === 'flow' && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-semibold text-green-900">Complete Data Flow Demo</h3>
                      <p className="text-sm text-green-700 mt-1">
                        <strong>Data Ingestion → Fan Scoring → Consent → Partner Access → Value Proof</strong>
                      </p>
                    </div>

                    {/* Step 1: Generate Events */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                        <h4 className="font-semibold">Generate Test User Data</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Create realistic fan activity data using <code className="bg-gray-100 px-1 rounded">IngestionClient.ingestBatch()</code> via <code className="bg-gray-100 px-1 rounded">ingest.proofchain.co.za</code></p>
                      <div className="grid md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">User ID <span className="text-gray-400">(optional)</span></label>
                          <input type="text" value={eventUserId} onChange={(e) => setEventUserId(e.target.value)} placeholder="Auto-generate random IDs" className="w-full px-3 py-2 border rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Events per User</label>
                          <select value={eventCount} onChange={(e) => setEventCount(parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="10">10 Events</option>
                            <option value="50">50 Events</option>
                            <option value="100">100 Events</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Number of Users</label>
                          <select value={userCount} onChange={(e) => setUserCount(parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="1">1 User</option>
                            <option value="3">3 Users</option>
                            <option value="5">5 Users</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button onClick={generateEvents} disabled={isGenerating || !ingestionClient} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm">
                            {isGenerating ? 'Generating...' : 'Generate Data'}
                          </button>
                        </div>
                      </div>
                      {generatedUsers.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {generatedUsers.map(u => (
                            <button key={u.userId} onClick={() => { setSelectedUser(u.userId); setConsentUserId(u.userId); setViewUserId(u.userId); setFeedbackUserId(u.userId); setPassportUserId(u.userId); }} className={`px-3 py-1 rounded-full text-sm ${selectedUser === u.userId ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                              {u.userId} ({u.eventCount} events)
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Step 2: Grant Consent */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                        <h4 className="font-semibold">Grant Consent</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Users must consent before partners can access their data. Use <code className="bg-gray-100 px-1 rounded">partnerSDK.checkConsent()</code> and <code className="bg-gray-100 px-1 rounded">partnerSDK.getConsentUrl()</code></p>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">User ID</label>
                          <input type="text" value={consentUserId} onChange={(e) => setConsentUserId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Select user above or enter ID" />
                        </div>
                        <div className="flex items-end gap-2">
                          <button onClick={checkConsentForUser} disabled={!partnerSDK || !consentUserId} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm">
                            Check Consent
                          </button>
                          <button onClick={openConsentWidget} disabled={!partnerSDK || !consentUserId} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 font-medium text-sm">
                            Open Widget
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Query Data View */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                        <h4 className="font-semibold">Partner Queries User Data</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Partners access user data via views using <code className="bg-gray-100 px-1 rounded">partnerSDK.queryView()</code></p>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">User ID</label>
                          <input type="text" value={viewUserId} onChange={(e) => setViewUserId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">View Name</label>
                          <select value={viewName} onChange={(e) => setViewName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                            {availableViews.length > 0 ? availableViews.map(v => <option key={v} value={v}>{v}</option>) : <option value="">Load views first...</option>}
                          </select>
                        </div>
                        <div className="flex items-end gap-2">
                          <button onClick={loadAvailableViews} disabled={!partnerSDK} className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 font-medium text-sm">
                            Load Views
                          </button>
                          <button onClick={executeDataView} disabled={!partnerSDK || !viewUserId} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium text-sm">
                            Query
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Step 4: Submit Feedback */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
                        <h4 className="font-semibold">Partner Submits Feedback (Value Proof)</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Partners report valuable actions using <code className="bg-gray-100 px-1 rounded">partnerSDK.submitFeedback()</code></p>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">User ID</label>
                          <input type="text" value={feedbackUserId} onChange={(e) => setFeedbackUserId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Feedback Type</label>
                          <select value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="">Select type...</option>
                            {feedbackTypes.map(t => <option key={t.type} value={t.type}>{t.name}</option>)}
                          </select>
                        </div>
                        <div className="flex items-end gap-2">
                          <button onClick={loadFeedbackTypes} disabled={!partnerSDK} className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50 font-medium text-sm">
                            Load Types
                          </button>
                          <button onClick={submitFeedback} disabled={!partnerSDK || !feedbackUserId || !feedbackType} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium text-sm">
                            Submit
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold mb-3">Demo Stats</h4>
                      <div className="grid grid-cols-5 gap-4 text-center">
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <div className="text-2xl font-bold text-blue-600">{stats.users}</div>
                          <div className="text-xs text-gray-500">Users</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <div className="text-2xl font-bold text-purple-600">{stats.events}</div>
                          <div className="text-xs text-gray-500">Events</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <div className="text-2xl font-bold text-green-600">{stats.consents}</div>
                          <div className="text-xs text-gray-500">Consents</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <div className="text-2xl font-bold text-cyan-600">{stats.queries}</div>
                          <div className="text-xs text-gray-500">Queries</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <div className="text-2xl font-bold text-orange-600">{stats.feedback}</div>
                          <div className="text-xs text-gray-500">Feedback</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Consent Tab */}
                {activeTab === 'consent' && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-semibold text-green-900">Consent Management</h3>
                      <p className="text-sm text-green-700 mt-1">
                        Uses <code className="bg-white px-1 rounded">partnerSDK.checkConsent()</code> and <code className="bg-white px-1 rounded">partnerSDK.getConsentUrl()</code>
                      </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                        <input type="text" value={consentUserId} onChange={(e) => setConsentUserId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={checkConsentForUser} disabled={!partnerSDK || !consentUserId} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium">
                        Check Consent
                      </button>
                      <button onClick={openConsentWidget} disabled={!partnerSDK || !consentUserId} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 text-sm font-medium">
                        Open Consent Widget
                      </button>
                      <button onClick={getCampaignConfig} disabled={!partnerSDK} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium">
                        Get Campaign Config
                      </button>
                    </div>
                  </div>
                )}

                {/* Data Views Tab */}
                {activeTab === 'dataviews' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900">Data Views</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Uses <code className="bg-white px-1 rounded">partnerSDK.listDataViews()</code> and <code className="bg-white px-1 rounded">partnerSDK.executeDataView()</code>
                      </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                        <input
                          type="text"
                          value={viewUserId}
                          onChange={(e) => setViewUserId(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">View Name</label>
                        <input
                          type="text"
                          value={viewName}
                          onChange={(e) => setViewName(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={listDataViews} disabled={!partnerSDK} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                        List Views
                      </button>
                      <button onClick={executeDataView} disabled={!partnerSDK} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                        Execute View
                      </button>
                    </div>
                  </div>
                )}

                {/* Passports Tab */}
                {activeTab === 'passports' && (
                  <div className="space-y-4">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h3 className="font-semibold text-purple-900">Passport V2 & Views</h3>
                      <p className="text-sm text-purple-700 mt-1">
                        Uses <code className="bg-white px-1 rounded">tenantSDK.passports.getPassportV2()</code>, <code className="bg-white px-1 rounded">tenantSDK.passports.getPassportView()</code>, and <code className="bg-white px-1 rounded">tenantSDK.passports.listAvailableViews()</code>
                      </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                        <input
                          type="text"
                          value={passportUserId}
                          onChange={(e) => setPassportUserId(e.target.value)}
                          placeholder="e.g. demo_taylor_1234"
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Passport View</label>
                        <select
                          value={selectedPassportView}
                          onChange={(e) => setSelectedPassportView(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="">Select view...</option>
                          {passportViews.map(v => <option key={v.slug} value={v.slug}>{v.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={getPassport} disabled={!tenantSDK || !passportUserId} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium">
                        Get Passport
                      </button>
                      <button onClick={getPassportView} disabled={!tenantSDK || !passportUserId || !selectedPassportView} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium">
                        Get View Data
                      </button>
                      <button onClick={listPassportDefinitions} disabled={!tenantSDK} className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 text-sm font-medium">
                        List Definitions
                      </button>
                      <button onClick={listAvailableViews} disabled={!tenantSDK} className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 text-sm font-medium">
                        Load Views
                      </button>
                    </div>
                    {passportViews.length > 0 && (
                      <div className="text-xs text-gray-500">
                        {passportViews.length} views loaded: {passportViews.map(v => v.slug).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Ownership Tab - Attestation & Sharing */}
                {activeTab === 'ownership' && (
                  <div className="space-y-6">
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <h3 className="font-semibold text-indigo-900">Passport Attestation & Sharing</h3>
                      <p className="text-sm text-indigo-700 mt-1">
                        Link your wallet, create signed attestations of your passport, and share them with third parties.
                      </p>
                    </div>

                    {/* Step 1: Connect Wallet */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                        <h4 className="font-semibold">Connect Wallet</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Connect your MetaMask wallet to link it to your user account.</p>
                      
                      {!walletConnected ? (
                        <button 
                          onClick={connectWallet} 
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Connect MetaMask
                        </button>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                          </div>
                          <button onClick={disconnectWallet} className="text-sm text-gray-500 hover:text-gray-700">
                            Disconnect
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Step 2: Link Wallet to User */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                        <h4 className="font-semibold">Link Wallet to User</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Sign a message to prove you own this wallet and link it to your user account.</p>
                      
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">User ID</label>
                          <input 
                            type="text" 
                            value={passportUserId} 
                            onChange={(e) => setPassportUserId(e.target.value)} 
                            placeholder="e.g. demo_taylor_1234"
                            className="w-full px-3 py-2 border rounded-lg text-sm" 
                          />
                        </div>
                      </div>
                      
                      <button 
                        onClick={linkWallet} 
                        disabled={!tenantSDK || !walletConnected || !passportUserId || linkingWallet || walletLinked}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm flex items-center gap-2"
                      >
                        {linkingWallet ? (
                          <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Signing...
                          </>
                        ) : walletLinked ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Wallet Linked
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                            </svg>
                            Link Wallet
                          </>
                        )}
                      </button>

                      {walletLinked && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 text-green-800">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-medium">Wallet Linked!</span>
                          </div>
                          <p className="text-sm text-green-700 mt-1">
                            Your wallet is now linked to user: {passportUserId}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Step 3: Create Attestation */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                        <h4 className="font-semibold">Create Passport Attestation</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Create a signed snapshot of your current passport data that can be verified by anyone.</p>
                      
                      {/* Passport Selection */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <label className="block text-xs font-medium text-gray-500">Select Passport</label>
                          <button 
                            onClick={loadPassportDefinitions}
                            className="text-xs text-indigo-600 hover:text-indigo-700"
                          >
                            Refresh
                          </button>
                        </div>
                        <select 
                          value={selectedPassportSlug} 
                          onChange={(e) => setSelectedPassportSlug(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="">Default Passport</option>
                          {passportDefinitions.map((p) => (
                            <option key={p.id} value={p.slug}>
                              {p.name} {p.is_default ? '(default)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <button 
                        onClick={createAttestation} 
                        disabled={!tenantSDK || !passportUserId || creatingAttestation}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm flex items-center gap-2"
                      >
                        {creatingAttestation ? (
                          <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Create Attestation
                          </>
                        )}
                      </button>

                      {attestationData && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 text-green-800">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-medium">Attestation Created!</span>
                          </div>
                          <p className="text-sm text-green-700 mt-1">
                            {attestationData.passport_definition_name || 'Passport'} • Hash: {attestationData.passport_hash?.slice(0, 16) || attestationData.uid?.slice(0, 16)}...
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Step 4: Create Share Link */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
                        <h4 className="font-semibold">Create Share Link</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Generate a shareable link that third parties can use to view and verify your passport.</p>
                      
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Link Name (optional)</label>
                          <input 
                            type="text" 
                            value={shareLinkName} 
                            onChange={(e) => setShareLinkName(e.target.value)} 
                            placeholder="e.g. For Brand X"
                            className="w-full px-3 py-2 border rounded-lg text-sm" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Expires In</label>
                          <select 
                            value={shareLinkExpiry} 
                            onChange={(e) => setShareLinkExpiry(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          >
                            <option value="7">7 days</option>
                            <option value="30">30 days</option>
                            <option value="90">90 days</option>
                            <option value="365">1 year</option>
                          </select>
                        </div>
                      </div>
                      
                      <button 
                        onClick={createShareLink} 
                        disabled={!attestationData || creatingShareLink}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm flex items-center gap-2"
                      >
                        {creatingShareLink ? (
                          <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Create Share Link
                          </>
                        )}
                      </button>
                    </div>

                    {/* Share Links List */}
                    {shareLinks.length > 0 && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-4">Your Share Links</h4>
                        <div className="space-y-3">
                          {shareLinks.map((link) => (
                            <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-sm">{link.name || 'Share Link'}</p>
                                <p className="text-xs text-gray-500">{link.view_count} views</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => viewSharedPassport(link.share_token)}
                                  className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium hover:bg-indigo-200"
                                >
                                  View
                                </button>
                                <button 
                                  onClick={() => verifySharedPassport(link.share_token)}
                                  className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200"
                                >
                                  Verify
                                </button>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(link.share_url);
                                    addLog('success', `✅ Link copied: ${link.share_url}`);
                                  }}
                                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300"
                                >
                                  Copy URL
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Feedback Tab */}
                {activeTab === 'feedback' && (
                  <div className="space-y-4">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <h3 className="font-semibold text-orange-900">Partner Feedback</h3>
                      <p className="text-sm text-orange-700 mt-1">
                        Uses <code className="bg-white px-1 rounded">partnerSDK.submitFeedback()</code> and <code className="bg-white px-1 rounded">partnerSDK.getFeedbackTypes()</code>
                      </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                        <input type="text" value={feedbackUserId} onChange={(e) => setFeedbackUserId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Feedback Type</label>
                        <select value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                          <option value="">Select type...</option>
                          {feedbackTypes.map(t => <option key={t.type} value={t.type}>{t.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={loadFeedbackTypes} disabled={!partnerSDK} className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50 text-sm font-medium">
                        Load Feedback Types
                      </button>
                      <button onClick={submitFeedback} disabled={!partnerSDK || !feedbackUserId || !feedbackType} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm font-medium">
                        Submit Feedback
                      </button>
                    </div>
                  </div>
                )}

                {/* Events Tab */}
                {activeTab === 'events' && (
                  <div className="space-y-4">
                    <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                      <h3 className="font-semibold text-cyan-900">Event Search & Query</h3>
                      <p className="text-sm text-cyan-700 mt-1">
                        Uses <code className="bg-white px-1 rounded">tenantSDK.search.byUser()</code>, <code className="bg-white px-1 rounded">tenantSDK.search.query()</code>, and <code className="bg-white px-1 rounded">tenantSDK.search.facets()</code>
                      </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">User ID (optional)</label>
                        <input
                          type="text"
                          value={eventSearchUserId}
                          onChange={(e) => setEventSearchUserId(e.target.value)}
                          placeholder="e.g. demo_taylor_1234"
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Type (optional)</label>
                        <input
                          type="text"
                          value={eventSearchType}
                          onChange={(e) => setEventSearchType(e.target.value)}
                          placeholder="e.g. page_view, purchase"
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Limit</label>
                        <input
                          type="number"
                          value={eventSearchLimit}
                          onChange={(e) => setEventSearchLimit(parseInt(e.target.value) || 20)}
                          min={1}
                          max={100}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={getUserEvents} disabled={!tenantSDK || !eventSearchUserId} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 text-sm font-medium">
                        Get User Events
                      </button>
                      <button onClick={searchEvents} disabled={!tenantSDK} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 text-sm font-medium">
                        Search Events
                      </button>
                      <button onClick={getEventFacets} disabled={!tenantSDK} className="px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 disabled:opacity-50 text-sm font-medium">
                        Get Facets
                      </button>
                      <button onClick={getSearchStats} disabled={!tenantSDK} className="px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 disabled:opacity-50 text-sm font-medium">
                        Search Stats
                      </button>
                    </div>
                  </div>
                )}

                {/* Tenant Tab */}
                {activeTab === 'tenant' && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900">Tenant Information & Usage</h3>
                      <p className="text-sm text-gray-700 mt-1">
                        Uses <code className="bg-white px-1 rounded">tenantSDK.info()</code> and <code className="bg-white px-1 rounded">tenantSDK.usage()</code>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={getTenantInfo} disabled={!tenantSDK} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm font-medium">
                        Get Tenant Info
                      </button>
                      <button onClick={getUsageStats} disabled={!tenantSDK} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm font-medium">
                        Get Usage Stats
                      </button>
                    </div>
                  </div>
                )}

                {/* Wallets Tab */}
                {activeTab === 'wallets' && (
                  <div className="space-y-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h3 className="font-semibold text-amber-900">CDP Wallet Testing</h3>
                      <p className="text-sm text-amber-700 mt-1">
                        Test wallet creation, transfers, swaps, and portfolio viewing using <code className="bg-white px-1 rounded">tenantSDK.wallets</code>
                      </p>
                    </div>

                    {/* Create Wallet Section */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-3">Create Dual Wallets (EOA + Smart)</h4>
                      <div className="flex gap-4 items-end">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-500 mb-1">User ID</label>
                          <input
                            type="text"
                            value={newWalletUserId}
                            onChange={(e) => setNewWalletUserId(e.target.value)}
                            placeholder="e.g., demo_user_123"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                        <button
                          onClick={createDualWallets}
                          disabled={!tenantSDK || !newWalletUserId || walletLoading}
                          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm font-medium"
                        >
                          {walletLoading ? 'Creating...' : 'Create Wallets'}
                        </button>
                      </div>
                    </div>

                    {/* Load Users Section */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">Users with Wallets</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={getWalletStats}
                            disabled={!tenantSDK || walletLoading}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium"
                          >
                            Stats
                          </button>
                          <button
                            onClick={loadWalletUsers}
                            disabled={!tenantSDK || walletLoading}
                            className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 disabled:opacity-50 text-sm font-medium"
                          >
                            {walletLoading ? 'Loading...' : 'Load Users'}
                          </button>
                        </div>
                      </div>

                      {walletUsers.length > 0 && (
                        <div className="space-y-2">
                          <select
                            value={selectedWalletUser}
                            onChange={(e) => {
                              setSelectedWalletUser(e.target.value);
                              const user = walletUsers.find(u => u.user_id === e.target.value);
                              if (user && user.wallets.length > 0) {
                                setSelectedWallet(user.wallets[0]);
                              }
                            }}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          >
                            <option value="">Select a user...</option>
                            {walletUsers.map(u => (
                              <option key={u.user_id} value={u.user_id}>
                                {u.user_id} ({u.wallets.length} wallets)
                              </option>
                            ))}
                          </select>

                          {selectedWalletUser && (
                            <div className="mt-2">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Select Wallet</label>
                              <select
                                value={selectedWallet?.wallet_id || ''}
                                onChange={(e) => {
                                  const user = walletUsers.find(u => u.user_id === selectedWalletUser);
                                  const wallet = user?.wallets.find(w => w.wallet_id === e.target.value);
                                  if (wallet) setSelectedWallet(wallet);
                                }}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                              >
                                {walletUsers.find(u => u.user_id === selectedWalletUser)?.wallets.map(w => (
                                  <option key={w.wallet_id} value={w.wallet_id}>
                                    {w.wallet_type.toUpperCase()} - {w.address.slice(0, 10)}...{w.address.slice(-6)} ({w.network})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Selected Wallet Info */}
                    {selectedWallet && (
                      <>
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <h4 className="font-semibold mb-2">Selected Wallet</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="text-gray-500">Type:</span> <span className="font-mono">{selectedWallet.wallet_type.toUpperCase()}</span></div>
                            <div><span className="text-gray-500">Network:</span> <span className="font-mono">{selectedWallet.network}</span></div>
                            <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="font-mono text-xs">{selectedWallet.address}</span></div>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <button onClick={getWalletInfo} disabled={walletLoading} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm">
                              Get Full Info
                            </button>
                            <button onClick={getWalletBalance} disabled={walletLoading} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm">
                              Get Balance
                            </button>
                            <button onClick={getUserWalletSummary} disabled={walletLoading} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm">
                              User Summary
                            </button>
                            <button onClick={getWalletNFTs} disabled={walletLoading} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm">
                              Get NFTs
                            </button>
                            <button onClick={getUserNFTs} disabled={walletLoading} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm">
                              User NFTs
                            </button>
                            <button onClick={getWalletTransactions} disabled={walletLoading} className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 text-sm">
                              TX History
                            </button>
                            <button onClick={requestTestnetFunds} disabled={walletLoading} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
                              Request Testnet ETH
                            </button>
                            {selectedWallet.wallet_type === 'eoa' && (
                              <button onClick={exportWalletKey} disabled={walletLoading} className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm">
                                Export Key ⚠️
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Transfer Section */}
                        <div className="border rounded-lg p-4">
                          <h4 className="font-semibold mb-3">Transfer Tokens</h4>
                          <div className="grid grid-cols-4 gap-3">
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-500 mb-1">To Address</label>
                              <input
                                type="text"
                                value={transferTo}
                                onChange={(e) => setTransferTo(e.target.value)}
                                placeholder="0x..."
                                className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
                              <input
                                type="text"
                                value={transferAmount}
                                onChange={(e) => setTransferAmount(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Token</label>
                              <select
                                value={transferToken}
                                onChange={(e) => setTransferToken(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                              >
                                <option value="ETH">ETH</option>
                                <option value="USDC">USDC</option>
                                <option value="WETH">WETH</option>
                              </select>
                            </div>
                          </div>
                          <button
                            onClick={executeTransfer}
                            disabled={!transferTo || walletLoading}
                            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                          >
                            {walletLoading ? 'Sending...' : 'Send Transfer'}
                          </button>
                        </div>

                        {/* Swap Section */}
                        <div className="border rounded-lg p-4">
                          <h4 className="font-semibold mb-3">Token Swap</h4>
                          <div className="grid grid-cols-4 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">From Token</label>
                              <select
                                value={swapFromToken}
                                onChange={(e) => setSwapFromToken(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                              >
                                <option value="ETH">ETH</option>
                                <option value="USDC">USDC</option>
                                <option value="WETH">WETH</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">To Token</label>
                              <select
                                value={swapToToken}
                                onChange={(e) => setSwapToToken(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                              >
                                <option value="USDC">USDC</option>
                                <option value="ETH">ETH</option>
                                <option value="WETH">WETH</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
                              <input
                                type="text"
                                value={swapAmount}
                                onChange={(e) => setSwapAmount(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                              />
                            </div>
                            <div className="flex items-end gap-2">
                              <button
                                onClick={getSwapQuote}
                                disabled={walletLoading}
                                className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 text-sm font-medium"
                              >
                                Quote
                              </button>
                              <button
                                onClick={executeSwap}
                                disabled={walletLoading}
                                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                              >
                                Swap
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Quests Tab */}
                {activeTab === 'quests' && (
                  <div className="space-y-6">
                    <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                      <h3 className="font-semibold text-pink-900">Quest Demo</h3>
                      <p className="text-sm text-pink-700 mt-1">
                        Test quest functionality: list quests, start them, and simulate events to complete objectives.
                        Uses <code className="bg-white px-1 rounded">tenantSDK.quests</code> and <code className="bg-white px-1 rounded">ingestionClient</code>
                      </p>
                    </div>

                    {/* User Setup */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-3">1. Set Demo User</h4>
                      <div className="flex gap-4 items-end">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-500 mb-1">User ID</label>
                          <input
                            type="text"
                            value={questUserId}
                            onChange={(e) => setQuestUserId(e.target.value)}
                            placeholder="e.g., demo_user_123 or select from generated users"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                        {generatedUsers.length > 0 && (
                          <select
                            value={questUserId}
                            onChange={(e) => setQuestUserId(e.target.value)}
                            className="px-3 py-2 border rounded-lg text-sm"
                          >
                            <option value="">Use generated user...</option>
                            {generatedUsers.map(u => (
                              <option key={u.userId} value={u.userId}>{u.userId}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* List Quests */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-3">2. Load Available Quests</h4>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={listAllQuests}
                          disabled={!tenantSDK || questLoading}
                          className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 text-sm font-medium"
                        >
                          {questLoading ? 'Loading...' : 'List All Active Quests'}
                        </button>
                        <button
                          onClick={listAvailableQuests}
                          disabled={!tenantSDK || !questUserId || questLoading}
                          className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 disabled:opacity-50 text-sm font-medium"
                        >
                          List Available for User
                        </button>
                      </div>

                      {availableQuests.length > 0 && (
                        <div className="mt-4">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Select a Quest</label>
                          <select
                            value={selectedQuest?.id || ''}
                            onChange={(e) => {
                              const quest = availableQuests.find(q => q.id === e.target.value);
                              setSelectedQuest(quest || null);
                              setQuestProgress(null);
                            }}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          >
                            <option value="">Choose a quest...</option>
                            {availableQuests.map(q => (
                              <option key={q.id} value={q.id}>
                                {q.name} ({q.difficulty}) - {q.reward_points} pts
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Selected Quest Details */}
                    {selectedQuest && (
                      <>
                        <div className="border rounded-lg p-4 bg-gradient-to-r from-pink-50 to-purple-50">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-semibold text-lg">{selectedQuest.name}</h4>
                              <p className="text-sm text-gray-600">{selectedQuest.steps.length} steps</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={startQuest}
                                disabled={!questUserId || questLoading}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                              >
                                Start Quest
                              </button>
                              <button
                                onClick={getQuestProgress}
                                disabled={!questUserId || questLoading}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                              >
                                Refresh Progress
                              </button>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          {questProgress && (
                            <div className="mb-4">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium">Progress: {questProgress.status}</span>
                                <span>{questProgress.completion_percentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                  className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                                  style={{ width: `${questProgress.completion_percentage}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {questProgress.steps_completed} / {questProgress.total_steps} steps completed
                              </p>
                            </div>
                          )}

                          {/* Steps */}
                          <div className="space-y-3">
                            <h5 className="font-medium text-sm text-gray-700">Quest Steps:</h5>
                            {selectedQuest.steps.map((step, i) => {
                              const stepProg = questProgress?.step_progress?.[String(i)];
                              const isCompleted = stepProg?.completed || false;
                              
                              return (
                                <div
                                  key={i}
                                  className={`p-3 rounded-lg border ${isCompleted ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                        {isCompleted ? '✓' : i + 1}
                                      </span>
                                      <div>
                                        <p className="font-medium text-sm">{step.name}</p>
                                        <p className="text-xs text-gray-500">
                                          Type: {step.step_type}
                                          {step.event_type && ` | Event: ${step.event_type}`}
                                          {step.target_count && step.target_count > 1 && ` | Target: ${step.target_count}x`}
                                        </p>
                                        {stepProg && !isCompleted && (
                                          <p className="text-xs text-blue-600">
                                            Progress: {stepProg.current_count} / {stepProg.target_count}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    {!isCompleted && (
                                      <div className="flex gap-1">
                                        {step.event_type && (
                                          <button
                                            onClick={() => simulateQuestEvents(i)}
                                            disabled={simulatingEvents || questLoading}
                                            className="px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 disabled:opacity-50"
                                            title="Simulate events to complete this step"
                                          >
                                            {simulatingEvents ? '...' : '🎲 Simulate'}
                                          </button>
                                        )}
                                        <button
                                          onClick={() => completeQuestStep(i)}
                                          disabled={questLoading}
                                          className="px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 disabled:opacity-50"
                                          title="Manually complete this step"
                                        >
                                          ✓ Complete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Simulate All Button */}
                          <div className="mt-4 pt-4 border-t">
                            <button
                              onClick={simulateAllQuestSteps}
                              disabled={simulatingEvents || questLoading || !questUserId}
                              className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                            >
                              {simulatingEvents ? (
                                <>
                                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Simulating Events...
                                </>
                              ) : (
                                <>🚀 Simulate All Steps (Auto-Complete Quest)</>
                              )}
                            </button>
                            <p className="text-xs text-gray-500 text-center mt-2">
                              This will generate fake events for each step that has an event_type configured
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Result Panel */}
            {result && (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                  <h3 className="font-semibold">Result</h3>
                  <button onClick={() => setResult(null)} className="text-gray-400 hover:text-gray-600">
                    ✕
                  </button>
                </div>
                <pre className="p-4 bg-gray-900 text-gray-100 text-sm overflow-auto max-h-96">
                  {JSON.stringify(result as object, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Right: Logs */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <LogPanel logs={logs} onClear={clearLogs} />
            </div>
          </div>
        </div>
      </main>

      {/* Consent Widget Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Data Access Request</h3>
                  <p className="text-blue-100 text-sm">ProofChain Consent</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-lg">{campaignInfo?.partner?.charAt(0) || 'P'}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{campaignInfo?.name || 'Partner Campaign'}</p>
                    <p className="text-sm text-gray-500">by {campaignInfo?.partner || 'Partner'}</p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  {campaignInfo?.description || 'This partner would like to access your fan engagement data to provide personalized experiences.'}
                </p>
              </div>

              {/* What they'll access */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-xs font-medium text-gray-500 uppercase mb-3">Data they can access:</p>
                <div className="space-y-2">
                  {(campaignInfo?.views || []).map((view, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-700">{view.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* User info */}
              <div className="flex items-center gap-2 mb-6 p-3 bg-blue-50 rounded-lg">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm text-blue-700">Consenting as: <strong>{consentUserId}</strong></span>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConsentModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={grantConsent}
                  disabled={consentLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {consentLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Granting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Grant Access
                    </>
                  )}
                </button>
              </div>

              {/* Footer */}
              <p className="text-xs text-gray-400 text-center mt-4">
                You can revoke access at any time from your ProofChain dashboard.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
